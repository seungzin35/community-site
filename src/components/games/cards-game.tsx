"use client";

import { Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScoreResult } from "./score-result";

const FACES = ["🍓", "🍋", "🍇", "🍑", "🥝", "🍒", "🍉", "🍍"];

const clock = () => performance.now();

type Card = { id: number; face: string; matched: boolean };

function shuffled(): Card[] {
  const deck = [...FACES, ...FACES].map((face, id) => ({ id, face, matched: false }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** 짝꿍 카드: 같은 그림 8쌍을 빨리 찾기. 걸린 시간이 기록 */
export function CardsGame() {
  // 그림은 뒤집혔을 때만 그리므로, 서버와 브라우저가 다르게 섞어도 첫 화면은 같아요.
  const [deck, setDeck] = useState<Card[]>(shuffled);
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const lock = useRef(false);

  useEffect(() => {
    if (startedAt === null || result !== null) return;
    const id = setInterval(() => setNow(clock()), 100);
    return () => clearInterval(id);
  }, [startedAt, result]);

  function flip(index: number) {
    if (lock.current || result !== null) return;
    const card = deck[index];
    if (card.matched || open.includes(index)) return;
    const start = startedAt ?? clock();
    if (startedAt === null) {
      setStartedAt(start);
      setNow(start);
    }

    const next = [...open, index];
    setOpen(next);
    if (next.length < 2) return;

    setMoves((m) => m + 1);
    const [a, b] = next;
    if (deck[a].face === deck[b].face) {
      const updated = deck.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c));
      setDeck(updated);
      setOpen([]);
      if (updated.every((c) => c.matched)) {
        setResult(Math.round(clock() - start));
        setRound((r) => r + 1);
      }
    } else {
      lock.current = true;
      setTimeout(() => {
        setOpen([]);
        lock.current = false;
      }, 650);
    }
  }

  function retry() {
    setDeck(shuffled());
    setOpen([]);
    setMoves(0);
    setStartedAt(null);
    setResult(null);
  }

  const elapsed = result ?? (startedAt === null ? 0 : Math.max(0, now - startedAt));
  const matchedPairs = deck.filter((c) => c.matched).length / 2;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1 font-bold tabular-nums">
          <Timer className="size-4 text-primary" /> {(elapsed / 1000).toFixed(1)}초
        </span>
        <span className="text-muted-foreground tabular-nums">
          {matchedPairs}/{FACES.length}쌍 · {moves}번 뒤집음
        </span>
      </div>

      {result !== null ? (
        <div className="card p-6">
          <ScoreResult game="cards" score={result} round={round} onRetry={retry} title={`${moves}번 만에 다 찾았어요`} />
        </div>
      ) : (
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2 sm:gap-3">
          {deck.map((card, index) => {
            const shown = card.matched || open.includes(index);
            return (
              <button
                key={card.id}
                type="button"
                aria-label={shown ? card.face : "뒤집힌 카드"}
                onClick={() => flip(index)}
                className="aspect-square touch-manipulation [perspective:600px]"
              >
                <span
                  className={`relative block size-full transition-transform duration-300 [transform-style:preserve-3d] ${
                    shown ? "[transform:rotateY(180deg)]" : ""
                  }`}
                >
                  <span className="absolute inset-0 grid place-items-center rounded-xl bg-gradient-to-br from-[#8f8ff7] to-[#5b5bd6] text-2xl font-black text-white/80 shadow-sm [backface-visibility:hidden]">
                    ?
                  </span>
                  <span
                    className={`absolute inset-0 grid place-items-center rounded-xl border text-3xl [backface-visibility:hidden] [transform:rotateY(180deg)] sm:text-4xl ${
                      card.matched ? "border-primary/40 bg-primary-soft" : "border-border bg-surface"
                    }`}
                  >
                    {shown ? card.face : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
