import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export interface EntryRow {
  id: string;
  date: string;
  mood_label: string;
  mood_category: string;
  text: string;
  created_at: string;
  updated_at: string;
}
