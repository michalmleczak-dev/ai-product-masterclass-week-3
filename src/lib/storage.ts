import { fromRow, toRow, type Entry } from "./entry-mapper";
import { supabase, type EntryRow } from "./supabase";

export type { Entry } from "./entry-mapper";

export async function loadEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("date", { ascending: false });
  if (error) {
    console.error("[storage] loadEntries failed", error);
    return [];
  }
  return (data ?? []).map(fromRow);
}

export async function upsertEntry(entry: Entry): Promise<Entry> {
  const { data, error } = await supabase
    .from("entries")
    .upsert(toRow(entry), { onConflict: "user_id,date" })
    .select()
    .single();
  if (error) {
    throw error;
  }
  return fromRow(data as EntryRow);
}

export async function upsertEntries(entries: Entry[]): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await supabase
    .from("entries")
    .upsert(entries.map(toRow), { onConflict: "user_id,date" });
  if (error) {
    console.error("[storage] upsertEntries failed", error);
  }
}

const PHOTO_BUCKET = "entry-photos";

/** Upload a photo and return the storage PATH (not a public URL). */
export async function uploadEntryPhoto(
  file: File,
  userId: string,
  date: string
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const path = `${userId}/${date}/${uuid}.${ext}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { upsert: false });
  if (error) throw error;

  // Return the storage path — not a public URL (bucket is private).
  return path;
}

/** Delete a photo by its storage PATH. */
export async function deleteEntryPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) throw error;
}

/**
 * Generate a signed URL for a single storage path.
 * Signed URLs expire after 1 hour and are accessible without authentication.
 * Only the owner can generate them (enforced by RLS on storage.objects SELECT).
 */
export async function createSignedPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, 3600); // 1h TTL
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
