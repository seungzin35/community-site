/**
 * 안내 도우미 "뭉치" 그림 (이 사이트용으로 새로 그린 캐릭터).
 * 둘러보기 말풍선(driver.js)에도 같은 그림을 넣기 위해 SVG 문자열로 둡니다.
 * 커뮤니티 레벨이 오를수록 새싹 → 꽃 → 목도리 → 반짝이 → 왕관 → 망토 → 무지개 → 황금 → 날개가 붙어요.
 */
export const MASCOT_NAME = "뭉치";

const sparkle = (x: number, y: number, r: number) =>
  `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z" fill="#fde047"/>`;

export function mascotSvgForLevel(level = 1) {
  const gold = level >= 9;
  const body = gold ? "mc-body-gold" : "mc-body";
  const limb = gold ? "#e8a317" : "#5b5bd6";
  const parts: string[] = [];

  parts.push(`<ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".12"/>`);

  // 뒤쪽 장식: 무지개, 날개, 망토
  if (level >= 8) {
    parts.push(
      `<g fill="none" stroke-width="5" stroke-linecap="round" opacity=".85">
        <path d="M8 66a52 52 0 0 1 104 0" stroke="#f87171"/>
        <path d="M14 66a46 46 0 0 1 92 0" stroke="#fbbf24"/>
        <path d="M20 66a40 40 0 0 1 80 0" stroke="#4ade80"/>
        <path d="M26 66a34 34 0 0 1 68 0" stroke="#60a5fa"/>
      </g>`,
    );
  }
  if (level >= 10) {
    parts.push(
      `<path d="M20 58C4 46 0 30 6 26c6 8 10 10 16 12-4 4-4 10-2 20z" fill="#fff" stroke="#e0e7ff" stroke-width="2"/>
       <path d="M100 58c16-12 20-28 14-32-6 8-10 10-16 12 4 4 4 10 2 20z" fill="#fff" stroke="#e0e7ff" stroke-width="2"/>`,
    );
  }
  if (level >= 7) {
    parts.push(`<path d="M30 76C22 92 22 104 26 110h68c4-6 4-18-4-34z" fill="#e5484d"/>`);
  }

  // 머리 위 새싹 (왕관을 쓰면 빠짐)
  if (level < 6) {
    if (level === 1) {
      parts.push(`<path d="M60 18c1-6 6-8 9-5-4 1-6 3-8 6z" fill="#4ade80"/>`);
    } else {
      parts.push(
        `<path d="M60 16c3-9 12-11 15-6-6 1-10 4-13 9z" fill="#4ade80"/>
         <path d="M60 18c-2-8-10-10-13-6 5 1 9 3 11 7z" fill="#22c55e"/>`,
      );
    }
  }

  // 몸
  parts.push(
    `<path d="M60 18C33 18 16 38 16 64c0 26 18 44 44 44s44-18 44-44c0-26-17-46-44-46z" fill="url(#${body})"/>
     <ellipse cx="60" cy="80" rx="26" ry="22" fill="url(#mc-belly)"/>
     <path d="M18 70c-8 2-11 9-7 13 3 3 8 0 10-5z" fill="${limb}"/>
     <path class="mc-arm" d="M102 70c8 2 11 9 7 13-3 3-8 0-10-5z" fill="${limb}"/>
     <ellipse cx="44" cy="56" rx="7.5" ry="9" fill="#1e1b4b"/>
     <ellipse cx="76" cy="56" rx="7.5" ry="9" fill="#1e1b4b"/>
     <circle cx="46.5" cy="52.5" r="3" fill="#fff"/>
     <circle cx="78.5" cy="52.5" r="3" fill="#fff"/>
     <circle cx="42" cy="59" r="1.4" fill="#fff" opacity=".7"/>
     <circle cx="74" cy="59" r="1.4" fill="#fff" opacity=".7"/>
     <ellipse cx="33" cy="69" rx="6" ry="3.5" fill="#ff8fab" opacity=".75"/>
     <ellipse cx="87" cy="69" rx="6" ry="3.5" fill="#ff8fab" opacity=".75"/>
     <path d="M53 68q7 7 14 0" fill="none" stroke="#1e1b4b" stroke-width="3" stroke-linecap="round"/>`,
  );

  // 앞쪽 장식
  if (level >= 3 && level < 6) {
    parts.push(
      `<g transform="translate(75 11)">
        <circle cx="0" cy="-4" r="3.6" fill="#f9a8d4"/><circle cx="4" cy="0" r="3.6" fill="#f9a8d4"/>
        <circle cx="0" cy="4" r="3.6" fill="#f9a8d4"/><circle cx="-4" cy="0" r="3.6" fill="#f9a8d4"/>
        <circle cx="0" cy="0" r="2.6" fill="#fde047"/>
      </g>`,
    );
  }
  if (level >= 4) {
    parts.push(
      `<path d="M30 78q30 12 60 0l-1 8q-29 11-58 0z" fill="#f97316"/>
       <path d="M78 84l6 16-9 1-3-15z" fill="#ea580c"/>`,
    );
  }
  if (level >= 6) {
    parts.push(
      `<path d="M42 26l-3-16 10 8 11-12 11 12 10-8-3 16z" fill="#fbbf24" stroke="#d97706" stroke-width="2" stroke-linejoin="round"/>
       <circle cx="60" cy="18" r="2.5" fill="#e5484d"/>`,
    );
  }
  if (level >= 5) {
    parts.push(sparkle(14, 34, 6), sparkle(106, 30, 5), sparkle(104, 98, 4));
  }

  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="${body}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${gold ? "#fde68a" : "#8f8ff7"}"/>
      <stop offset="1" stop-color="${gold ? "#f59e0b" : "#5b5bd6"}"/>
    </linearGradient>
    <linearGradient id="mc-belly" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".9"/>
      <stop offset="1" stop-color="#e4e4ff" stop-opacity=".9"/>
    </linearGradient>
  </defs>
  ${parts.join("\n  ")}
</svg>`;
}

/** 기본(2레벨) 모습. 레벨을 모를 때 씁니다. */
export const mascotSvg = mascotSvgForLevel(2);
