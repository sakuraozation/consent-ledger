# World ID — 最短の呼び出し1ページ（2026-09-17・docs.world.org / IDKit から）

## 何か

「この操作をしているのは実在の人間で、同じ人が2回やっていない」を証明する仕組み。World App（スマホ）で本人が証明を作り、あなたのアプリはその証明を検証する。個人情報は渡らない（ゼロ知識証明）。検証レベル＝Orb（虹彩で登録済み・強い）と Device（端末ベース・弱いがデモには十分）。

## 36時間での最短経路（OAuth を入れるのと同じ手順）

1. Developer Portal（https://developer.world.org）でアプリを作る → `app_id`。**staging** アプリにする（シミュレータで試せる）
2. アプリの中に action を1つ作る → `action`（例 `register-likeness`）。「1人1回」の単位はこの action
3. フロントにボタンを置く（React・`@worldcoin/idkit`）:
   ```tsx
   import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit'
   <IDKitWidget
     app_id="app_..." action="register-likeness"
     verification_level={VerificationLevel.Device}
     handleVerify={async (proof) => {           // 証明が来たらサーバへ
       const r = await fetch('/api/verify', { method: 'POST', body: JSON.stringify(proof) })
       if (!r.ok) throw new Error('verification failed')
     }}
     onSuccess={() => { /* モーダルが閉じた後の処理 */ }}
   >
     {({ open }) => <button onClick={open}>Verify with World ID</button>}
   </IDKitWidget>
   ```
   React を使わない場合は `@worldcoin/idkit-standalone`（素の JS 版）がある＝要確認
4. サーバで検証（Hono / Workers でそのまま動く・HTTP 1本）:
   ```ts
   // POST https://developer.world.org/api/v2/verify/{app_id}
   const r = await fetch(`https://developer.world.org/api/v2/verify/${APP_ID}`, {
     method: 'POST', headers: { 'content-type': 'application/json' },
     body: JSON.stringify({ ...proof, action: 'register-likeness' }),   // proof = { nullifier_hash, merkle_root, proof, verification_level }
   })
   const { success } = await r.json()
   ```
   同じことを `verifyCloudProof(proof, app_id, action)`（`@worldcoin/idkit`）でも書ける
5. `nullifier_hash` を保存する＝「この人（匿名）はこの action を済ませた」の鍵。同じ人が2回来ると検証が失敗する＝sybil 防止はこれだけで成立

## 試す

- 本人の World App で Device レベルの証明を作る（Orb 登録は要らない）
- staging アプリなら World ID Simulator（docs の「Testing」）で偽の人間として試せる＝チームメイトのスマホが無くても回る

## 用語

- proof of personhood＝人間である証明（bot/量産アカウントの排除）
- nullifier＝「この人×この action」の一意な匿名 ID。人を特定できないが重複は分かる
- signal＝証明に紐づける任意データ（例: 登録するアドレス）。改ざん防止に使う
- Orb / Device＝検証レベル。賞の要件で Orb 指定があれば、審査員側で Orb 済みアカウントが要る＝金曜に聞く
- World Chain / MiniKit＝World App 内のミニアプリ用。今回は使わない（IDKit だけで足りる）

## 事前に読む（順番）

1. https://docs.world.org/world-id （概要）
2. https://docs.world.org/world-id/quick-start （IDKit の導入・上の手順）
3. https://docs.world.org/world-id/reference/api （/api/v2/verify）
4. https://developer.world.org （アプリ・action を作る＝ツールに慣れる範囲。事前に作ってよい）
