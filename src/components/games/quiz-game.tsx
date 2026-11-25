"use client";

import { Check, Copy, Lightbulb, LogIn, Send, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guessQuiz } from "@/app/games/actions";
import type { QuizGuess, QuizToday } from "@/lib/games";

const MAX_TRIES = 6;
const tone = ["bg-muted-foreground/70 text-white", "bg-[#f5a524] text-white", "bg-[#30a46c] text-white"];
const emoji = ["⬜", "🟨", "🟩"];

/** 오늘의 초성 퀴즈: 초성과 힌트를 보고 6번 안에 단어 맞히기 */
export function QuizGame({ initial, loggedIn }: { initial: QuizToday; loggedIn: boolean }) {
  const router = useRouter();
  const [guesses, setGuesses] = useState<QuizGuess[]>(initial.guesses);
  const [solved, setSolved] = useState(initial.solved);
  const [answer, setAnswer] = useState<string | null>(initial.answer);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const done = solved || guesses.length >= MAX_TRIES;
  const letters = [...initial.chosung];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const word = input.replace(/\s/g, "");
    if (!word || pending || done) return;
    if ([...word].length !== initial.length) {
      setError(`${initial.length}글자로 써 주세요.`);
      return;
    }
    startTransition(async () => {
      const res = await guessQuiz(word, guesses.length + 1);
      if (res.error !== undefined) {
        setError(res.error);
        return;
      }
      setError("");
      setInput("");
      setGuesses((g) => [...g, { word: res.word, marks: res.marks }]);
      setSolved(res.solved);
      if (res.answer) setAnswer(res.answer);
      if (loggedIn && (res.solved || res.answer)) router.refresh();
    });
  }

  async function share() {
    const [, m, d] = initial.day.split("-");
    const lines = guesses.map((g) => g.marks.map((k) => emoji[k]).join(""));
    const text = `뭉치네 초성 퀴즈 ${Number(m)}/${Number(d)} ${solved ? guesses.length : "X"}/${MAX_TRIES}\n${lines.join("\n")}\n${location.origin}/games/quiz`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("복사하지 못했어요.");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card space-y-3 p-5 text-center">
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-bold text-primary">{initial.category}</span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" /> 오늘 {initial.solvers.toLocaleString()}명이 맞혔어요
          </span>
        </p>
        <div className="flex justify-center gap-2">
          {letters.map((ch, i) => (
            <span key={i} className="grid size-14 place-items-center rounded-2xl bg-primary text-3xl font-black text-primary-foreground shadow-sm">
              {ch}
            </span>
          ))}
        </div>
        <p className="inline-flex items-center gap-1.5 text-sm">
          <Lightbulb className="size-4 text-[#e8a317]" /> {initial.hint}
        </p>
      </div>

      <div className="space-y-1.5">
        {Array.from({ length: MAX_TRIES }, (_, row) => {
          const g = guesses[row];
          const chars = g ? [...g.word] : [];
          return (
            <div key={row} className="flex justify-center gap-1.5">
              {Array.from({ length: initial.length }, (_, i) => (
                <span
                  key={i}
                  className={`grid size-12 place-items-center rounded-xl text-xl font-extrabold ${
                    g ? tone[g.marks[i]] : "border-2 border-dashed border-border"
                  }`}
                >
                  {chars[i] ?? ""}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {done ? (
        <div className="card space-y-3 p-5 text-center">
          <p className="text-lg font-extrabold">{solved ? `${guesses.length}번 만에 맞혔어요! 🎉` : "아쉬워요! 내일 다시 도전해요"}</p>
          {answer && (
            <p className="text-sm text-muted-foreground">
              정답은 <b className="text-foreground">{answer}</b>
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={share} className="btn btn-primary">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "복사했어요" : "결과 복사해서 자랑하기"}
            </button>
          </div>
          {!loggedIn && (
            <Link href="/login?next=/games/quiz" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              <LogIn className="size-4" /> 로그인하면 맞힌 날이 순위표에 쌓여요
            </Link>
          )}
          <p className="text-xs text-muted-foreground">새 문제는 밤 12시에 열려요.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="field text-center text-lg font-bold"
            placeholder={`${initial.chosung} (${initial.length}글자)`}
            maxLength={initial.length + 2}
            autoComplete="off"
            enterKeyHint="send"
            aria-label="정답 입력"
          />
          <button type="submit" className="btn btn-primary shrink-0" disabled={pending}>
            <Send className="size-4" /> {pending ? "채점 중" : "확인"}
          </button>
        </form>
      )}
      {error && <p className="text-center text-sm text-hot">{error}</p>}
      <p className="flex justify-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded bg-[#30a46c]" /> 자리까지 맞음
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded bg-[#f5a524]" /> 다른 자리에 있음
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded bg-muted-foreground/70" /> 없음
        </span>
      </p>
      {!loggedIn && !done && <p className="text-center text-xs text-muted-foreground">로그인 안 하면 새로고침할 때 처음부터 다시 해요.</p>}
    </div>
  );
}
