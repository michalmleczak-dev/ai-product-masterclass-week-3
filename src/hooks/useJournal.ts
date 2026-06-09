"use client";

import { useCallback, useEffect, useState } from "react";

import { todayISO } from "@/lib/date";
import { getMoodDef } from "@/lib/moods";
import { Entry, loadEntries, upsertEntry } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

const JOURNAL_UPDATED_EVENT = "mood-journal:updated";

export interface UpsertInput {
  moodLabel: string;
  text: string;
}

export interface UseJournalResult {
  entries: Entry[] | null;
  todayEntry: Entry | null;
  upsertToday: (input: UpsertInput) => Promise<Entry>;
  ready: boolean;
}

export function useJournal(): UseJournalResult {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const fromDb = await loadEntries();
      if (!cancelled) setEntries(fromDb);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setEntries(null);
      load();
    });
    // Cross-instance sync: when one hook saves an entry, other live
    // <useJournal> instances (e.g. the desktop sidebar) reload too.
    const onExternalUpdate = () => {
      load();
    };
    if (typeof window !== "undefined") {
      window.addEventListener(JOURNAL_UPDATED_EVENT, onExternalUpdate);
    }
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener(JOURNAL_UPDATED_EVENT, onExternalUpdate);
      }
    };
  }, []);

  const upsertToday = useCallback(
    async (input: UpsertInput): Promise<Entry> => {
      const def = getMoodDef(input.moodLabel);
      if (!def) {
        throw new Error(`Unknown mood label: ${input.moodLabel}`);
      }
      const date = todayISO();
      const now = new Date().toISOString();
      const current = entries ?? (await loadEntries());
      const existing = current.find((e) => e.date === date);

      const draft: Entry = existing
        ? {
            ...existing,
            moodLabel: input.moodLabel,
            moodCategory: def.category,
            text: input.text,
            updatedAt: now,
          }
        : {
            id:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${date}-${Math.random().toString(36).slice(2)}`,
            date,
            moodLabel: input.moodLabel,
            moodCategory: def.category,
            text: input.text,
            createdAt: now,
            updatedAt: now,
          };

      const saved = await upsertEntry(draft);
      const next = existing
        ? current.map((e) => (e.date === date ? saved : e))
        : [saved, ...current];
      setEntries(next);
      if (typeof window !== "undefined") {
        // Notify other live <useJournal> instances (sidebar, etc).
        window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
      }
      return saved;
    },
    [entries]
  );

  const todayEntry =
    entries === null ? null : entries.find((e) => e.date === todayISO()) ?? null;

  return {
    entries,
    todayEntry,
    upsertToday,
    ready: entries !== null,
  };
}
