import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { NotReady } from "@/components/not-ready";
import { requireAdminPage } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// 관리자 확인을 매번 하므로 서버에서 기다렸다가 보여 줍니다.
export const instant = false;

export const metadata: Metadata = {
  title: { default: "관리자", template: "%s | 관리자" },
  robots: { index: false },
};


export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!isSupabaseConfigured) return <NotReady />;
  await requireAdminPage();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <Shield className="size-5 text-primary" /> 관리자
        </h1>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
