"use client";

import "driver.js/dist/driver.css";
import { Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { type PageKind, pageKind, tips, tourSteps } from "./content";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { levelInfo, type MascotState } from "@/lib/mascot-level";
import { MASCOT_NAME, mascotSvgForLevel } from "./mascot";

/*
 * 안내 도우미 뭉치
 * 1) 마스코트: 화면 오른쪽 아래에 떠 있고, 처음 가 보는 페이지마다 말풍선으로 한마디 해 줍니다.
 * 2) 둘러보기: 말풍선의 '둘러보기'를 누르면 중요한 버튼을 하나씩 짚어 가며 설명합니다(driver.js, MIT).
 * '다시 보지 않기'를 누르면 숨고, 맨 아래 '뭉치 다시 부르기'로 되살릴 수 있어요.
 */

const OFF_KEY = "guide:off";
const SEEN_KEY = "guide:seen";
const CHANGE_EVENT = "guide:change";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** 뭉치를 숨겼는지 (서버에서는 "숨김"으로 보고 그리지 않습니다) */
function useGuideOff() {
  return useSyncExternalStore(
    subscribe,
    () => read(OFF_KEY) === "1",
    () => true,
  );
}

function seenPages(): PageKind[] {
  try {
    return JSON.parse(read(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

const LEVEL_KEY = "guide:level";

/** 커뮤니티 레벨 (모두가 함께 키우는 뭉치). 10분 동안은 저장해 둔 값을 씁니다. */
function useCommunityLevel() {
  const [level, setLevel] = useState(2);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    async function load() {
      try {
        const saved = JSON.parse(sessionStorage.getItem(LEVEL_KEY) ?? "null");
        if (saved && Date.now() - saved.at < 10 * 60 * 1000) return saved.level as number;
      } catch {}
      const { data } = await createClient().rpc("get_mascot_state");
      if (!data) return null;
      const next = levelInfo((data as MascotState).total_xp).level;
      try {
        sessionStorage.setItem(LEVEL_KEY, JSON.stringify({ level: next, at: Date.now() }));
      } catch {}
      return next;
    }
    load().then((next) => {
      if (!cancelled && next) setLevel(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return level;
}

export function MascotImage({ level, className = "" }: { level: number; className?: string }) {
  return <span className={`block ${className}`} dangerouslySetInnerHTML={{ __html: mascotSvgForLevel(level) }} />;
}

export function Guide() {
  const pathname = usePathname();
  const off = useGuideOff();
  const level = useCommunityLevel();
  const [bubble, setBubble] = useState<{ kind: PageKind; steps: number } | null>(null);
  const [touring, setTouring] = useState(false);

  const openBubble = useCallback(() => {
    const kind = pageKind(window.location.pathname);
    setBubble({ kind, steps: tourSteps(kind).length });
    const seen = seenPages();
    if (!seen.includes(kind)) write(SEEN_KEY, JSON.stringify([...seen, kind]));
  }, []);

  // 처음 가 보는 종류의 페이지면 잠깐 뒤에 말풍선을 띄웁니다.
  useEffect(() => {
    if (off) return;
    const timer = window.setTimeout(() => {
      if (!seenPages().includes(pageKind(window.location.pathname))) openBubble();
      else setBubble(null);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [pathname, off, openBubble]);

  async function startTour() {
    if (!bubble) return;
    const steps = tourSteps(bubble.kind);
    if (!steps.length) return;
    setBubble(null);
    setTouring(true);
    const { driver } = await import("driver.js");
    const tour = driver({
      steps,
      showProgress: true,
      progressText: "{{current}} / {{total}}",
      nextBtnText: "다음",
      prevBtnText: "이전",
      doneBtnText: "끝!",
      closeBtnLabel: "닫기",
      popoverClass: "guide-popover",
      stagePadding: 6,
      stageRadius: 12,
      overlayOpacity: 0.55,
      // 위에 붙어 있는 헤더에 가리지 않도록 짚을 곳을 화면 가운데로 옮깁니다.
      onHighlightStarted: (element) => element?.scrollIntoView({ block: "center", behavior: "instant" }),
      onPopoverRender: (popover) => {
        const face = document.createElement("span");
        face.className = "guide-popover-face";
        face.innerHTML = mascotSvgForLevel(level);
        popover.title.prepend(face);
      },
      onDestroyed: () => setTouring(false),
    });
    tour.drive();
  }

  if (off) return null;

  return (
    <div className="guide-root pointer-events-none fixed bottom-3 right-3 z-40 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {bubble && !touring && (
        <div
          role="dialog"
          aria-label={`${MASCOT_NAME}의 안내`}
          className="guide-bubble card pointer-events-auto relative w-[min(20rem,calc(100vw-2rem))] p-4 shadow-xl shadow-black/10"
        >
          <button
            type="button"
            onClick={() => setBubble(null)}
            aria-label="말풍선 닫기"
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <p className="text-xs font-bold text-primary">{MASCOT_NAME}</p>
          <p className="mt-1 pr-4 text-sm leading-relaxed">{tips[bubble.kind]}</p>
          <div className="mt-3 flex items-center gap-2">
            {bubble.steps > 0 && (
              <button type="button" onClick={startTour} className="btn btn-primary px-3 py-1.5 text-xs">
                <Sparkles className="size-3.5" /> 둘러보기
              </button>
            )}
            <button type="button" onClick={() => setBubble(null)} className="btn btn-outline px-3 py-1.5 text-xs">
              알겠어요
            </button>
            <button
              type="button"
              onClick={() => {
                setBubble(null);
                write(OFF_KEY, "1");
              }}
              className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              다시 보지 않기
            </button>
          </div>
          <span className="absolute -bottom-1.5 right-7 size-3 rotate-45 border-b border-r border-border bg-surface" />
        </div>
      )}
      <button
        type="button"
        onClick={() => (bubble ? setBubble(null) : openBubble())}
        aria-label={`안내 도우미 ${MASCOT_NAME}${bubble ? " 말풍선 닫기" : "에게 물어보기"}`}
        title={`${MASCOT_NAME}에게 물어보기`}
        className="guide-mascot pointer-events-auto size-12 drop-shadow-lg transition-transform hover:scale-110 active:scale-95 sm:size-[72px]"
      >
        <MascotImage level={level} className="size-full" />
      </button>
    </div>
  );
}

/** 숨겨 둔 뭉치를 다시 불러오는 버튼 (맨 아래) */
export function GuideRestart() {
  const off = useGuideOff();
  if (!off) return null;
  return (
    <button
      type="button"
      onClick={() => {
        write(OFF_KEY, null);
        write(SEEN_KEY, null);
      }}
      className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
    >
      안내 도우미 {MASCOT_NAME} 다시 부르기
    </button>
  );
}
