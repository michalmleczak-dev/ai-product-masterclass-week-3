"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EntryCard } from "@/components/EntryCard";
import { MoodTrend } from "@/components/MoodTrend";
import { useAuth } from "@/hooks/useAuth";
import { useJournal } from "@/hooks/useJournal";

const PAGE_SIZE = 5;

export default function EntriesPage() {
  const { entries, ready } = useJournal();
  const { signOut } = useAuth();

  const sorted = useMemo(
    () =>
      (entries ?? [])
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [entries]
  );

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset visible window if the underlying list shrinks (e.g. after a clear).
  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(prev, PAGE_SIZE), sorted.length || PAGE_SIZE));
  }, [sorted.length]);

  // Infinite-scroll: load more when the sentinel enters the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (visibleCount >= sorted.length) return;

    const io = new IntersectionObserver(
      (entriesObs) => {
        for (const entry of entriesObs) {
          if (entry.isIntersecting) {
            setVisibleCount((c) => Math.min(c + PAGE_SIZE, sorted.length));
          }
        }
      },
      { rootMargin: "120px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visibleCount, sorted.length]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <main className="px-5 py-6">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold leading-tight">Your Journal</h1>
        <button
          onClick={signOut}
          className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Sign out
        </button>
      </header>

      {!ready ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
          <div className="text-4xl" aria-hidden>
            🌱
          </div>
          <div>
            <p className="text-sm font-medium">No entries yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with today.
            </p>
          </div>
          <Button asChild>
            <Link href="/">Today&apos;s entry</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <MoodTrend entries={sorted} />
          </div>

          {/* On desktop the sidebar already lists every entry; only the
              mood trend lives in the main area. The list (with infinite
              scroll) is mobile-only. */}
          <div className="md:hidden">
            <div className="space-y-3">
              {visible.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>

            {hasMore && (
              <div
                ref={sentinelRef}
                className="mt-4 flex items-center justify-center py-4 text-xs text-muted-foreground"
                aria-live="polite"
              >
                Loading more…
              </div>
            )}
            {!hasMore && sorted.length > PAGE_SIZE && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                You&apos;ve reached the end ({sorted.length} entries).
              </p>
            )}
          </div>

          {/* Desktop-only hint pointing at the sidebar. */}
          <p className="hidden text-xs text-muted-foreground md:block">
            Pick an entry from the list on the left to view or update it.
          </p>
        </>
      )}
    </main>
  );
}
