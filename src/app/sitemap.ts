import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { site } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public";

/** 검색엔진용 사이트 지도: 게시판, 글, 지난 오늘의 질문 (1시간마다 새로 만듦) */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");

  const entries: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: "hourly", priority: 1 },
    { url: `${site.url}/question`, changeFrequency: "daily", priority: 0.8 },
    { url: `${site.url}/question/hall`, changeFrequency: "daily", priority: 0.6 },
  ];
  if (!isSupabaseConfigured) return entries;

  const supabase = createPublicClient();
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [boards, posts, questions] = await Promise.all([
    supabase.from("boards").select("id, slug").eq("is_active", true),
    supabase
      .from("posts")
      .select("id, board_id, updated_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("daily_questions")
      .select("id, open_date")
      .not("open_date", "is", null)
      .lt("open_date", today)
      .order("open_date", { ascending: false })
      .limit(1000),
  ]);

  const slugOf = new Map((boards.data ?? []).map((board) => [board.id, board.slug]));
  for (const board of boards.data ?? []) {
    entries.push({ url: `${site.url}/b/${board.slug}`, changeFrequency: "hourly", priority: 0.7 });
  }
  for (const post of posts.data ?? []) {
    const slug = slugOf.get(post.board_id);
    if (!slug) continue; // 숨긴 게시판의 글은 빼요
    entries.push({ url: `${site.url}/b/${slug}/${post.id}`, lastModified: post.updated_at, priority: 0.5 });
  }
  for (const question of questions.data ?? []) {
    entries.push({ url: `${site.url}/question/${question.id}`, lastModified: question.open_date, priority: 0.4 });
  }
  return entries;
}
