// 委任の権限をチェーンから読む。書き込みはしない（Worker に鍵を置かない）。
//
// なぜ2層なのか: 「誰が誰の代わりに話せるか」はサーバが正直であることに依存させたくない
// ＝ENSv2 の Enhanced Access Control に置く。「各リクエストに何を返すか」は1往復で
// 答えが要るので D1 に置く。したがって**チェーンが権限の正本**で、D1 はその下で出した
// 許諾の台帳。委任がチェーン上で剥奪されていれば、D1 に許諾が残っていても通さない。
//
// 読めなかった時は allow を出さない（fail closed）。RPC の不調で許諾の範囲が
// 広がるのは、この作品が防ごうとしているものそのものなので。
import { createPublicClient, encodeAbiParameters, http, keccak256, namehash, parseAbi, toHex } from "viem";
import { sepolia } from "viem/chains";

/** PermissionedResolverLib.ROLE_SET_TEXT = 1 << 4 */
const ROLE_SET_TEXT = 1n << 4n;

const resolverAbi = parseAbi([
  "function roles(uint256 resource, address account) view returns (uint256)",
  "function text(bytes32 node, string key) view returns (string)",
]);

/** PermissionedResolverLib.resource(node, partHash(key)) */
const resourceFor = (node: `0x${string}`, key: string) =>
  BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "bytes32" }],
        [node, keccak256(toHex(key))],
      ),
    ),
  );

export type ChainState = {
  /** 設定が無い＝チェーン連携を使わない（ローカル開発） */
  configured: boolean;
  /** 読めたか。false の時は granted を信用しない */
  ok: boolean;
  name?: string;
  key?: string;
  resolver?: string;
  node?: `0x${string}`;
  /** その custodian が許諾レコードを書ける役割を持っているか */
  granted?: boolean;
  /** チェーン上に書かれている許諾レコード（空なら未記録） */
  record?: string;
  error?: string;
};

export async function readChainDelegation(env: Env, custodian?: string): Promise<ChainState> {
  const resolver = env.ENS_RESOLVER;
  const name = env.ENS_NAME;
  const key = env.ENS_CONSENT_KEY;
  if (!resolver || !name || !key) return { configured: false, ok: false };

  const node = namehash(name);
  const client = createPublicClient({
    chain: sepolia,
    // 単一ノードを指す。ロードバランサ型の公開 RPC は書き込み直後に古いブロックを
    // 返すことがあり、取り消しが数秒だけ効かないように見える（09-26 実測）。
    transport: http(env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"),
  });
  try {
    const [record, roleBits] = await Promise.all([
      client.readContract({
        address: resolver as `0x${string}`,
        abi: resolverAbi,
        functionName: "text",
        args: [node, key],
      }),
      custodian
        ? client.readContract({
            address: resolver as `0x${string}`,
            abi: resolverAbi,
            functionName: "roles",
            args: [resourceFor(node, key), custodian as `0x${string}`],
          })
        : Promise.resolve(0n),
    ]);
    return {
      configured: true,
      ok: true,
      name,
      key,
      resolver,
      node,
      granted: (roleBits & ROLE_SET_TEXT) !== 0n,
      record,
    };
  } catch (e) {
    // 何が読めなかったかを残す。画面にも出す（黙って allow に倒さない）。
    console.error("[chain] read failed", e instanceof Error ? e.message : String(e));
    return {
      configured: true,
      ok: false,
      name,
      key,
      resolver,
      node,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
