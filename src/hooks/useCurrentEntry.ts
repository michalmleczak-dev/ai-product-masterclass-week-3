"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { useJournal } from "@/hooks/useJournal";
import { todayISO } from "@/lib/date";
import type { Entry } from "@/lib/storage";

export interface CurrentEntryInfo {
  entry: Entry | null;
  label: string;
}

export function useCurrentEntry(): CurrentEntryInfo {
  const pathname = usePathname();
  const search = useSearchParams();
  const { entries, todayEntry } = useJournal();

  return useMemo<CurrentEntryInfo>(() => {
    if (pathname === "/") {
      return { entry: todayEntry, label: todayEntry ? "Today" : "All entries" };
    }
    if (pathname?.startsWith("/result")) {
      const id = search?.get("id");
      const found = id
        ? entries?.find((e) => e.id === id) ?? null
        : entries?.find((e) => e.date === todayISO()) ?? null;
      return {
        entry: found,
        label: found ? formatDateLabel(found.date) : "All entries",
      };
    }
    return { entry: null, label: "All entries" };
  }, [pathname, search, entries, todayEntry]);
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
