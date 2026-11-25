"use client";

import { LogIn, RotateCcw, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { submitScore, type SubmitResult } from "@/app/games/actions";
import { formatRecord, type GameId } from "@/lib/games";

/**
 * 한 판이 끝나면 기록을 저장하고 결과를 보여 줍니다.
 * 같은 판을 두 번 저장하지 않도록 판 번호(round)가 바뀔 때만 보냅니다.
 */
export function ScoreResult({
  game,
  score,
  round,
  onRetry,
  title,
}: {
  game: GameId;
  score: number;
  round: number;
  onRetry: () => void;
  title?: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<SubmitResult | null>(null);
  const sent = useRef(0);
  // 게임하다 연타한 손가락이 바로 버튼을 누르지 않도록 잠깐 막아 둡니다.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setArmed(true), 700);
    return () => clearTimeout(id);
  }, [round]);

  useEffect(() => {
    if (sent.current === round) return;
    sent.current = round;
    setResult(null);
    submitScore(game, score)
      .then((res) => {
        setResult(res);
        if (res.ok) router.refresh();
      })
      .catch(() => setResult({ ok: false, error: "기록을 저장하지 못했어요." }));
  }, [game, score, round, router]);

  return (
    <div className={`flex flex-col items-center gap-2 text-center ${armed ? "" : "pointer-events-none"}`}>
      <p className="text-sm font-semibold text-muted-foreground">{title ?? "이번 기록"}</p>
      <p className="text-4xl font-black tracking-tight">{formatRecord(game, score)}</p>
      <div className="min-h-6 text-sm">
        {!result ? (
          <span className="text-muted-foreground">기록 저장 중…</span>
        ) : result.ok ? (
          result.isNewBest ? (
            <span className="inline-flex items-center gap-1 font-bold text-primary">
              <Trophy className="size-4" /> 내 최고 기록 갱신!
            </span>
          ) : (
            <span className="text-muted-foreground">내 최고 기록 {formatRecord(game, result.best)}</span>
          )
        ) : result.needLogin ? (
          <Link href={`/login?next=/games/${game}`} className="inline-flex items-center gap-1 font-semibold text-primary">
            <LogIn className="size-4" /> 로그인하면 순위표에 올라가요
          </Link>
        ) : (
          <span className="text-hot">{result.error}</span>
        )}
      </div>
      <button type="button" onClick={onRetry} className="btn btn-primary mt-1">
        <RotateCcw className="size-4" /> 다시 하기
      </button>
    </div>
  );
}
