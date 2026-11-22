import { mascotSvgForLevel } from "@/components/guide/mascot";

/** 레벨에 맞는 뭉치 그림 (서버에서도 그릴 수 있음) */
export function MascotFigure({ level, className = "" }: { level: number; className?: string }) {
  return <span className={`block ${className}`} dangerouslySetInnerHTML={{ __html: mascotSvgForLevel(level) }} />;
}
