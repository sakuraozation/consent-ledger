// ENSv2（Sepolia beta）を読む側。名前→アドレス／テキストレコード／アドレス→名前（逆引き）。
//   bun run scripts/ens.ts <name> [textKey]      例: bun run scripts/ens.ts nick.eth com.twitter
//   bun run scripts/ens.ts 0x<address>           # 逆引き
// 書く側（setText）は名前の所有者の鍵が要るので app.ens.dev の UI でやる（鍵はここに置かない）。
// viem の getEnsAddress/getEnsText は v2 の Universal Resolver と噛み合わず null を返したので、
// docs と同じ resolve(bytes,bytes) を直接呼ぶ（09-21 実測: nick.eth / vitalik.eth が引けた）。
// ハッカソン専用デプロイが配られたら UR を env ENS_UR で差し替える。
import {
  createPublicClient,
  decodeFunctionResult,
  encodeFunctionData,
  http,
  isAddress,
  namehash,
  parseAbi,
  toHex,
} from "viem";
import { sepolia } from "viem/chains";
import { normalize, packetToBytes } from "viem/ens";

// docs.ens.domains/learn/deployments#sepolia-ensv2-beta — UpgradableUniversalResolverProxy
const UR = (process.env.ENS_UR ?? "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe") as `0x${string}`;

const client = createPublicClient({ chain: sepolia, transport: http() });
const urAbi = parseAbi([
  "function resolve(bytes name, bytes data) view returns (bytes result, address resolver)",
  "function reverse(bytes lookupAddress, uint256 coinType) view returns (string name, address resolver, address reverseResolver)",
]);
const addrAbi = parseAbi(["function addr(bytes32 node) view returns (address)"]);
const textAbi = parseAbi(["function text(bytes32 node, string key) view returns (string)"]);

async function resolve<T extends typeof addrAbi | typeof textAbi>(
  name: string,
  abi: T,
  fn: "addr" | "text",
  args: readonly unknown[],
) {
  const dns = toHex(packetToBytes(name));
  // biome-ignore lint/suspicious/noExplicitAny: viem の型と abi のユニオンを跨ぐため
  const data = encodeFunctionData({ abi, functionName: fn, args } as any);
  const [result, resolver] = await client.readContract({
    address: UR,
    abi: urAbi,
    functionName: "resolve",
    args: [dns, data],
  });
  // biome-ignore lint/suspicious/noExplicitAny: 同上
  const value = decodeFunctionResult({ abi, functionName: fn, data: result } as any);
  return { value, resolver };
}

const arg = process.argv[2];
const key = process.argv[3] ?? "description";
if (!arg) {
  console.error("usage: bun run scripts/ens.ts <name> [textKey] | <0xaddress>");
  process.exit(1);
}

try {
  if (isAddress(arg)) {
    const [name] = await client.readContract({
      address: UR,
      abi: urAbi,
      functionName: "reverse",
      args: [arg, 60n], // coinType 60 = ETH
    });
    console.log("reverse:", arg, "->", name || "(none)");
  } else {
    const name = normalize(arg);
    const node = namehash(name);
    const a = await resolve(name, addrAbi, "addr", [node]);
    const t = await resolve(name, textAbi, "text", [node, key]);
    console.log("name:", name);
    console.log("address:", a.value, "(resolver", a.resolver, ")");
    console.log(`text[${key}]:`, t.value || "(empty)");
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.log(
    msg.includes("0x77209fe8")
      ? "not found on this ENSv2 deployment (ResolverNotFound)"
      : msg.slice(0, 300),
  );
}
