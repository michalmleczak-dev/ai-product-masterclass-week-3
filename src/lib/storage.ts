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
