"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { MoodScale } from "@/components/MoodScale";
import { JOURNAL_VOICE_INPUT_EVENT } from "@/components/TherapistPanel";
import { TipTapEditor } from "@/components/TipTapEditor";
import { useJournal } from "@/hooks/useJournal";
import { formatTodayLong } from "@/lib/date";

export default function TodayPage() {
  const router = useRouter();
  const { todayEntry, upsertToday, ready } = useJournal();
  const [moodLabel, setMoodLabel] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (ready && !hydrated) {
      if (todayEntry) {
        setMoodLabel(todayEntry.moodLabel);
        setText(todayEntry.text);
      }
      setHydrated(true);
    }
  }, [ready, hydrated, todayEntry]);

  useEffect(() => {
    const onVoice = (e: Event) => {
      const detail = (e as CustomEvent<{ text: string }>).detail;
      const incoming = detail?.text?.trim();
      if (!incoming) return;
      setText((prev) => {
        const block = `<p>${escapeHtml(incoming)}</p>`;
        return prev && prev.trim() ? `${prev}${block}` : block;
      });
    };
    window.addEventListener(JOURNAL_VOICE_INPUT_EVENT, onVoice);
    return () => window.removeEventListener(JOURNAL_VOICE_INPUT_EVENT, onVoice);
  }, []);

  const isUpdate = Boolean(todayEntry);

  const handleSave = async () => {
    if (!moodLabel) return;
    await upsertToday({ moodLabel, text });
    router.push("/result");
  };

  return (
    <main className="px-5 py-6">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {formatTodayLong()}
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">
          How are you feeling today?
        </h1>
      </header>

      <section className="mb-6">
        <MoodScale value={moodLabel} onChange={setMoodLabel} />
      </section>

      <section className="mb-6">
        <TipTapEditor value={text} onChange={setText} />
      </section>

      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={!moodLabel}
          className="min-w-[120px]"
        >
          {isUpdate ? "Update entry" : "Save"}
        </Button>
        <Link
          href="/entries"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          View all entries
        </Link>
      </div>
    </main>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
