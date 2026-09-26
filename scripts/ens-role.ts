// デモ中にオンチェーンの委任を付け外しする。取り消しを画面で見せるための1手。
//
//   bun run scripts/ens-role.ts grant
//   bun run scripts/ens-role.ts withdraw
//
// 全経路をまとめて走らせるのは scripts/ens-delegate.ts（そちらは resolver を作り直す）。
import { createPublicClient, createWalletClient, http, parseAbi, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { AGENCY_SIDE, ENS } from "../src/config";

const { resolver: RESOLVER, name: NAME, keyPrefix: PREFIX } = ENS;

const abi = parseAbi([
  "function authorizeTextRoles(bytes toName, string key, address account, bool grant) returns (bool)",
]);
const dnsEncode = (name: string) =>
  toHex(
    new Uint8Array([...name.split(".").flatMap((l) => [l.length, ...new TextEncoder().encode(l)]), 0]),
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

const action = process.argv[2];
if (action !== "grant" && action !== "withdraw") {
  console.error("使い方: bun run scripts/ens-role.ts grant|withdraw [scope ...]");
  process.exit(1);
}
// 既定は従来の仕事の3つ。生成 AI の側（ai-generation 等）は渡さない
// ＝「事務所がまだコントロールしていない領域」を渡していない状態から始める。
const scopes = process.argv.length > 3 ? process.argv.slice(3) : [...AGENCY_SIDE];
const personKey = await devVar("EVM_PRIVATE_KEY");
const agencyKey = await devVar("AGENCY_PRIVATE_KEY");
if (!personKey?.startsWith("0x") || !agencyKey?.startsWith("0x")) {
  console.error("EVM_PRIVATE_KEY と AGENCY_PRIVATE_KEY が .dev.vars に要る");
  process.exit(1);
}
const person = privateKeyToAccount(personKey as `0x${string}`);
const agency = privateKeyToAccount(agencyKey as `0x${string}`);
const pub = createPublicClient({ chain: sepolia, transport: http() });
const wallet = createWalletClient({ account: person, chain: sepolia, transport: http() });

for (const scope of scopes) {
  const key = `${PREFIX}.${scope}`;
  const hash = await wallet.writeContract({
    address: RESOLVER,
    abi,
    functionName: "authorizeTextRoles",
    args: [dnsEncode(NAME), key, agency.address, action === "grant"],
  });
  const r = await pub.waitForTransactionReceipt({ hash });
  console.log(`${action} ${NAME}/${key} -> ${agency.address}: ${r.status} (${hash})`);
}
