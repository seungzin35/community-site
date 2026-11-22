/** 커뮤니티 레벨: 모두의 활동 점수가 쌓이면 뭉치가 자라요. (브라우저와 서버 양쪽에서 씁니다) */

export const LEVELS = [
  { xp: 0, name: "아기 뭉치" },
  { xp: 100, name: "새싹 뭉치" },
  { xp: 300, name: "꽃 뭉치" },
  { xp: 700, name: "목도리 뭉치" },
  { xp: 1500, name: "반짝 뭉치" },
  { xp: 3000, name: "왕관 뭉치" },
  { xp: 6000, name: "망토 뭉치" },
  { xp: 12000, name: "무지개 뭉치" },
  { xp: 25000, name: "황금 뭉치" },
  { xp: 50000, name: "전설의 뭉치" },
] as const;

export const XP_RULES = { post: 10, comment: 3, vote: 1, answer: 5, dailyCap: 60 } as const;

export type TodayActivity = { posts: number; comments: number; votes: number; answers: number; xp: number };
export type MascotState = { total_xp: number; today: TodayActivity };

export function levelInfo(totalXp: number) {
  let index = 0;
  while (index + 1 < LEVELS.length && totalXp >= LEVELS[index + 1].xp) index += 1;
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next ? (totalXp - current.xp) / (next.xp - current.xp) : 1;
  return {
    level: index + 1,
    name: current.name,
    nextName: next?.name ?? null,
    toNext: next ? next.xp - totalXp : 0,
    progress: Math.min(1, Math.max(0, progress)),
  };
}
