"use client";

import { Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScoreResult } from "./score-result";

const ROUNDS = 5;

type Phase = "idle" | "waiting" | "go" | "early" | "round" | "done";

/** 번개 반응: 초록색으로 바뀌는 순간 누르기. 5번 평균이 기록 */
export function ReflexGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [game, setGame] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goAt = useRef(0);

  useEffect(() => () => clearTimer(), []);

  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function arm() {
    clearTimer();
    setPhase("waiting");
    timer.current = setTimeout(() => {
      goAt.current = performance.now();
      setPhase("go");
    }, 1200 + Math.random() * 2800);
  }

  function press() {
    if (phase === "idle" || phase === "early" || phase === "round") {
      arm();
    } else if (phase === "waiting") {
      clearTimer();
      setPhase("early");
    } else if (phase === "go") {
      const ms = Math.round(performance.now() - goAt.current);
      // 100ms 보다 빠르면 미리 누른 것으로 봅니다.
      if (ms < 100) {
        setPhase("early");
        return;
      }
      const next = [...times, ms];
      setTimes(next);
      if (next.length >= ROUNDS) {
        setGame((g) => g + 1);
        setPhase("done");
      } else {
        setPhase("round");
      }
    }
  }

  function retry() {
    setTimes([]);
    setPhase("idle");
  }

  const average = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const last = times[times.length - 1];

  if (phase === "done") {
    return (
      <div className="card p-6">
        <ScoreResult game="reflex" score={average} round={game} onRetry={retry} title="5번 평균 반응속도" />
        <ol className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          {times.map((t, i) => (
            <li key={i} className="rounded-full bg-muted px-2.5 py-1">
              {i + 1}회 {t}ms
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const look: Record<Exclude<Phase, "done">, { bg: string; title: string; sub: string }> = {
    idle: { bg: "bg-primary", title: "눌러서 시작", sub: `빨간 화면이 초록색이 되면 바로 누르세요. 모두 ${ROUNDS}번 재요.` },
    waiting: { bg: "bg-[#e5484d]", title: "기다려요…", sub: "초록색이 되면 누르세요" },
    go: { bg: "bg-[#30a46c]", title: "지금!", sub: "누르세요!" },
    early: { bg: "bg-[#f76b15]", title: "너무 빨라요!", sub: "초록색이 된 다음에 눌러 주세요. 눌러서 다시" },
    round: { bg: "bg-primary", title: `${last}ms`, sub: `${times.length}/${ROUNDS}회 · 눌러서 다음` },
  };
  const view = look[phase];

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        press();
      }}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!e.repeat) press();
        }
      }}
      className={`${view.bg} flex aspect-[4/3] w-full touch-manipulation select-none flex-col items-center justify-center gap-2 rounded-2xl px-6 text-center text-white shadow-lg transition-colors duration-75 sm:aspect-[16/9]`}
    >
      <Zap className="size-10" />
      <span className="text-3xl font-black tracking-tight sm:text-4xl">{view.title}</span>
      <span className="text-sm text-white/85">{view.sub}</span>
      {times.length > 0 && phase !== "round" && (
        <span className="mt-2 text-xs text-white/75">
          {times.length}/{ROUNDS}회 완료
        </span>
      )}
    </button>
  );
}
