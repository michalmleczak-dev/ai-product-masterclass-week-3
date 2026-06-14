"use client";

import { usePathname } from "next/navigation";

import { DesktopSidebar } from "@/components/DesktopSidebar";
import { useAuth } from "@/hooks/useAuth";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const isDocs = pathname?.startsWith("/docs") ?? false;

  if (isDocs) {
    return <>{children}</>;
  }

  return (
    <div className="md:flex md:min-h-dvh">
      <DesktopSidebar />
      <div className="mx-auto min-h-dvh w-full md:mx-0 md:max-w-none md:flex-1">
        {/* Mobile-only top bar — sign out accessible on every screen */}
        <div className="flex items-center justify-between border-b px-5 py-2.5 md:hidden">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Mood Journal
          </span>
          <button
            onClick={signOut}
            className="text-xs text-muted-foreground transition-colors underline-offset-4 hover:text-foreground hover:underline"
          >
            Sign out
          </button>
        </div>
        <div className="mx-auto w-full max-w-2xl md:max-w-[640px] md:px-4">
          {children}
        </div>
      </div>
    </div>
  );
}
