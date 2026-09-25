// 払う側（エージェント役）。testnet の秘密鍵を EVM_PRIVATE_KEY に入れて実行する。
//   EVM_PRIVATE_KEY=0x... bun run pay http://localhost:8787/paid
// 鍵は testnet 専用の使い捨てにする。mainnet の鍵をここに入れない。
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";

const url = process.argv[2] ?? "http://localhost:8787/paid";
const key = process.env.EVM_PRIVATE_KEY;
if (!key?.startsWith("0x")) {
  console.error("EVM_PRIVATE_KEY (0x...) が要る。testnet 専用の鍵にする。");
  process.exit(1);
}

const client = new x402Client().register(
  "eip155:*",
  new ExactEvmScheme(privateKeyToAccount(key as `0x${string}`)),
);
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const first = await fetch(url);
console.log("without payment:", first.status);

const res = await fetchWithPayment(url);
console.log("with payment:", res.status);
console.log(await res.text());

// v2 は本文でなくヘッダに base64 の JSON を載せる。
const decode = (h: string | null) => (h ? JSON.parse(atob(h)) : undefined);
if (res.status === 402) {
  // 2回目も 402 ＝ facilitator が弾いた（残高不足など）。理由は error に入る。
  console.log("rejected:", decode(res.headers.get("payment-required")));
} else {
  console.log("receipt:", decode(res.headers.get("payment-response")));
}
