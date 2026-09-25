# ENSv2（Sepolia beta）— 最短の呼び出し1ページ（2026-09-17・docs.ens.domains から）

## 何か

ENS＝アドレスに人間が読める名前を付ける台帳（`alice.eth`）。名前には「レコード」（アドレス・テキスト key/value）を付けられ、誰でも読める。ENSv2 は台帳の作り直しで、いまは Sepolia テストネットだけで動く。賞の条件＝ENSv2 の新機能（階層レジストリ・サブネーム・Enhanced Access Control・Permissioned Resolver）が中心にあること。

## 36時間での最短経路（重い順に3段・上から試して通った段で止める）

### 段1（最軽量・SDK 不要）: 親名のテキストレコードにエージェント情報を書く

サブネームを発行せず、自分の名前1つに `agent:<name>:budget` のような key でレコードを置き、API 側が読む。ENSv2 の機能としては弱い（Permissioned Resolver を使えば「特定の key だけ他人に編集させる」が Enhanced Access Control のデモになる）。

1. 名前を取る: https://app.ens.dev （ENSv2 Sepolia の公式アプリ）。Sepolia ETH（faucet）＋ MockUSDC（無料 mint）で登録
2. レコードを書く（viem）:
   ```ts
   await wallet.writeContract({
     address: resolverAddress,            // その名前の resolver
     abi: parseAbi(['function setText(bytes32 node, string key, string value)']),
     functionName: 'setText',
     args: [namehash('ops.example.eth'), 'agent:ads:budget', '5.00'],
   })
   ```
3. 読む（API 側）: `bun run scripts/ens.ts <name> [key]`（09-21 実測: viem の `getEnsAddress/getEnsText` は v2 の Universal Resolver で null を返した。docs と同じ `resolve(bytes,bytes)` を直接呼ぶと nick.eth / vitalik.eth が引けた。逆引きは `reverse(bytes,uint256)`）。
   参考（viem の helper・v2 では動かなかった）:
   ```ts
   const v = await client.getEnsText({ name: normalize('ops.example.eth'), key: 'agent:ads:budget' })
   ```
   Sepolia の ENSv2 で読むには viem の `ensUniversalResolverAddress` を v2 の Universal Resolver に向ける（下の表）。viem の最低バージョンは docs の「ENSv2 readiness」で確認。

### 段2（賞の本命）: サブネームをエージェントごとに発行する

親名の下に `ads.ops.example.eth` のような名前を作り、各サブネームに resolver とレコードを持たせる。ENSv2 では「親名の下に自分のレジストリ（UserRegistry）を置く」形:

1. VerifiableFactory で UserRegistry のプロキシを deploy
2. 親のレジストリで `setSubregistry()` を呼び、親名をそのレジストリに向ける
3. レジストリ（PermissionedRegistry 系）に `register(label, owner, resolver, roleBitmap, expiry)` でサブネームを発行
4. 発行したサブネームの resolver に段1と同じ `setText`

TypeScript のサンプルは docs に無い（Solidity のチュートリアルのみ）。ここは ENS ブースのメンターに「UserRegistry を deploy してサブネームを1つ切る最短の viem 呼び出し」を最初に聞く。通らなければ段1に戻す。

### 段3（ボーナス）: Permissioned Resolver で権限を分ける

サブネームごとに Permissioned Resolver を付け、Enhanced Access Control の役割（role bitmap）で「このアカウントはこの key だけ編集可」を設定。募集文の「agents as namespaces, each with their own identity and permissions」はここ。

## 注意: ハッカソン専用デプロイがある場合

ETHOnline 2026 では ENS が**ハッカソン専用の ENSv2 Sepolia デプロイ**と Explorer（`hackathon-deployment-portal-app.ens-cf.workers.dev`）を配っていた（worldcommerce の README）。beta の UR ではその名前は引けない（`ResolverNotFound`）。金曜の ENS workshop で「Tokyo 用のデプロイと Explorer の URL」を最初に聞き、`scripts/ens.ts` は `ENS_UR=0x… bun run scripts/ens.ts …` で UR を差し替える。

## Sepolia ENSv2 beta の主要アドレス（docs/learn/deployments）

| 名前 | アドレス |
|---|---|
| RootRegistry | 0x8115186e8f2e0b0281e86ab91f0f48ba90364354 |
| ETHRegistry | 0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2 |
| ETHRegistrar | 0xa88553f454b77203b0d036a05c894d555eaaa2cc |
| UniversalResolverV2 | 0x4a1817d13e9cf196f471725176355c1234b63c70 |
| UpgradableUniversalResolverProxy | 0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe |
| PublicResolverV2 | 0xe7b9a25607e02da8145e4eb1836ca539e53f11f7 |
| PermissionedResolverImpl | 0x9eae5c2730a7dd16bdd1dee6421a1b91e3b0365e |
| UserRegistryImpl | 0x624a25d67b59d587752ebec8dded8827dae52050 |
| VerifiableFactory | 0x10dc6333cdfe1fcef624c6e0a8221b91804cd7ef |
| MockUSDC | 0x768f42455a2d082e23ceef7d51e5787c82d67a39 |

## 用語

- registry＝どの名前を誰が持つかの台帳。resolver＝その名前のレコードを返す契約。名前→resolver→レコード、の2段
- namehash＝名前のハッシュ（レコードの鍵）。normalize＝名前の正規化（必ず通す）
- wildcard resolution＝親の resolver がサブネームもまとめて解決する仕組み（サブネームごとに契約を置かなくてよい）
- Universal Resolver＝クライアントが1回の呼び出しで解決できる入口。viem の `getEnsText` はこれを使う
- Enhanced Access Control＝役割（role）ごとの権限。「この鍵だけ編集可」を他人に委任できる
- 逆引き（reverse）＝アドレス→名前。x402 の払い手アドレスから名前を引く時に使う（`getEnsName`）。ENSv2 Sepolia では ReverseRegistrarAdapter 経由

## 事前に読む（順番）

1. https://docs.ens.domains/ensv2/ （概要）
2. https://docs.ens.domains/ensv2/tutorial-app-developers （名前の取り方・レコードの読み書き）
3. https://docs.ens.domains/ensv2/permissioned-registry ・ /permissioned-resolver ・ /enhanced-access-control
4. https://docs.ens.domains/learn/deployments#sepolia-ensv2-beta （アドレス表）
