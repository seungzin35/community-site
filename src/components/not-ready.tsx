/** Supabase 연결 전에 보여주는 안내 */
export function NotReady() {
  return (
    <p className="card px-4 py-12 text-center text-sm text-muted-foreground">
      아직 Supabase가 연결되지 않아 이 화면은 준비 중이에요.
    </p>
  );
}
