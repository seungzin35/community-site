const colors = [
  "bg-[#e0e7ff] text-[#4338ca] dark:bg-[#272a5c] dark:text-[#c7d2fe]",
  "bg-[#fce7f3] text-[#be185d] dark:bg-[#4a1d36] dark:text-[#fbcfe8]",
  "bg-[#dcfce7] text-[#15803d] dark:bg-[#173b26] dark:text-[#bbf7d0]",
  "bg-[#fef3c7] text-[#b45309] dark:bg-[#45300f] dark:text-[#fde68a]",
  "bg-[#e0f2fe] text-[#0369a1] dark:bg-[#12344d] dark:text-[#bae6fd]",
  "bg-[#f3e8ff] text-[#7e22ce] dark:bg-[#3b1e57] dark:text-[#e9d5ff]",
];

/** 닉네임 첫 글자로 만든 동그란 프로필. 닉네임마다 색이 정해져 있어요. */
export function Avatar({ name, size = "md" }: { name?: string | null; size?: "sm" | "md" }) {
  const label = name ?? "?";
  const hash = [...label].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const sizes = { sm: "size-7 text-xs", md: "size-9 text-sm" };
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-bold ${sizes[size]} ${colors[hash % colors.length]}`}
    >
      {label.slice(0, 1)}
    </span>
  );
}
