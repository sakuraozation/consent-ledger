// 委任を ENSv2 の Enhanced Access Control で表現する。アプリの D1 で持っている
// delegation を、そのままチェーン上の役割に写す:
//
//   本人（親名の admin）  → authorizeTextRoles(name, key, 事務所, true)   = 委任する
//   事務所                → setText(node, key, 許諾の内容)                 = 許諾を出す
//   事務所が別のキーを触る → revert                                        = 範囲の外は触れない
//   本人                  → authorizeTextRoles(name, key, 事務所, false)  = 取り下げる
//   そのあと事務所が setText → revert                                      = 出した許諾は以後効かない
//
//   bun run scripts/ens-delegate.ts
//
// 鍵は .dev.vars（EVM_PRIVATE_KEY = 本人 / AGENCY_PRIVATE_KEY = 事務所）。
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  namehash,
  parseAbi,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { ENS } from "../src/config";

const FACTORY = "0x10dc6333cdfe1fcef624c6e0a8221b91804cd7ef" as const;
const RESOLVER_IMPL = "0x9eae5c2730a7dd16bdd1dee6421a1b91e3b0365e" as const;
const ETH_REGISTRY = "0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2" as const;
const LABEL = ENS.name.replace(/\.eth$/, "");
const NAME = ENS.name;
// 委任するキー＝許諾のレコードだけ。事務所はここしか書けない。
const CONSENT_KEY = "consent.bodyscan";
const OTHER_KEY = "avatar"; // 範囲の外（失敗経路の証拠）
// EACBaseRolesLib.ALL_ROLES — 全 64 スロットに 1（本人は親名の全権を持つ）
const ALL_ROLES = 0x1111111111111111111111111111111111111111111111111111111111111111n;

const factory = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data) returns (address)",
]);
const resolver = parseAbi([
  "function initialize(address admin, uint256 roleBitmap, bytes[] setters)",
  "function authorizeTextRoles(bytes toName, string key, address account, bool grant) returns (bool)",
  "function setText(bytes32 node, string key, string value)",
  "function text(bytes32 node, string key) view returns (string)",
  // 役割が無い時に返る error。ABI に入れておかないと viem は selector のまま出す。
  "error EACUnauthorizedAccountRoles(uint256 resource, uint256 roleBitmap, address account)",
]);
const registry = parseAbi([
  "function findTokenId(string label) view returns (uint256)",
  "function setResolver(uint256 anyId, address resolver)",
  "function getResolver(string label) view returns (address)",
]);

// DNS wire format（NameCoder.encode）
const dnsEncode = (name: string) =>
  toHex(
    new Uint8Array([
      ...name.split(".").flatMap((l) => [l.length, ...new TextEncoder().encode(l)]),
      0,
    ]),
  );

const devVar = async (key: string) => {
  const text = await Bun.file(".dev.vars")
    .text()
    .catch(() => "");
  for (const line of text.split("\n")) {
    const eq = line.indexOf("=");
    if (eq < 0 || line.trimStart().startsWith("#")) continue;
    if (line.slice(0, eq).trim() === key) return line.slice(eq + 1).trim();
  }
  return undefined;
};

const personKey = await devVar("EVM_PRIVATE_KEY");
const agencyKey = await devVar("AGENCY_PRIVATE_KEY");
if (!personKey?.startsWith("0x") || !agencyKey?.startsWith("0x")) {
  console.error("EVM_PRIVATE_KEY と AGENCY_PRIVATE_KEY が .dev.vars に要る");
  process.exit(1);
}
const person = privateKeyToAccount(personKey as `0x${string}`);
const agency = privateKeyToAccount(agencyKey as `0x${string}`);
const pub = createPublicClient({ chain: sepolia, transport: http() });
const asPerson = createWalletClient({ account: person, chain: sepolia, transport: http() });
const asAgency = createWalletClient({ account: agency, chain: sepolia, transport: http() });

// 事務所役にガスを回す（役割の検証が「残高不足」で落ちると失敗経路が偽陽性になる）
const agencyGas = await pub.getBalance({ address: agency.address });
if (agencyGas < 2_000_000_000_000_000n) {
  console.log("fund agency");
  await pub.waitForTransactionReceipt({
    hash: await asPerson.sendTransaction({ to: agency.address, value: 5_000_000_000_000_000n }),
  });
}

