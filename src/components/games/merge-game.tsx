"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScoreResult } from "./score-result";

// 게임 안 좌표
const W = 360;
const H = 540;
const LINE = 96; // 이 선 위로 넘치면 끝
const DROP_Y = 46;
const GRAVITY = 1500;
const RADII = [15, 20, 26, 33, 40, 48, 57, 67, 78, 90, 104];
const COLORS = ["#a5b4fc", "#f9a8d4", "#fcd34d", "#86efac", "#7dd3fc", "#c4b5fd", "#fdba74", "#f87171", "#5eead4", "#818cf8", "#fbbf24"];
const POINTS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];
const MAX = RADII.length - 1;

type Body = { id: number; x: number; y: number; vx: number; vy: number; level: number; born: number; dead?: boolean };

type World = {
  bodies: Body[];
  score: number;
  current: number;
  next: number;
  aimX: number;
  cooldown: number;
  overTimer: number;
  time: number;
  nextId: number;
  best: number; // 가장 크게 만든 단계
  pops: { x: number; y: number; r: number; t: number }[];
};

const randomLevel = () => Math.floor(Math.random() * 5);

function freshWorld(): World {
  return {
    bodies: [],
    score: 0,
    // 첫 두 개는 정해 두어서 서버 화면과 맞춰요
    current: 0,
    next: 1,
    aimX: W / 2,
    cooldown: 0,
    overTimer: 0,
    time: 0,
    nextId: 1,
    best: 0,
    pops: [],
  };
}

