import { Heart, MessageCircle, MessageCircleQuestion, PenLine, ThumbsUp } from "lucide-react";
import { MASCOT_NAME } from "@/components/guide/mascot";
import { levelInfo, type MascotState, XP_RULES } from "@/lib/mascot-level";
import { MascotFigure } from "./mascot-figure";

/** 홈: 모두가 함께 키우는 뭉치 */
export function MascotCard({ state }: { state: MascotState }) {
  const info = levelInfo(state.total_xp);
  const { today } = state;
  const stats = [
    { icon: <PenLine className="size-3.5" />, label: "글", value: today.posts },
    { icon: <MessageCircle className="size-3.5" />, label: "댓글", value: today.comments },
    { icon: <ThumbsUp className="size-3.5" />, label: "추천", value: today.votes },
    { icon: <MessageCircleQuestion className="size-3.5" />, label: "답", value: today.answers },
  ];

  return (
    <section className="card relative overflow-hidden p-5" data-tour="mascot">
      <div className="flex items-center gap-4">
        <div className="mascot-grow relative size-24 shrink-0 sm:size-28">
          <MascotFigure level={info.level} className="size-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground">우리가 함께 키우는 {MASCOT_NAME}</p>
          <p className="mt-0.5 flex items-baseline gap-2">
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs font-extrabold text-primary-foreground">
              Lv.{info.level}
            </span>
            <span className="truncate text-lg font-extrabold tracking-tight">{info.name}</span>
          </p>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="다음 레벨까지"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(info.progress * 100)}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8f8ff7] to-[#5b5bd6] transition-[width] duration-700"
              style={{ width: `${Math.max(4, info.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {info.nextName ? (
              <>
                <b className="font-semibold text-foreground">{info.toNext.toLocaleString()}점</b> 더 모으면 {info.nextName}!
              </>
            ) : (
              "최고 레벨이에요. 모두 고마워요!"
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-muted/70 p-3">
        <p className="flex items-center justify-between text-xs font-semibold">
          <span>오늘 모두의 활동</span>
          <span className="inline-flex items-center gap-1 text-primary">
            <Heart className="size-3.5 fill-current" /> +{today.xp.toLocaleString()}점
          </span>
        </p>
        <ul className="mt-2 grid grid-cols-4 gap-2 text-center">
          {stats.map((stat) => (
            <li key={stat.label} className="rounded-lg bg-surface px-1 py-2">
              <span className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                {stat.icon}
                {stat.label}
              </span>
              <span className="mt-0.5 block text-base font-extrabold tabular-nums">{stat.value.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        글 {XP_RULES.post}점 · 댓글 {XP_RULES.comment}점 · 추천 {XP_RULES.vote}점 · 오늘의 질문 답 {XP_RULES.answer}점
        (한 사람이 하루 최대 {XP_RULES.dailyCap}점)
      </p>
    </section>
  );
}
