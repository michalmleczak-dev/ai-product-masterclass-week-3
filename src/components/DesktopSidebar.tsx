"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FileText, PenSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EntryCard } from "@/components/EntryCard";
import { useAuth } from "@/hooks/useAuth";
import { useJournal } from "@/hooks/useJournal";

/**
 * Master-detail sidebar shown on viewports >= md. Lists every entry with the
 * one currently in view highlighted, and exposes a quick action to jump to
 * today's entry form. Hidden on mobile — the existing per-screen flow stays.
 */
export function DesktopSidebar() {
  return (
    <Suspense fallback={null}>
      <SidebarInner />
    </Suspense>
  );
}

function SidebarInner() {
  const { entries, ready } = useJournal();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const search = useSearchParams();
  // On `/result?id=X` we highlight that id; on `/` we highlight today's entry.
  const activeId =
    pathname === "/result" ? search.get("id") ?? undefined : undefined;

  const sorted = useMemo(
    () =>
      (entries ?? [])
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [entries]
  );

  return (
    <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-[340px] md:shrink-0 md:flex-col md:border-r md:bg-muted/30">
      <header className="flex items-center justify-between gap-3 border-b bg-background/80 px-5 py-4 backdrop-blur">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Mood Journal
          </p>
          <h2 className="text-base font-semibold leading-tight">
            Your Journal
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant={pathname === "/docs" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            title="API Documentation"
            aria-label="API Documentation"
          >
            <Link href="/docs">
              <FileText className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant={pathname === "/" ? "default" : "outline"}
            className="h-8"
          >
            <Link href="/" className="inline-flex items-center gap-1.5">
              <PenSquare className="h-3.5 w-3.5" /> Today
            </Link>
          </Button>
        </div>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {!ready ? (
          <p className="px-2 text-sm text-muted-foreground">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">
            No entries yet. Start with today.
          </p>
        ) : (
          sorted.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              active={entry.id === activeId}
            />
          ))
        )}
      </div>
      <footer className="flex items-center justify-between border-t bg-background/60 px-5 py-3">
        <Link
          href="/entries"
          className={`text-xs transition-colors underline-offset-4 hover:underline ${
            pathname === "/entries"
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          }`}
        >
          View mood trend →
        </Link>
        <button
          onClick={signOut}
          className="text-xs text-muted-foreground transition-colors underline-offset-4 hover:text-foreground hover:underline"
        >
          Sign out
        </button>
      </footer>
    </aside>
  );
}