/** 뭉치 합치기: 같은 단계끼리 부딪히면 합쳐져 한 단계 커지는 물리 퍼즐 */
export function MergeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(freshWorld());
  const phaseRef = useRef<"playing" | "over">("playing");
  const [phase, setPhase] = useState<"playing" | "over">("playing");
  const [hud, setHud] = useState({ score: 0, next: 1 });
  const [round, setRound] = useState(0);
  const [final, setFinal] = useState(0);
  const scale = useRef(1);

  const toGame = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return W / 2;
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * W;
  };

  const aim = useCallback((x: number) => {
    const w = world.current;
    const r = RADII[w.current];
    w.aimX = Math.max(r + 2, Math.min(W - r - 2, x));
  }, []);

  const drop = useCallback(() => {
    const w = world.current;
    if (phaseRef.current !== "playing" || w.cooldown > 0) return;
    w.bodies.push({ id: w.nextId++, x: w.aimX, y: DROP_Y, vx: 0, vy: 0, level: w.current, born: w.time });
    w.current = w.next;
    w.next = randomLevel();
    w.cooldown = 0.5;
    aim(w.aimX);
    setHud({ score: w.score, next: w.next });
  }, [aim]);

  const retry = useCallback(() => {
    world.current = freshWorld();
    phaseRef.current = "playing";
    setPhase("playing");
    setHud({ score: 0, next: 1 });
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
      if (phaseRef.current !== "playing") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.code === "ArrowLeft") aim(world.current.aimX - 16);
      else if (e.code === "ArrowRight") aim(world.current.aimX + 16);
      else if (e.code === "Space" || e.code === "ArrowDown") {
        if (!e.repeat) drop();
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [aim, drop]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const physics = (dt: number) => {
      const w = world.current;
      const bodies = w.bodies;
      for (const b of bodies) {
        b.vy += GRAVITY * dt;
        b.vx *= 0.995;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      let scored = false;
      for (let iter = 0; iter < 4; iter++) {
        for (let i = 0; i < bodies.length; i++) {
          const a = bodies[i];
          if (a.dead) continue;
          for (let j = i + 1; j < bodies.length; j++) {
            const b = bodies[j];
            if (b.dead) continue;
            const ra = RADII[a.level];
            const rb = RADII[b.level];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            const overlap = ra + rb - dist;
            if (overlap <= 0) continue;
            if (a.level === b.level) {
              a.dead = true;
              b.dead = true;
              const level = a.level;
              w.pops.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, r: RADII[level], t: 0 });
              if (level === MAX) {
                w.score += 100;
              } else {
                const nl = level + 1;
                w.score += POINTS[nl];
                w.best = Math.max(w.best, nl);
                bodies.push({
                  id: w.nextId++,
                  x: (a.x + b.x) / 2,
                  y: (a.y + b.y) / 2,
                  vx: (a.vx + b.vx) / 2,
                  vy: Math.min(0, (a.vy + b.vy) / 2),
                  level: nl,
                  born: w.time,
                });
              }
              scored = true;
              break;
            }
            const nx = dx / dist;
            const ny = dy / dist;
            const ma = ra * ra;
            const mb = rb * rb;
            const total = ma + mb;
            a.x -= nx * overlap * (mb / total);
            a.y -= ny * overlap * (mb / total);
            b.x += nx * overlap * (ma / total);
            b.y += ny * overlap * (ma / total);
            const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rel < 0) {
              const impulse = (-(1 + 0.15) * rel) / (1 / ma + 1 / mb);
              a.vx -= (impulse / ma) * nx;
              a.vy -= (impulse / ma) * ny;
              b.vx += (impulse / mb) * nx;
              b.vy += (impulse / mb) * ny;
              // 굴러가며 조금씩 멈추도록 마찰
              const tx = -ny;
              const ty = nx;
              const slide = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
              const f = slide * 0.08;
              a.vx += (f * tx * mb) / total;
              a.vy += (f * ty * mb) / total;
              b.vx -= (f * tx * ma) / total;
              b.vy -= (f * ty * ma) / total;
            }
          }
        }
        if (scored) w.bodies = w.bodies.filter((b) => !b.dead);
        for (const b of w.bodies) {
          const r = RADII[b.level];
          if (b.x < r) {
            b.x = r;
            b.vx = Math.abs(b.vx) * 0.2;
          } else if (b.x > W - r) {
            b.x = W - r;
            b.vx = -Math.abs(b.vx) * 0.2;
          }
          if (b.y > H - r) {
            b.y = H - r;
            if (b.vy > 0) b.vy = -b.vy * 0.1;
            b.vx *= 0.96;
          }
        }
      }
      return scored;
    };

    const step = (dt: number) => {
      const w = world.current;
      w.time += dt;
      w.cooldown = Math.max(0, w.cooldown - dt);
      let scored = false;
      const sub = 4;
      for (let i = 0; i < sub; i++) scored = physics(dt / sub) || scored;
      w.pops = w.pops.filter((p) => (p.t += dt) < 0.35);
      if (scored) setHud({ score: w.score, next: w.next });

      // 1초 넘게 선 위에 머물면 끝
      const over = w.bodies.some((b) => w.time - b.born > 1 && b.y - RADII[b.level] < LINE && Math.abs(b.vy) < 60);
      w.overTimer = over ? w.overTimer + dt : 0;
      return w.overTimer < 1.2;
    };

    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const w = world.current;
      const dark = document.documentElement.classList.contains("dark");
      ctx.setTransform(scale.current, 0, 0, scale.current, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, dark ? "#1b1b3a" : "#f3f0ff");
      bg.addColorStop(1, dark ? "#23233f" : "#fff7ed");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // 넘치면 안 되는 선
      const warn = w.overTimer > 0;
      ctx.strokeStyle = warn ? "#e5484d" : dark ? "rgba(255,99,105,0.45)" : "rgba(229,72,77,0.4)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, LINE);
      ctx.lineTo(W, LINE);
      ctx.stroke();
      ctx.setLineDash([]);

      // 떨어뜨릴 자리 안내
      if (phaseRef.current === "playing") {
        const r = RADII[w.current];
        ctx.strokeStyle = dark ? "rgba(255,255,255,0.15)" : "rgba(91,91,214,0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w.aimX, DROP_Y + r);
        ctx.lineTo(w.aimX, H);
        ctx.stroke();
        ctx.globalAlpha = w.cooldown > 0 ? 0.4 : 1;
        drawBlob(ctx, w.aimX, DROP_Y, w.current);
        ctx.globalAlpha = 1;
      }

      for (const b of w.bodies) drawBlob(ctx, b.x, b.y, b.level);

      for (const p of w.pops) {
        const k = p.t / 0.35;
        ctx.strokeStyle = `rgba(251,191,36,${1 - k})`;
        ctx.lineWidth = 4 * (1 - k);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + k * 0.8), 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      if (phaseRef.current === "playing" && !step(dt)) {
        phaseRef.current = "over";
        setPhase("over");
        setFinal(world.current.score);
        setRound((r) => r + 1);
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="mx-auto max-w-sm space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-extrabold tabular-nums">{hud.score.toLocaleString()}점</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          다음
          <span className="size-6 rounded-full" style={{ background: COLORS[hud.next] }} />
        </span>
      </div>
      <div
        className="relative touch-none select-none overflow-hidden rounded-2xl border border-border"
        onPointerDown={(e) => {
          if (phaseRef.current !== "playing") return;
          e.preventDefault();
          aim(toGame(e.clientX));
        }}
        onPointerMove={(e) => {
          if (phaseRef.current !== "playing") return;
          if (e.pointerType === "mouse" || e.buttons) aim(toGame(e.clientX));
        }}
        onPointerUp={(e) => {
          if (phaseRef.current !== "playing") return;
          aim(toGame(e.clientX));
          drop();
        }}
      >
        <canvas ref={canvasRef} className="block aspect-[2/3] w-full" aria-label="뭉치 합치기 게임 화면" />
        {phase === "over" && (
          <div className="absolute inset-0 grid place-items-center bg-background/75 p-4 backdrop-blur-[2px]">
            <ScoreResult game="merge" score={final} round={round} onRetry={retry} title="넘쳤어요! 이번 점수" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1" aria-label="뭉치 단계">
        {COLORS.map((color, i) => (
          <span
            key={color}
            className="rounded-full"
            style={{ background: color, width: 10 + i * 1.6, height: 10 + i * 1.6 }}
            title={`${i + 1}단계`}
          />
        ))}
      </div>
    </div>
  );
}

function drawBlob(ctx: CanvasRenderingContext2D, x: number, y: number, level: number) {
  const r = RADII[level];
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.25, COLORS[level]);
  g.addColorStop(1, shade(COLORS[level], -28));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // 얼굴
  const eye = Math.max(1.6, r * 0.11);
  ctx.fillStyle = "#1e1b4b";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - r * 0.05, eye, eye * 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.3, y - r * 0.05, eye, eye * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,143,171,0.7)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.52, y + r * 0.2, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.52, y + r * 0.2, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1e1b4b";
  ctx.lineWidth = Math.max(1.2, r * 0.06);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x, y + r * 0.12, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // 마지막 단계는 왕관
  if (level === MAX) {
    ctx.fillStyle = "#fde047";
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 2;
    const cy = y - r * 0.72;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, cy + r * 0.15);
    ctx.lineTo(x - r * 0.34, cy - r * 0.15);
    ctx.lineTo(x - r * 0.15, cy);
    ctx.lineTo(x, cy - r * 0.22);
    ctx.lineTo(x + r * 0.15, cy);
    ctx.lineTo(x + r * 0.34, cy - r * 0.15);
    ctx.lineTo(x + r * 0.3, cy + r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amount));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}
