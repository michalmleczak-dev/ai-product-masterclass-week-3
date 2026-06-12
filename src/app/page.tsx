"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MoodScale } from "@/components/MoodScale";
import { PhotoGallery } from "@/components/PhotoGallery";
import { JOURNAL_ADD_PHOTO_EVENT, JOURNAL_VOICE_INPUT_EVENT } from "@/components/TherapistPanel";
import { TipTapEditor } from "@/components/TipTapEditor";
import { useAuth } from "@/hooks/useAuth";
import { useJournal } from "@/hooks/useJournal";
import { todayISO, formatTodayLong } from "@/lib/date";
import { deleteEntryPhoto, uploadEntryPhoto } from "@/lib/storage";

export default function TodayPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { todayEntry, upsertToday, ready } = useJournal();
  const [moodLabel, setMoodLabel] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready && !hydrated) {
      if (todayEntry) {
        setMoodLabel(todayEntry.moodLabel);
        setText(todayEntry.text);
        setPhotos(todayEntry.photos ?? []);
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

  useEffect(() => {
    const onAddPhoto = () => {
      fileInputRef.current?.click();
    };
    window.addEventListener(JOURNAL_ADD_PHOTO_EVENT, onAddPhoto);
    return () => window.removeEventListener(JOURNAL_ADD_PHOTO_EVENT, onAddPhoto);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (!session?.user?.id) return;

    setUploading(true);
    try {
      const urls = await Promise.all(
        files.map((file) => uploadEntryPhoto(file, session.user.id, todayISO()))
      );
      setPhotos((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error("[page] photo upload failed", err);
    } finally {
      setUploading(false);
      // Reset so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (url: string) => {
    setPhotos((prev) => prev.filter((u) => u !== url));
    try {
      await deleteEntryPhoto(url);
    } catch (err) {
      console.error("[page] photo delete failed", err);
      // Revert optimistic update on failure
      setPhotos((prev) => [...prev, url]);
    }
  };

  const isUpdate = Boolean(todayEntry);

  const handleSave = async () => {
    if (!moodLabel) return;
    await upsertToday({ moodLabel, text, photos });
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

      {/* Photo gallery */}
      {(photos.length > 0 || uploading) && (
        <section className="mb-4">
          <PhotoGallery
            photos={photos}
            uploading={uploading}
            onDelete={handleDeletePhoto}
          />
        </section>
      )}

      <section className="mb-6">
        <TipTapEditor value={text} onChange={setText} />
      </section>

      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={!moodLabel || uploading}
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

      {/* Hidden file input triggered by JOURNAL_ADD_PHOTO_EVENT */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </main>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
