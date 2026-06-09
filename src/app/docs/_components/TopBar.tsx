"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TokenButton } from "./TokenButton";

const TABS = [
  { href: "/docs/api", label: "API" },
  { href: "/docs/mcp", label: "MCP" },
];

export function TopBar() {
  const pathname = usePathname() || "";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-5 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-[15px] font-semibold tracking-tight text-zinc-900">
          Mood Journal
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="text-[13px] text-zinc-500">Docs</span>
      </div>

      <nav className="flex h-full items-center gap-1">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex h-full items-center px-3 text-[13.5px] transition-colors ${
                active ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {t.label}
              <span
                className={`absolute inset-x-3 bottom-0 h-[2px] ${
                  active ? "bg-zinc-900" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center">
        <TokenButton />
      </div>
    </header>
  );
}
