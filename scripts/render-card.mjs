// 갤러리/유머 글에 넣을 카드 이미지(1080x1080 PNG)를 만듭니다.
// 사용법: node scripts/render-card.mjs <카드.json> <저장할.png>
//   카드.json: { "tag": "밸런스 게임", "title": "평생 하나만?", "lines": ["A. ...", "B. ..."], "footer": "뭉치네", "theme": "iris" }
// theme: iris(보라) | mint | peach | night
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
// 클라우드 작업 환경에 미리 설치된 playwright 를 씁니다.
const { chromium } = createRequire(import.meta.url)("playwright");

const card = JSON.parse(readFileSync(process.argv[2], "utf8"));
const out = process.argv[3];
const themes = {
  iris: ["#5b5bd6", "#8e4ec6", "#fff"],
  mint: ["#12a594", "#3e9b4f", "#fff"],
  peach: ["#f76b15", "#e54666", "#fff"],
  night: ["#1c2024", "#3a3f6b", "#fff"],
};
const [a, b, fg] = themes[card.theme] ?? themes.iris;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const html = `<!doctype html><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}body{width:1080px;height:1080px;font-family:"Noto Sans CJK KR","Noto Sans KR","Apple SD Gothic Neo",sans-serif;
background:linear-gradient(135deg,${a},${b});color:${fg};display:flex;flex-direction:column;justify-content:center;padding:110px;gap:44px}
.tag{display:inline-block;align-self:flex-start;background:rgba(255,255,255,.18);border-radius:999px;padding:14px 32px;font-size:34px;font-weight:700}
h1{font-size:${card.title.length > 14 ? 76 : 92}px;line-height:1.2;font-weight:800;letter-spacing:-1px;word-break:keep-all}
ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:22px}li{background:rgba(255,255,255,.14);border-radius:28px;padding:30px 38px;font-size:42px;font-weight:600;line-height:1.35;word-break:keep-all}
.f{margin-top:auto;font-size:30px;opacity:.75;font-weight:700}</style>
${card.tag ? `<div class="tag">${esc(card.tag)}</div>` : ""}<h1>${esc(card.title)}</h1>
${card.lines?.length ? `<ul>${card.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
<div class="f">${esc(card.footer ?? "뭉치네 · community.zinnote.kr")}</div>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
await page.setContent(html);
await page.screenshot({ path: out });
await browser.close();
console.log(out);
