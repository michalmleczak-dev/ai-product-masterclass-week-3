import type { MoodCategory } from "./moods";
import type { EntryRow } from "./supabase";

export interface Entry {
  id: string;
  date: string;
  moodLabel: string;
  moodCategory: MoodCategory;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export function fromRow(row: EntryRow): Entry {
  return {
    id: row.id,
    date: row.date,
    moodLabel: row.mood_label,
    moodCategory: row.mood_category as MoodCategory,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRow(e: Entry): EntryRow {
  return {
    id: e.id,
    date: e.date,
    mood_label: e.moodLabel,
    mood_category: e.moodCategory,
    text: e.text,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}
