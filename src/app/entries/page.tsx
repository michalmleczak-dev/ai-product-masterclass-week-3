"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EntryCard } from "@/components/EntryCard";
import { MoodTrend } from "@/components/MoodTrend";
import { useAuth } from "@/hooks/useAuth";
import { useJournal } from "@/hooks/useJournal";
import type { Entry } from "@/lib/entry-mapper";

const PAGE_SIZE = 5;

export default function EntriesPage() {
  const { entries, ready } = useJournal();
  const { signOut, session } = useAuth();

  const sorted = useMemo(
    () =>
      (entries ?? [])
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [entries]
  );

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Entry[] | null>(null);
  const [searching, setSearching] = useState(false);

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

  // Debounced hybrid search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const token = session?.access_token;
        if (!token) return;
        const res = await fetch(
          `/api/entries/search?q=${encodeURIComponent(query.trim())}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Search failed");
        const json = (await res.json()) as { entries: Entry[] };
        setSearchResults(json.entries);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, session]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;
  const isSearching = query.trim().length > 0;

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

      {/* Search input — widoczne zawsze gdy są wpisy */}
      {ready && sorted.length > 0 && (
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries…"
            className="w-full rounded-xl border bg-background py-2.5 pl-9 pr-9 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

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
      ) : isSearching ? (
        /* ── Tryb wyszukiwania ── */
        <div>
          {searching ? (
            <p className="text-sm text-muted-foreground">Searching…</p>
          ) : searchResults === null || searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
              </p>
              <div className="space-y-3">
                {searchResults.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── Normalny widok ── */
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
