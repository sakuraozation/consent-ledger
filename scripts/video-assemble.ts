// 冒頭（静止カード＋別録りの音声）と画面収録を1本に繋ぐ。
//
//   bun run scripts/video-assemble.ts <opening-audio> <screen-recording> [out.mp4]
//
// 合成音声は使わない——ここでやるのは**自分の声をそのまま**カードに乗せて、画面収録の
// 前に繋ぐだけ。音声は再エンコードするが加工はしない（速度も音程も変えない＝規約）。
//
// 前提: ffmpeg（`brew install ffmpeg`）。カードの PNG は assets/opening-card.png
// （assets/opening-card.html を全画面で撮ったもの）。
const [audio, screen, out = "submission.mp4"] = process.argv.slice(2);
if (!audio || !screen) {
  console.error("使い方: bun run scripts/video-assemble.ts <opening-audio> <screen-recording> [out.mp4]");
  process.exit(1);
}
const CARD = "assets/opening-card.png";

const sh = async (args: string[]) => {
  const p = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
  const [outText, errText] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  return { code: await p.exited, out: outText, err: errText };
};

const probe = async (file: string, stream: string, field: string) => {
  const r = await sh([
    "ffprobe", "-v", "error", "-select_streams", stream, "-show_entries", `stream=${field}`,
    "-of", "default=nw=1:nk=1", file,
  ]);
  return r.out.trim().split("\n")[0] ?? "";
};

for (const f of [CARD, audio, screen]) {
  if (!(await Bun.file(f).exists())) {
    console.error(`見つからない: ${f}${f === CARD ? "（assets/opening-card.html を全画面で撮って保存する）" : ""}`);
    process.exit(1);
  }
}

// 画面収録の解像度は 720p 以上でなければ提出要件を満たさない
const [w, h] = [await probe(screen, "v:0", "width"), await probe(screen, "v:0", "height")];
console.log(`画面収録 ${w}x${h}`);
if (Number(h) < 720) {
  console.error(`縦 ${h}px＝720 未満。撮り直しが要る（提出要件）`);
  process.exit(1);
}

// 1) カード＋音声で冒頭を作る。長さは音声に合わせる
console.log("1) 冒頭（カード＋あなたの声）");
const opening = "/tmp/consent-ledger-opening.mp4";
let r = await sh([
  "ffmpeg", "-y", "-loop", "1", "-i", CARD, "-i", audio,
  "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x0b0b0d,format=yuv420p`,
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "30",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
  "-shortest", opening,
]);
if (r.code !== 0) {
  console.error(r.err.split("\n").slice(-12).join("\n"));
  process.exit(1);
}

// 2) 画面収録を同じ形式に揃える（繋ぐ前に合わせないと音がずれる）
console.log("2) 画面収録を同じ形式に揃える");
const body = "/tmp/consent-ledger-body.mp4";
r = await sh([
  "ffmpeg", "-y", "-i", screen,
  "-vf", `scale=${w}:${h},format=yuv420p`,
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "30",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
  body,
]);
if (r.code !== 0) {
  console.error(r.err.split("\n").slice(-12).join("\n"));
  process.exit(1);
}

// 3) 繋ぐ
console.log("3) 繋ぐ");
const list = "/tmp/consent-ledger-list.txt";
await Bun.write(list, `file '${opening}'\nfile '${body}'\n`);
r = await sh(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out]);
if (r.code !== 0) {
  console.error(r.err.split("\n").slice(-12).join("\n"));
  process.exit(1);
}

const dur = Number(await probe(out, "v:0", "duration")) || 0;
const mins = `${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2, "0")}`;
console.log(`\n${out} — ${mins}（${w}x${h}）`);
if (dur < 120) console.error("⚠ 2分未満＝短すぎる（提出要件は 2〜4分）");
else if (dur > 240) console.error("⚠ 4分超過＝**失格になる**。shot を1つ落として撮り直す");
else console.log("長さは要件内（2〜4分）");
