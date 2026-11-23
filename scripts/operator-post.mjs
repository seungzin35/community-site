// 운영자 계정으로 글(또는 오늘의 질문 답)을 올리는 도구.
// 사용법: node scripts/operator-post.mjs <글.json>
//   글.json: { "board": "free", "title": "...", "content": "...", "images": ["/path/a.png"] }
//        또는 { "answer": "오늘의 질문에 달 답" }
// 필요한 환경 변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
//                   OPERATOR_EMAIL, OPERATOR_PASSWORD
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bjvnofkbfeoijcccppea.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_s02Z0oPC0PXygaHBc1kPzQ_XztfjLp2";
const { OPERATOR_EMAIL: email, OPERATOR_PASSWORD: password } = process.env;
if (!email || !password) throw new Error("OPERATOR_EMAIL / OPERATOR_PASSWORD 환경 변수가 없어요.");

const input = JSON.parse(readFileSync(process.argv[2], "utf8"));
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: auth, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
if (loginError) throw new Error("운영자 로그인 실패: " + loginError.message);
const uid = auth.user.id;

if (input.answer) {
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const { data: q } = await supabase.from("daily_questions").select("id, content").eq("open_date", today).maybeSingle();
  if (!q) throw new Error("오늘 열린 질문이 없어요.");
  const { error } = await supabase.from("daily_answers").insert({ question_id: q.id, author_id: uid, content: input.answer });
  if (error && error.code !== "23505") throw new Error("답 등록 실패: " + error.message);
  console.log(JSON.stringify({ ok: true, question: q.content, duplicate: error?.code === "23505" }));
  process.exit(0);
}

const { data: board } = await supabase.from("boards").select("id, type").eq("slug", input.board).eq("is_active", true).maybeSingle();
if (!board) throw new Error("게시판을 찾을 수 없어요: " + input.board);

// 사진은 "<회원 id>/<임의 이름>" 경로로 올립니다.
const paths = [];
for (const file of input.images ?? []) {
  const ext = extname(file).slice(1).toLowerCase() || "png";
  const path = `${uid}/${randomUUID()}.${ext}`;
  const type = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  const { error } = await supabase.storage.from("post-images").upload(path, readFileSync(file), { contentType: type });
  if (error) throw new Error(`사진 업로드 실패 (${basename(file)}): ${error.message}`);
  paths.push(path);
}
if (board.type === "gallery" && paths.length === 0) throw new Error("갤러리에는 사진이 필요해요.");

const { data: post, error } = await supabase
  .from("posts")
  .insert({ board_id: board.id, author_id: uid, title: input.title, content: input.content ?? "", thumbnail_path: paths[0] ?? null })
  .select("id")
  .single();
if (error) {
  if (paths.length) await supabase.storage.from("post-images").remove(paths);
  throw new Error("글 등록 실패: " + error.message);
}
if (paths.length) {
  const { error: imageError } = await supabase
    .from("post_images")
    .insert(paths.map((storage_path, sort_order) => ({ post_id: post.id, storage_path, sort_order })));
  if (imageError) throw new Error("사진 정보 저장 실패: " + imageError.message);
}
console.log(JSON.stringify({ ok: true, url: `https://community.zinnote.kr/b/${input.board}/${post.id}` }));
