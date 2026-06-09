"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { MoodPill } from "@/components/MoodPill";
import { formatPrettyDate } from "@/lib/date";
import { stripHtml, truncate } from "@/lib/html";
import type { Entry } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface EntryCardProps {
  entry: Entry;
  /** Highlight as the currently viewed entry (sidebar use). */
  active?: boolean;
}

export function EntryCard({ entry, active = false }: EntryCardProps) {
  const preview = truncate(stripHtml(entry.text), 80);
  return (
    <Link
      href={`/result?id=${encodeURIComponent(entry.id)}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent",
        active && "border-foreground/40 bg-accent ring-1 ring-foreground/10"
      )}
      aria-current={active ? "page" : undefined}
      aria-label={`Open entry from ${formatPrettyDate(entry.date)}`}
    >
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatPrettyDate(entry.date)}
          </span>
          <MoodPill
            label={entry.moodLabel}
            selected
            size="sm"
            asButton={false}
            withEmoji
          />
        </div>
        <p className="text-sm text-foreground/80">
          {preview || (
            <span className="italic text-muted-foreground">No text</span>
          )}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
