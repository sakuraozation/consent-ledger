// ENSv2（Sepolia beta）に親名を1つ登録する。app.ens.dev の UI は署名要求を出さずに
// 止まったので（09-22）、Registrar を直接叩く。commit → 60秒待つ → register。
//
//   bun run scripts/ens-register.ts consentledger   （鍵は .dev.vars の EVM_PRIVATE_KEY）
//
// 支払いは MockUSDC（誰でも mint できるテスト用トークン）。ガスは Sepolia ETH。
import { createPublicClient, createWalletClient, erc20Abi, formatUnits, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// docs.ens.domains/learn/deployments#sepolia-ensv2-beta
const REGISTRAR = "0xa88553f454b77203b0d036a05c894d555eaaa2cc" as const;
const USDC = "0x768f42455a2d082e23ceef7d51e5787c82d67a39" as const;
const RESOLVER = "0xe7b9a25607e02da8145e4eb1836ca539e53f11f7" as const; // PublicResolverV2
const ZERO = "0x0000000000000000000000000000000000000000" as const;
const NO_REFERRER = `0x${"0".repeat(64)}` as const;
const ONE_YEAR = 31_536_000n;

const registrar = parseAbi([
  "function isAvailable(string label) view returns (bool)",
  "function getRegisterPrice(string label, uint64 duration, address paymentToken) view returns (uint256 base, uint256 premium)",
  "function makeCommitment(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, bytes32 referrer) view returns (bytes32)",
  "function commit(bytes32 commitment)",
  "function register(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 referrer) returns (uint256)",
]);
const mintable = parseAbi(["function mint(address to, uint256 amount)"]);

const label = process.argv[2] ?? "consentledger";
// .dev.vars から直接読む（`source` は `KEY = value` 形式の行で壊れる＝09-26 実測）。
const readDevVars = async () => {
  const text = await Bun.file(".dev.vars")
    .text()
    .catch(() => "");
  for (const line of text.split("\n")) {
    const eq = line.indexOf("=");
    if (eq < 0 || line.trimStart().startsWith("#")) continue;
    if (line.slice(0, eq).trim() === "EVM_PRIVATE_KEY") return line.slice(eq + 1).trim();
  }
  return undefined;
};
const key = process.env.EVM_PRIVATE_KEY ?? (await readDevVars());
if (!key?.startsWith("0x")) {
  console.error("EVM_PRIVATE_KEY (0x...) が .dev.vars に無い");
  process.exit(1);
}
const account = privateKeyToAccount(key as `0x${string}`);
const pub = createPublicClient({ chain: sepolia, transport: http() });
const wallet = createWalletClient({ account, chain: sepolia, transport: http() });

const wait = async (hash: `0x${string}`, what: string) => {
  const r = await pub.waitForTransactionReceipt({ hash });
  console.log(`  ${what}: ${r.status} (${hash})`);
  if (r.status !== "success") process.exit(1);
};

console.log(`account ${account.address}`);

// ガスが無いと viem は estimateGas の深いスタックで落ちる（09-26 実測・原因が読めない）。
// 先に残高を見て1行で止める。
const MIN_GAS = 5_000_000_000_000_000n; // 0.005 ETH
let gas = await pub.getBalance({ address: account.address });
if (gas < MIN_GAS) {
  // --wait なら入金を待って自動で続行する（人間の送金を待つ間ポーリング）。
  const deadline = Date.now() + 20 * 60_000;
  if (!process.argv.includes("--wait")) {
    console.error(`Sepolia ETH が足りない（${formatUnits(gas, 18)} ETH）。0.05 ほど ${account.address} へ送る`);
    process.exit(1);
  }
  console.log(`waiting for funds at ${account.address} (20分まで)`);
  while (gas < MIN_GAS) {
    if (Date.now() > deadline) {
      console.error("入金が来なかった");
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 10_000));
    gas = await pub.getBalance({ address: account.address });
  }
  console.log(`funded: ${formatUnits(gas, 18)} ETH`);
}
if (!(await pub.readContract({ address: REGISTRAR, abi: registrar, functionName: "isAvailable", args: [label] }))) {
  console.error(`"${label}" は空いていない`);
  process.exit(1);
}

const [base, premium] = await pub.readContract({
  address: REGISTRAR,
  abi: registrar,
  functionName: "getRegisterPrice",
  args: [label, ONE_YEAR, USDC],
});
const cost = base + premium;
console.log(`price ${formatUnits(cost, 6)} MockUSDC`);

// 1) 足りなければ mint（誰でも呼べる）
const balance = await pub.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
if (balance < cost) {
  console.log("1) mint");
  await wait(
    await wallet.writeContract({ address: USDC, abi: mintable, functionName: "mint", args: [account.address, 100_000_000n] }),
    "mint",
  );
}

// 2) approve
console.log("2) approve");
await wait(
  await wallet.writeContract({ address: USDC, abi: erc20Abi, functionName: "approve", args: [REGISTRAR, cost * 2n] }),
  "approve",
);

// 3) commit（front-running 防止。secret は register でも同じ値を使う）
const secret = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}` as `0x${string}`;
const commitment = await pub.readContract({
  address: REGISTRAR,
  abi: registrar,
  functionName: "makeCommitment",
  args: [label, account.address, secret, ZERO, RESOLVER, ONE_YEAR, NO_REFERRER],
});
console.log("3) commit", commitment);
await wait(
  await wallet.writeContract({ address: REGISTRAR, abi: registrar, functionName: "commit", args: [commitment] }),
  "commit",
);

// 4) MIN_COMMITMENT_AGE ぶん待つ
console.log("4) waiting 70s (MIN_COMMITMENT_AGE = 60)");
await new Promise((r) => setTimeout(r, 70_000));

// 5) register
console.log("5) register");
await wait(
  await wallet.writeContract({
    address: REGISTRAR,
    abi: registrar,
    functionName: "register",
    args: [label, account.address, secret, ZERO, RESOLVER, ONE_YEAR, USDC, NO_REFERRER],
  }),
  "register",
);
console.log(`done: ${label}.eth`);
