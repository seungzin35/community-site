/** Supabase 연결 전에 보여주는 안내 */
export function NotReady() {
  return (
    <p className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
      아직 Supabase가 연결되지 않아 이 화면은 준비 중이에요.
    </p>
  );
}
