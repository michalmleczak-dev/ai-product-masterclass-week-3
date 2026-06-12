"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { MoodScale } from "@/components/MoodScale";
import { PhotoGallery } from "@/components/PhotoGallery";
import { TipTapEditor } from "@/components/TipTapEditor";
import { useAuth } from "@/hooks/useAuth";
import { useJournal } from "@/hooks/useJournal";
import { formatPrettyDate } from "@/lib/date";
import { deleteEntryPhoto, uploadEntryPhoto } from "@/lib/storage";

export default function EditEntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { entries, upsertEntryById, ready } = useJournal();

  const [moodLabel, setMoodLabel] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const entry = entries?.find((e) => e.id === params.id) ?? null;

  useEffect(() => {
    if (ready && !hydrated) {
      if (!entry) {
        router.replace("/entries");
        return;
      }
      setMoodLabel(entry.moodLabel);
      setText(entry.text);
      setPhotos(entry.photos ?? []);
      setHydrated(true);
    }
  }, [ready, hydrated, entry, router]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !session?.user?.id || !entry) return;

    setUploading(true);
    try {
      const urls = await Promise.all(
        files.map((file) => uploadEntryPhoto(file, session.user.id, entry.date))
      );
      setPhotos((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error("[edit] photo upload failed", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (path: string) => {
    setPhotos((prev) => prev.filter((u) => u !== path));
    try {
      await deleteEntryPhoto(path);
    } catch (err) {
      console.error("[edit] photo delete failed", err);
      setPhotos((prev) => [...prev, path]);
    }
  };

  const handleSave = async () => {
    if (!moodLabel || !entry) return;
    setSaving(true);
    try {
      await upsertEntryById(entry.id, { moodLabel, text, photos });
      router.push(`/result?id=${encodeURIComponent(entry.id)}`);
    } catch (err) {
      console.error("[edit] save failed", err);
      setSaving(false);
    }
  };

  if (!ready || !hydrated) {
    return (
      <main className="px-5 py-10 text-sm text-muted-foreground">Loading…</main>
    );
  }

  if (!entry) return null;

  return (
    <main className="px-5 py-6">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href={`/result?id=${encodeURIComponent(entry.id)}`}
          aria-label="Back"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {formatPrettyDate(entry.date)}
          </p>
          <h1 className="mt-0.5 text-xl font-bold leading-tight">Edit entry</h1>
        </div>
      </header>

      <section className="mb-6">
        <MoodScale value={moodLabel} onChange={setMoodLabel} />
      </section>

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

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={!moodLabel || uploading || saving}
          className="min-w-[120px]"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={uploading || saving}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Add photo"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

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
