import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl font-black tracking-tight text-primary/30">404</p>
      <h1 className="mt-4 text-xl font-extrabold">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm text-muted-foreground">삭제됐거나 주소가 바뀌었을 수 있어요.</p>
      <Link href="/" className="btn btn-primary mt-6">
        홈으로 가기
      </Link>
    </div>
  );
}
