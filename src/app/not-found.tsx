import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-lg font-bold">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm text-muted-foreground">삭제됐거나 주소가 바뀌었을 수 있어요.</p>
      <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
        홈으로 가기
      </Link>
    </div>
  );
}
