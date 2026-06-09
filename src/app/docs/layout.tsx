import type { ReactNode } from "react";

import { TopBar } from "./_components/TopBar";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-white">
      <TopBar />
      {children}
    </div>
  );
}
