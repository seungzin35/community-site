"use client";

import { useEffect, useState } from "react";

/** 다음 한국 시간 자정까지 남은 시간 */
function remaining() {
  const kstNow = Date.now() + 9 * 60 * 60 * 1000;
  const msLeft = 24 * 60 * 60 * 1000 - (kstNow % (24 * 60 * 60 * 1000));
  const minutes = Math.ceil(msLeft / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

export function Countdown({ className = "" }: { className?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setText(remaining());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className={className}>{text ? `마감까지 ${text}` : "오늘 밤 12시 마감"}</span>;
}
