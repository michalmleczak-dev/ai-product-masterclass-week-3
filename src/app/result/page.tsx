"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { MoodIllustration } from "@/components/MoodIllustration";
import { useJournal } from "@/hooks/useJournal";
import { todayISO } from "@/lib/date";
import { getMoodDef } from "@/lib/moods";
import { stripHtml, truncate } from "@/lib/html";
import type { Entry } from "@/lib/storage";

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="px-5 py-10 text-sm text-muted-foreground">Loading…</main>
      }
    >
      <ResultPageInner />
    </Suspense>
  );
}

function ResultPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const requestedId = search.get("id");
  const { entries, todayEntry, ready } = useJournal();

  // Resolve the entry to show: by ?id= if provided, else fall back to today's entry.
  const entry: Entry | null = (() => {
    if (!ready || entries === null) return null;
    if (requestedId) {
      return entries.find((e) => e.id === requestedId) ?? null;
    }
    return todayEntry;
  })();

  // Once we know there's nothing to show, bounce back home.
  useEffect(() => {
    if (!ready) return;
    if (requestedId) {
      const found = (entries ?? []).some((e) => e.id === requestedId);
      if (!found) router.replace("/entries");
    } else if (!todayEntry) {
      router.replace("/");
    }
  }, [ready, requestedId, entries, todayEntry, router]);

  if (!entry) {
    return (
      <main className="px-5 py-10 text-sm text-muted-foreground">Loading…</main>
    );
  }

  const def = getMoodDef(entry.moodLabel);
  if (!def) {
    return (
      <main className="px-5 py-10 text-sm text-muted-foreground">
        Unknown mood label.
      </main>
    );
  }

  const preview = truncate(stripHtml(entry.text), 200);
  const isToday = entry.date === todayISO();

  return (
    <>
      {/* Full-bleed background that escapes the 390px wrapper */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: def.bg }}
      />
      <main
        className="relative flex min-h-dvh flex-col px-5 py-6"
        style={{ color: def.text }}
      >
        <div className="flex items-center justify-between">
          <Link
            href={requestedId ? "/entries" : "/"}
            aria-label="Back"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/10 hover:bg-black/20"
            style={{ color: def.text }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-xs uppercase tracking-wider opacity-80">
            {def.category}
          </span>
          <span className="w-9" />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <MoodIllustration label={entry.moodLabel} size={180} />
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            {entry.moodLabel}
          </h1>
          <p
            className="mt-2 text-xs uppercase tracking-wider opacity-80"
            suppressHydrationWarning
          >
            {isToday ? "Today" : entry.date}
          </p>
          <p className="mt-4 max-w-[300px] text-sm leading-relaxed opacity-90">
            {def.recommendation}
          </p>
          {preview && (
            <p className="mt-6 max-w-[320px] text-sm italic opacity-85">
              &ldquo;{preview}&rdquo;
            </p>
          )}
        </div>

        <Link
          href="/entries"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-black/10 px-5 py-3 text-sm font-medium hover:bg-black/20"
          style={{ color: def.text }}
        >
          View all entries <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    </>
  );
}
