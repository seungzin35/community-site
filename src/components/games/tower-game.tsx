"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mascotSvgForLevel } from "@/components/guide/mascot";
import { ScoreResult } from "./score-result";

const W = 360;
const H = 540;
const BLOCK_H = 28;
const BASE_W = 190;
const PERFECT = 5;

type Block = { x: number; w: number; floor: number };
type Piece = { x: number; y: number; w: number; vy: number; vx: number; floor: number; rot: number };

type World = {
  stack: Block[];
  moving: Block & { dir: number };
  falling: Piece[];
  camera: number;
  speed: number;
  combo: number;
  flash: number;
};

const colorOf = (floor: number) => `hsl(${(245 + floor * 9) % 360} 75% 68%)`;
const yOf = (floor: number) => H - 40 - (floor + 1) * BLOCK_H;

function freshWorld(): World {
  return {
    stack: [{ x: (W - BASE_W) / 2, w: BASE_W, floor: 0 }],
    moving: { x: -BASE_W, w: BASE_W, floor: 1, dir: 1 },
    falling: [],
    camera: 0,
    speed: 150,
    combo: 0,
    flash: 0,
  };
}

/** 뭉치 탑 쌓기: 움직이는 블록을 눌러 쌓기. 삐져나온 만큼 잘려요 */
export function TowerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(freshWorld());
  const phaseRef = useRef<"ready" | "playing" | "over">("ready");
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [floors, setFloors] = useState(0);
  const [round, setRound] = useState(0);
  const scale = useRef(1);
  const mascot = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mascotSvgForLevel(6))}`;
    img.onload = () => (mascot.current = img);
  }, []);

  const place = useCallback(() => {
    if (phaseRef.current === "ready") {
      phaseRef.current = "playing";
      setPhase("playing");
      return;
    }
    if (phaseRef.current !== "playing") return;
    const w = world.current;
    const top = w.stack[w.stack.length - 1];
    const m = w.moving;
    let left = Math.max(m.x, top.x);
    let right = Math.min(m.x + m.w, top.x + top.w);

    if (right - left <= 0) {
      // 완전히 빗나감
      w.falling.push({ x: m.x, y: yOf(m.floor), w: m.w, vy: 0, vx: m.dir * 40, floor: m.floor, rot: 0 });
      phaseRef.current = "over";
      setPhase("over");
      setRound((r) => r + 1);
      return;
    }

    if (Math.abs(m.x - top.x) <= PERFECT) {
      left = top.x;
      right = top.x + top.w;
      w.combo += 1;
      w.flash = 1;
    } else {
      w.combo = 0;
      // 잘려 나간 조각
      if (m.x < top.x) {
        w.falling.push({ x: m.x, y: yOf(m.floor), w: top.x - m.x, vy: 0, vx: -30, floor: m.floor, rot: 0 });
      } else {
        w.falling.push({ x: right, y: yOf(m.floor), w: m.x + m.w - right, vy: 0, vx: 30, floor: m.floor, rot: 0 });
      }
    }
    let width = right - left;
    // 연속으로 딱 맞추면 조금씩 넓어져요
    if (w.combo >= 3 && width < BASE_W) {
      const grow = Math.min(8, BASE_W - width);
      left -= grow / 2;
      width += grow;
    }
    w.stack.push({ x: left, w: width, floor: m.floor });
    const floor = m.floor;
    setFloors(floor);
    w.speed = Math.min(420, 150 + floor * 7);
    const fromLeft = floor % 2 === 0;
    w.moving = { x: fromLeft ? -width : W, w: width, floor: floor + 1, dir: fromLeft ? 1 : -1 };
  }, []);

  const retry = useCallback(() => {
    world.current = freshWorld();
    setFloors(0);
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
      if (e.code !== "Space" || phaseRef.current === "over") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)) return;
      e.preventDefault();
      if (!e.repeat) place();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [place]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      const w = world.current;

      if (phaseRef.current === "playing") {
        const m = w.moving;
        m.x += m.dir * w.speed * dt;
        if (m.x + m.w > W + 30) m.dir = -1;
        if (m.x < -30) m.dir = 1;
      }
      for (const p of w.falling) {
        p.vy += 1600 * dt;
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        p.rot += p.vx * 0.0006;
      }
      w.falling = w.falling.filter((p) => p.y - w.camera < H + 200);
      w.flash = Math.max(0, w.flash - dt * 3);
      // 탑이 높아지면 화면이 따라 올라가요
      const topY = yOf(w.stack[w.stack.length - 1].floor);
      const target = Math.min(0, topY - H * 0.45);
      w.camera += (target - w.camera) * Math.min(1, dt * 5);

      draw(w);
      raf = requestAnimationFrame(loop);
    };

    const draw = (w: World) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const dark = document.documentElement.classList.contains("dark");
      ctx.setTransform(scale.current, 0, 0, scale.current, 0, 0);
      const height = -w.camera;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      const k = Math.min(1, height / 1500);
      sky.addColorStop(0, dark ? "#141430" : mix("#dfe3ff", "#c7d2fe", k));
      sky.addColorStop(1, dark ? "#262650" : "#fdf4ff");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // 별 (높이 올라가면)
      if (height > 400 || dark) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        for (let i = 0; i < 24; i++) {
          const sx = (i * 97) % W;
          const sy = ((i * 53 - w.camera * 0.2) % H + H) % H;
          ctx.fillRect(sx, sy, 2, 2);
        }
      }

      ctx.save();
      ctx.translate(0, -w.camera);
      // 땅
      ctx.fillStyle = dark ? "#2f2f55" : "#c9cbf7";
      ctx.fillRect(0, H - 40, W, 400);

      for (const b of w.stack) block(ctx, b.x, yOf(b.floor), b.w, colorOf(b.floor));
      if (phaseRef.current !== "over") {
        const m = w.moving;
        block(ctx, m.x, yOf(m.floor), m.w, colorOf(m.floor));
      }
      for (const p of w.falling) {
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + BLOCK_H / 2);
        ctx.rotate(p.rot);
        block(ctx, -p.w / 2, -BLOCK_H / 2, p.w, colorOf(p.floor));
        ctx.restore();
      }
      // 꼭대기에 앉은 뭉치
      const top = w.stack[w.stack.length - 1];
      if (mascot.current) ctx.drawImage(mascot.current, top.x + top.w / 2 - 20, yOf(top.floor) - 38, 40, 40);
      if (w.flash > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${w.flash})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(top.x - 3, yOf(top.floor) - 3, top.w + 6, BLOCK_H + 6);
      }
      ctx.restore();

      ctx.fillStyle = dark ? "#ececef" : "#18181b";
      ctx.font = "900 34px Pretendard, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(w.stack.length - 1), W / 2, 56);
      if (w.combo >= 2) {
        ctx.font = "700 14px Pretendard, system-ui, sans-serif";
        ctx.fillStyle = "#e8a317";
        ctx.fillText(`딱 맞춤 ${w.combo}연속!`, W / 2, 80);
      }
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
          place();
        }}
      >
        <canvas ref={canvasRef} className="block aspect-[2/3] w-full" aria-label="뭉치 탑 쌓기 게임 화면" />
        {phase === "ready" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-1/3 grid place-items-center">
            <span className="rounded-full bg-surface/95 px-4 py-2 text-sm font-bold shadow">눌러서 시작</span>
          </div>
        )}
        {phase === "over" && (
          <div className="absolute inset-0 grid place-items-center bg-background/75 p-4 backdrop-blur-[2px]">
            <ScoreResult game="tower" score={floors} round={round} onRetry={retry} title="와르르! 이번 기록" />
          </div>
        )}
      </div>
    </div>
  );
}

function block(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, BLOCK_H - 2, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(x + 4, y + 3, Math.max(0, w - 8), 4);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(x, y + BLOCK_H - 8, w, 6);
}

function mix(a: string, b: string, k: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}
