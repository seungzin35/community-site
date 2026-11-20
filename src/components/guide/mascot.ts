/**
 * 안내 도우미 "뭉치" 그림 (이 사이트용으로 새로 그린 캐릭터).
 * 둘러보기 말풍선(driver.js)에도 같은 그림을 넣기 위해 SVG 문자열로 둡니다.
 */
export const MASCOT_NAME = "뭉치";

export const mascotSvg = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="mc-body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8f8ff7"/>
      <stop offset="1" stop-color="#5b5bd6"/>
    </linearGradient>
    <linearGradient id="mc-belly" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".9"/>
      <stop offset="1" stop-color="#e4e4ff" stop-opacity=".9"/>
    </linearGradient>
  </defs>
  <ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".12"/>
  <path d="M60 16c3-9 12-11 15-6-6 1-10 4-13 9z" fill="#4ade80"/>
  <path d="M60 18c-2-8-10-10-13-6 5 1 9 3 11 7z" fill="#22c55e"/>
  <path d="M60 18C33 18 16 38 16 64c0 26 18 44 44 44s44-18 44-44c0-26-17-46-44-46z" fill="url(#mc-body)"/>
  <ellipse cx="60" cy="80" rx="26" ry="22" fill="url(#mc-belly)"/>
  <path d="M18 70c-8 2-11 9-7 13 3 3 8 0 10-5z" fill="#5b5bd6"/>
  <path class="mc-arm" d="M102 70c8 2 11 9 7 13-3 3-8 0-10-5z" fill="#5b5bd6"/>
  <ellipse cx="44" cy="56" rx="7.5" ry="9" fill="#1e1b4b"/>
  <ellipse cx="76" cy="56" rx="7.5" ry="9" fill="#1e1b4b"/>
  <circle cx="46.5" cy="52.5" r="3" fill="#fff"/>
  <circle cx="78.5" cy="52.5" r="3" fill="#fff"/>
  <circle cx="42" cy="59" r="1.4" fill="#fff" opacity=".7"/>
  <circle cx="74" cy="59" r="1.4" fill="#fff" opacity=".7"/>
  <ellipse cx="33" cy="69" rx="6" ry="3.5" fill="#ff8fab" opacity=".75"/>
  <ellipse cx="87" cy="69" rx="6" ry="3.5" fill="#ff8fab" opacity=".75"/>
  <path d="M53 68q7 7 14 0" fill="none" stroke="#1e1b4b" stroke-width="3" stroke-linecap="round"/>
</svg>`;
