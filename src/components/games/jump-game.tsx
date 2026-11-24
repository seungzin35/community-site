"use client";

import { Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { mascotSvgForLevel } from "@/components/guide/mascot";
import { ScoreResult } from "./score-result";

// 게임 안 좌표 (화면 크기와 상관없이 이 크기로 계산하고 늘려서 그립니다)
const W = 520;
const H = 240;
const GROUND = 204;
const PLAYER_X = 64;
const PLAYER_SIZE = 54;
const GRAVITY = 2600;
const JUMP_V = -840;
const CUT_V = -320;
const START_SPEED = 330;
const MAX_SPEED = 920;
const STAR_POINTS = 50;

type Obstacle = { x: number; w: number; h: number; kind: "bush" | "rock" };
type Star = { x: number; y: number; taken: boolean };
type Cloud = { x: number; y: number; s: number };

type World = {
  y: number; // 발 위치 기준 높이 (0이 땅)
  vy: number;
  speed: number;
  distance: number;
  stars: number;
  nextGap: number;
  obstacles: Obstacle[];
  starList: Star[];
  clouds: Cloud[];
  groundOffset: number;
  time: number;
};

function freshWorld(): World {
  return {
    y: 0,
    vy: 0,
    speed: START_SPEED,
    distance: 0,
    stars: 0,
    nextGap: 420,
    obstacles: [],
    starList: [],
    clouds: [
      { x: 120, y: 46, s: 1 },
      { x: 380, y: 70, s: 0.75 },
      { x: 560, y: 36, s: 0.9 },
    ],
    groundOffset: 0,
    time: 0,
  };
}

const scoreOf = (w: World) => Math.min(99999, Math.floor(w.distance / 10) + w.stars * STAR_POINTS);
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** 뭉치 점프: 굴러오는 장애물을 뛰어넘는 달리기 게임 */
export function JumpGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(freshWorld());
  const phaseRef = useRef<"ready" | "playing" | "over">("ready");
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [final, setFinal] = useState(0);
  const [round, setRound] = useState(0);
  const mascot = useRef<HTMLImageElement | null>(null);
  const scale = useRef(1);

  const setPhaseBoth = useCallback((p: "ready" | "playing" | "over") => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const jump = useCallback(() => {
    if (phaseRef.current === "ready") {
      world.current = freshWorld();
      setPhaseBoth("playing");
    }
    if (phaseRef.current !== "playing") return;
    const w = world.current;
    if (w.y <= 0.5) w.vy = JUMP_V;
  }, [setPhaseBoth]);

  const release = useCallback(() => {
    const w = world.current;
    if (w.vy < CUT_V) w.vy = CUT_V;
  }, []);

  const retry = useCallback(() => {
    world.current = freshWorld();
    setPhaseBoth("ready");
  }, [setPhaseBoth]);

  // 뭉치 그림 준비
  useEffect(() => {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mascotSvgForLevel(3))}`;
    img.onload = () => (mascot.current = img);
  }, []);

  // 화면 크기에 맞춰 캔버스 해상도 조정
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const cssW = canvas.clientWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round((cssW * H * dpr) / W);
      scale.current = canvas.width / W;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // 키보드: 스페이스 / 위쪽 화살표
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "ArrowUp") return;
      if (phaseRef.current === "over") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      e.preventDefault();
      if (!e.repeat) jump();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") release();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [jump, release]);

  // 게임 루프
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const step = (dt: number) => {
      const w = world.current;
      w.time += dt;
      w.speed = Math.min(MAX_SPEED, START_SPEED + w.time * 9);
      const dx = w.speed * dt;
      w.distance += dx;
      w.groundOffset = (w.groundOffset + dx) % 40;

      // 점프
      w.vy += GRAVITY * dt;
      w.y -= w.vy * dt;
      if (w.y <= 0) {
        w.y = 0;
        w.vy = 0;
      }

      // 구름 (느리게)
      for (const c of w.clouds) {
        c.x -= dx * 0.2 * c.s;
        if (c.x < -80) {
          c.x = W + rand(20, 160);
          c.y = rand(24, 90);
        }
      }

      // 장애물과 별 만들기
      for (const o of w.obstacles) o.x -= dx;
      for (const s of w.starList) s.x -= dx;
      w.obstacles = w.obstacles.filter((o) => o.x + o.w > -10);
      w.starList = w.starList.filter((s) => s.x > -20 && !s.taken);
      const lastObstacle = w.obstacles[w.obstacles.length - 1];
      const gapFromLast = lastObstacle ? W - (lastObstacle.x + lastObstacle.w) : Infinity;
      if (gapFromLast >= w.nextGap) {
        const rock = Math.random() < 0.35;
        const wide = !rock && w.time > 12 && Math.random() < 0.3;
        w.obstacles.push({
          x: W + 10,
          w: wide ? rand(52, 66) : rock ? rand(30, 40) : rand(22, 32),
          h: rock ? rand(22, 30) : rand(32, w.time > 20 ? 52 : 44),
          kind: rock ? "rock" : "bush",
        });
        // 점프 한 번에 날아가는 거리보다 넓게 띄웁니다.
        const airtime = (2 * -JUMP_V) / GRAVITY;
        w.nextGap = w.speed * airtime + rand(110, 110 + w.speed * 0.9);
        if (Math.random() < 0.45) {
          w.starList.push({ x: W + 10 + w.nextGap * rand(0.35, 0.6), y: rand(70, 130), taken: false });
        }
      }

      // 부딪힘 확인 (그림보다 살짝 작게 봐 줘요)
      const px1 = PLAYER_X + 12;
      const px2 = PLAYER_X + PLAYER_SIZE - 12;
      const pBottom = GROUND - w.y - 6;
      const pTop = GROUND - w.y - PLAYER_SIZE + 14;
      for (const o of w.obstacles) {
        const top = GROUND - o.h + 4;
        if (px2 > o.x + 4 && px1 < o.x + o.w - 4 && pBottom > top) {
          return false;
        }
      }
      for (const s of w.starList) {
        if (!s.taken && px2 > s.x - 10 && px1 < s.x + 10 && pBottom > s.y - 10 && pTop < s.y + 10) {
          s.taken = true;
          w.stars += 1;
        }
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

      // 하늘
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, dark ? "#1b1b3a" : "#e8e9ff");
      sky.addColorStop(1, dark ? "#26264a" : "#f7f0ff");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // 구름
      ctx.fillStyle = dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.95)";
      for (const c of w.clouds) {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 30 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + 20 * c.s, c.y - 8 * c.s, 20 * c.s, 13 * c.s, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x - 18 * c.s, c.y - 4 * c.s, 16 * c.s, 10 * c.s, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 땅
      ctx.fillStyle = dark ? "#2f2f55" : "#c9cbf7";
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = dark ? "#3d3d6e" : "#b3b5f0";
      for (let x = -w.groundOffset; x < W; x += 40) ctx.fillRect(x, GROUND + 12, 18, 3);
      ctx.fillStyle = dark ? "#4b4b85" : "#9d9fe8";
      ctx.fillRect(0, GROUND, W, 2);

      // 별사탕
      for (const s of w.starList) {
        if (s.taken) continue;
        const bob = Math.sin((w.time + s.x * 0.01) * 6) * 3;
        drawStar(ctx, s.x, s.y + bob, 10);
      }

      // 장애물
      for (const o of w.obstacles) {
        const top = GROUND - o.h;
        if (o.kind === "rock") {
          ctx.fillStyle = dark ? "#8b8d98" : "#9a9cab";
          ctx.beginPath();
          ctx.moveTo(o.x, GROUND);
          ctx.quadraticCurveTo(o.x + 2, top + 4, o.x + o.w * 0.45, top);
          ctx.quadraticCurveTo(o.x + o.w, top + 2, o.x + o.w, GROUND);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.fillRect(o.x + o.w * 0.3, top + 6, o.w * 0.2, 3);
        } else {
          ctx.fillStyle = "#30a46c";
          roundRect(ctx, o.x, top + 6, o.w, o.h - 6, 8);
          ctx.fill();
          ctx.fillStyle = "#218358";
          // 뾰족한 가시
          ctx.beginPath();
          for (let x = o.x + 2; x < o.x + o.w - 4; x += 9) {
            ctx.moveTo(x, top + 8);
            ctx.lineTo(x + 4.5, top);
            ctx.lineTo(x + 9, top + 8);
          }
          ctx.fill();
          ctx.fillStyle = "#e5484d";
          ctx.beginPath();
          ctx.arc(o.x + o.w * 0.35, top + o.h * 0.45, 2.5, 0, Math.PI * 2);
          ctx.arc(o.x + o.w * 0.7, top + o.h * 0.65, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 뭉치
      const py = GROUND - w.y - PLAYER_SIZE;
      ctx.save();
      // 그림자
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      const shadow = Math.max(0.4, 1 - w.y / 160);
      ctx.beginPath();
      ctx.ellipse(PLAYER_X + PLAYER_SIZE / 2, GROUND + 2, 18 * shadow, 4 * shadow, 0, 0, Math.PI * 2);
      ctx.fill();
      const running = phaseRef.current === "playing" && w.y === 0;
      const bounce = running ? Math.abs(Math.sin(w.time * 14)) * 3 : 0;
      ctx.translate(PLAYER_X + PLAYER_SIZE / 2, py + PLAYER_SIZE / 2 - bounce);
      ctx.rotate(w.y > 0 ? Math.max(-0.25, Math.min(0.25, w.vy / 3200)) : 0);
      if (mascot.current) {
        ctx.drawImage(mascot.current, -PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
      } else {
        ctx.fillStyle = "#5b5bd6";
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_SIZE / 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 점수
      ctx.fillStyle = dark ? "#ececef" : "#18181b";
      ctx.font = "800 18px Pretendard, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(scoreOf(w).toLocaleString(), W - 16, 30);
      if (w.stars > 0) {
        ctx.font = "600 13px Pretendard, system-ui, sans-serif";
        ctx.fillStyle = dark ? "#a1a1aa" : "#71717a";
        ctx.fillText(`별사탕 ${w.stars}개`, W - 16, 50);
      }
    };

    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      if (phaseRef.current === "playing") {
        if (!step(dt)) {
          setFinal(scoreOf(world.current));
          setRound((r) => r + 1);
          setPhaseBoth("over");
        }
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [setPhaseBoth]);

  return (
    <div className="space-y-3">
      <div
        className="relative touch-none select-none overflow-hidden rounded-2xl border border-border"
        onPointerDown={(e) => {
          if (phaseRef.current === "over") return;
          e.preventDefault();
          jump();
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={release}
      >
        <canvas ref={canvasRef} className="block aspect-[13/6] w-full" aria-label="뭉치 점프 게임 화면" />
        {phase === "ready" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface/95 px-4 py-2 text-sm font-bold shadow">
              <Play className="size-4 text-primary" /> 눌러서 시작
            </span>
          </div>
        )}
        {phase === "over" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/15">
            <span className="rounded-full bg-surface/95 px-4 py-2 text-sm font-extrabold shadow">꽈당!</span>
          </div>
        )}
      </div>
      {phase === "over" && (
        <div className="card p-5">
          <ScoreResult game="jump" score={final} round={round} onRetry={retry} title="이번 점수" />
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        화면 누르기 또는 스페이스바로 점프 · 별사탕은 하나에 {STAR_POINTS}점
      </p>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.48;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
