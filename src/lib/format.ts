const pad = (n: number) => String(n).padStart(2, "0");

/** 한국 시간 기준으로 날짜 부분을 꺼냅니다. */
function kstParts(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return {
    y: kst.getUTCFullYear(),
    m: kst.getUTCMonth() + 1,
    d: kst.getUTCDate(),
    hh: kst.getUTCHours(),
    mm: kst.getUTCMinutes(),
  };
}

/** 목록용: 오늘 글은 시:분, 그 외는 월.일 */
export function formatListDate(iso: string) {
  const t = kstParts(new Date(iso));
  const now = kstParts(new Date());
  if (t.y === now.y && t.m === now.m && t.d === now.d) return `${pad(t.hh)}:${pad(t.mm)}`;
  if (t.y === now.y) return `${pad(t.m)}.${pad(t.d)}`;
  return `${String(t.y).slice(2)}.${pad(t.m)}.${pad(t.d)}`;
}

/** 상세용: 연.월.일 시:분 */
export function formatFullDate(iso: string) {
  const t = kstParts(new Date(iso));
  return `${t.y}.${pad(t.m)}.${pad(t.d)} ${pad(t.hh)}:${pad(t.mm)}`;
}
