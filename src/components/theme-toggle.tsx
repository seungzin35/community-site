"use client";

import { Moon, Sun } from "lucide-react";

/** 첫 화면이 깜빡이지 않도록 <head> 에서 먼저 실행하는 코드 */
export const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

/** 밝은 화면 ↔ 어두운 화면 */
export function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="화면 밝기 바꾸기"
      title="화면 밝기 바꾸기"
      className="btn btn-ghost size-9 p-0 text-muted-foreground hover:text-foreground"
    >
      <Sun className="hidden size-[18px] dark:block" />
      <Moon className="size-[18px] dark:hidden" />
    </button>
  );
}