const node = namehash(NAME);
const encoded = dnsEncode(NAME);
console.log(`person ${person.address}\nagency ${agency.address}\nnode   ${node}`);

const send = async (hash: `0x${string}`, what: string) => {
  const r = await pub.waitForTransactionReceipt({ hash });
  console.log(`  ${what}: ${r.status}`);
  if (r.status !== "success") process.exit(1);
  return r;
};
// 失敗が期待値の呼び出し（revert が出ることそのものが証拠）
const expectRevert = async (what: string, run: () => Promise<unknown>) => {
  try {
    await run();
    console.log(`  ${what}: 通ってしまった（想定外）`);
    process.exit(1);
  } catch (e) {
    const m = String(e).match(/EAC[A-Za-z]+/);
    console.log(`  ${what}: 拒否された（期待どおり）${m ? ` — ${m[0]}` : ""}`);
  }
};

// 1) 本人を admin にした Permissioned Resolver を立てる
const initData = encodeFunctionData({
  abi: resolver,
  functionName: "initialize",
  args: [person.address, ALL_ROLES, []],
});
const salt = BigInt(Date.now());
console.log("1) deploy PermissionedResolver proxy");
const { result: proxy } = await pub.simulateContract({
  address: FACTORY,
  abi: factory,
  functionName: "deployProxy",
  args: [RESOLVER_IMPL, salt, initData],
  account: person,
});
await send(
  await asPerson.writeContract({
    address: FACTORY,
    abi: factory,
    functionName: "deployProxy",
    args: [RESOLVER_IMPL, salt, initData],
  }),
  `proxy ${proxy}`,
);

// 2) 親名の resolver をこれに差し替える
const tokenId = await pub.readContract({
  address: ETH_REGISTRY,
  abi: registry,
  functionName: "findTokenId",
  args: [LABEL],
});
console.log("2) setResolver");
await send(
  await asPerson.writeContract({
    address: ETH_REGISTRY,
    abi: registry,
    functionName: "setResolver",
    args: [tokenId, proxy],
  }),
  "setResolver",
);

// 3) 委任する前：事務所は書けない
console.log("3) before delegation");
await expectRevert("agency setText", () =>
  pub.simulateContract({
    address: proxy,
    abi: resolver,
    functionName: "setText",
    args: [node, CONSENT_KEY, "allow"],
    account: agency,
  }),
);

// 4) 本人が委任する（許諾のキーだけ）
console.log("4) delegate");
await send(
  await asPerson.writeContract({
    address: proxy,
    abi: resolver,
    functionName: "authorizeTextRoles",
    args: [encoded, CONSENT_KEY, agency.address, true],
  }),
  `authorizeTextRoles("${CONSENT_KEY}") grant`,
);

// 5) 事務所が許諾を出す
const value = `allow;scope=bodyscan;until=${new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)}`;
console.log("5) agency issues consent");
await send(
  await asAgency.writeContract({
    address: proxy,
    abi: resolver,
    functionName: "setText",
    args: [node, CONSENT_KEY, value],
  }),
  "agency setText",
);
console.log(
  `  text(${CONSENT_KEY}) = ${await pub.readContract({ address: proxy, abi: resolver, functionName: "text", args: [node, CONSENT_KEY] })}`,
);

// 6) 範囲の外は触れない（キー単位である証拠）
console.log("6) outside the scope");
await expectRevert(`agency setText("${OTHER_KEY}")`, () =>
  pub.simulateContract({
    address: proxy,
    abi: resolver,
    functionName: "setText",
    args: [node, OTHER_KEY, "https://example.com/a.png"],
    account: agency,
  }),
);

// 7) 本人が取り下げる
console.log("7) withdraw");
await send(
  await asPerson.writeContract({
    address: proxy,
    abi: resolver,
    functionName: "authorizeTextRoles",
    args: [encoded, CONSENT_KEY, agency.address, false],
  }),
  `authorizeTextRoles("${CONSENT_KEY}") revoke`,
);
await expectRevert("agency setText after withdrawal", () =>
  pub.simulateContract({
    address: proxy,
    abi: resolver,
    functionName: "setText",
    args: [node, CONSENT_KEY, "allow again"],
    account: agency,
  }),
);

console.log(`\nresolver ${proxy}\n${NAME} の許諾レコードは、本人が委ねている間だけ事務所が書ける。`);
