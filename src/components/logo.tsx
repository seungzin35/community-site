/** 말풍선 모양 로고 */
export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid place-items-center rounded-lg bg-gradient-to-br from-[#7c7cf0] to-[#4b4bc8] text-white shadow-sm ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-[60%]">
        <path d="M12 3C6.48 3 2 6.94 2 11.8c0 2.6 1.3 4.94 3.36 6.55L4.5 21.5l3.9-2.04c1.13.33 2.34.5 3.6.5 5.52 0 10-3.94 10-8.8S17.52 3 12 3Z" />
      </svg>
    </span>
  );
}
