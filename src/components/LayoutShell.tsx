"use client";

import { usePathname } from "next/navigation";

import { DesktopSidebar } from "@/components/DesktopSidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDocs = pathname?.startsWith("/docs") ?? false;

  if (isDocs) {
    return <>{children}</>;
  }

  return (
    <div className="md:flex md:min-h-dvh">
      <DesktopSidebar />
      <div className="mx-auto min-h-dvh w-full max-w-[390px] md:mx-0 md:max-w-none md:flex-1">
        <div className="mx-auto w-full max-w-[390px] md:max-w-[640px] md:px-4">
          {children}
        </div>
      </div>
    </div>
  );
}
