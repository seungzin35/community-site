"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mascotSvgForLevel } from "@/components/guide/mascot";
import { ScoreResult } from "./score-result";

const W = 360;
const H = 540;
const GROUND = H - 40;
const PX = 100;
const HIT_R = 15;
const GRAVITY = 1250;
const LIFT = -410;
const SPEED = 150;
const SPACING = 210;
const COL_W = 58;

type Column = { x: number; gapY: number; gap: number; passed: boolean };
type World = { y: number; vy: number; columns: Column[]; score: number; time: number; scroll: number };

function freshWorld(): World {
  return { y: H * 0.42, vy: 0, columns: [], score: 0, time: 0, scroll: 0 };
}

/** 풍선 뭉치: 누를 때마다 떠올라 가시 구름 사이 빈틈을 지나가요 */
export function BalloonGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(freshWorld());
  const phaseRef = useRef<"ready" | "playing" | "over">("ready");
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [final, setFinal] = useState(0);
  const [round, setRound] = useState(0);
  const scale = useRef(1);
  const mascot = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mascotSvgForLevel(2))}`;
    img.onload = () => (mascot.current = img);
  }, []);

  const flap = useCallback(() => {
    if (phaseRef.current === "over") return;
    if (phaseRef.current === "ready") {
      world.current = freshWorld();
      phaseRef.current = "playing";
      setPhase("playing");
    }
    world.current.vy = LIFT;
  }, []);

  const retry = useCallback(() => {
    world.current = freshWorld();
    phaseRef.current = "ready";
    setPhase("ready");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round((canvas.clientWidth * H * dpr) / W);
      scale.current = canvas.width / W;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.code !== "Space" && e.code !== "ArrowUp") || phaseRef.current === "over") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)) return;
      e.preventDefault();
      if (!e.repeat) flap();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [flap]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const step = (dt: number) => {
      const w = world.current;
      w.time += dt;
      w.vy = Math.min(520, w.vy + GRAVITY * dt);
      w.y += w.vy * dt;
      const dx = SPEED * dt;
      w.scroll += dx;
      for (const c of w.columns) c.x -= dx;
      w.columns = w.columns.filter((c) => c.x + COL_W > -20);
      const lastCol = w.columns[w.columns.length - 1];
      if (!lastCol || lastCol.x < W - SPACING) {
        const gap = Math.max(150, 195 - w.score * 2);
        const margin = 50;
        w.columns.push({ x: W + 10, gap, gapY: margin + Math.random() * (GROUND - margin * 2 - gap), passed: false });
      }
      // 천장에는 살짝 부딪히기만 하고, 땅에 닿으면 끝
      if (w.y - HIT_R < 0) {
        w.y = HIT_R;
        w.vy = Math.max(0, w.vy);
      }
      if (w.y + HIT_R > GROUND) return false;
      for (const c of w.columns) {
        if (!c.passed && c.x + COL_W < PX - HIT_R) {
          c.passed = true;
          w.score += 1;
        }
        // 원과 사각형이 닿는지
        const hits = (top: number, bottom: number) => {
          const cx = Math.max(c.x, Math.min(PX, c.x + COL_W));
          const cy = Math.max(top, Math.min(w.y, bottom));
          return Math.hypot(PX - cx, w.y - cy) < HIT_R;
        };
        // 가시 끝까지 닿은 것으로 봐요
        if (hits(-100, c.gapY + 12) || hits(c.gapY + c.gap - 12, GROUND)) return false;
      }
      return true;
    };

    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const w = world.current;
      const dark = document.documentElement.classList.contains("dark");
      ctx.setTransform(scale.current, 0, 0, scale.current, 0, 0);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, dark ? "#16163a" : "#cfe8ff");
      sky.addColorStop(1, dark ? "#2a2550" : "#fde7f3");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // 먼 언덕
      ctx.fillStyle = dark ? "#24244a" : "#e0d9ff";
      for (let i = -1; i < 4; i++) {
        const x = i * 160 - (w.scroll * 0.25) % 160;
        ctx.beginPath();
        ctx.ellipse(x + 80, GROUND, 110, 60, 0, Math.PI, 0);
        ctx.fill();
      }

      for (const c of w.columns) {
        spikeCloud(ctx, c.x, -10, COL_W, c.gapY + 10, true, dark);
        spikeCloud(ctx, c.x, c.gapY + c.gap, COL_W, GROUND - (c.gapY + c.gap), false, dark);
      }

      ctx.fillStyle = dark ? "#2f2f55" : "#c9cbf7";
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = dark ? "#4b4b85" : "#9d9fe8";
      ctx.fillRect(0, GROUND, W, 2);

      // 풍선과 뭉치
      const tilt = Math.max(-0.35, Math.min(0.5, w.vy / 900));
      ctx.save();
      ctx.translate(PX, w.y);
      ctx.strokeStyle = dark ? "#d4d4d8" : "#52525b";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.quadraticCurveTo(-6, -26, -2, -36);
      ctx.stroke();
      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.ellipse(-2, -50, 13, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.ellipse(-7, -56, 3, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(tilt);
      if (mascot.current) ctx.drawImage(mascot.current, -22, -22, 44, 44);
      ctx.restore();

      ctx.fillStyle = dark ? "#ececef" : "#18181b";
      ctx.font = "900 36px Pretendard, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(w.score), W / 2, 60);
    };

    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      if (phaseRef.current === "playing" && !step(dt)) {
        phaseRef.current = "over";
        setPhase("over");
        setFinal(world.current.score);
        setRound((r) => r + 1);
      } else if (phaseRef.current === "ready") {
        world.current.y = H * 0.42 + Math.sin(t / 300) * 8;
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="mx-auto max-w-sm space-y-3">
      <div
        className="relative touch-none select-none overflow-hidden rounded-2xl border border-border"
        onPointerDown={(e) => {
          if (phaseRef.current === "over") return;
          e.preventDefault();
          flap();
        }}
      >
        <canvas ref={canvasRef} className="block aspect-[2/3] w-full" aria-label="풍선 뭉치 게임 화면" />
        {phase === "ready" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-1/4 grid place-items-center">
            <span className="rounded-full bg-surface/95 px-4 py-2 text-sm font-bold shadow">눌러서 둥실!</span>
          </div>
        )}
        {phase === "over" && (
          <div className="absolute inset-0 grid place-items-center bg-background/75 p-4 backdrop-blur-[2px]">
            <ScoreResult game="balloon" score={final} round={round} onRetry={retry} title="펑! 이번 점수" />
          </div>
        )}
      </div>
    </div>
  );
}

/** 가시 달린 구름 기둥 */
function spikeCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: boolean, dark: boolean) {
  if (h <= 0) return;
  ctx.fillStyle = dark ? "#4a4a7a" : "#ffffff";
  ctx.strokeStyle = dark ? "#6b6ba8" : "#c4c7f5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  // 끝부분 뭉게뭉게
  const edge = top ? y + h : y;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) ctx.arc(x + 10 + i * 19, edge, 12, 0, Math.PI * 2);
  ctx.fill();
  // 가시
  ctx.fillStyle = "#8e4ec6";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const sx = x + 4 + i * 14;
    if (top) {
      ctx.moveTo(sx, edge + 8);
      ctx.lineTo(sx + 7, edge + 18);
      ctx.lineTo(sx + 14, edge + 8);
    } else {
      ctx.moveTo(sx, edge - 8);
      ctx.lineTo(sx + 7, edge - 18);
      ctx.lineTo(sx + 14, edge - 8);
    }
  }
  ctx.fill();
}
