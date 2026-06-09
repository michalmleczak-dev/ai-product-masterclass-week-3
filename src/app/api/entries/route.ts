import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { todayISO } from "@/lib/date";
import { fromRow, toRow, type Entry } from "@/lib/entry-mapper";
import { getMoodDefByCategory, type MoodCategory } from "@/lib/moods";
import { makeUserClient } from "@/lib/supabase-server";
import { inferMoodScore, type MoodScore } from "@/lib/therapist/infer-mood";

export const runtime = "nodejs";

interface RequestBody {
  text?: unknown;
  date?: unknown;
  mood?: unknown;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const SCORE_TO_CATEGORY: Record<MoodScore, MoodCategory> = {
  5: "Positive",
  4: "Calm",
  3: "Neutral",
  2: "Difficult",
  1: "Intense",
};

function defaultLabel(category: MoodCategory): string {
  const def = getMoodDefByCategory(category);
  return def?.labels[0] ?? category;
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "`text` is required" }, { status: 400 });
  }

  let date: string;
  if (body.date === undefined || body.date === null) {
    date = todayISO();
  } else if (typeof body.date === "string" && DATE_RE.test(body.date)) {
    date = body.date;
  } else {
    return NextResponse.json(
      { error: "`date` must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  let score: MoodScore | null = null;
  if (body.mood !== undefined && body.mood !== null) {
    const n = Number(body.mood);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return NextResponse.json(
        { error: "`mood` must be an integer 1..5" },
        { status: 400 }
      );
    }
    score = n as MoodScore;
  } else {
    try {
      score = await inferMoodScore(text);
    } catch (err) {
      console.error("[POST /api/entries] mood inference failed", err);
      return NextResponse.json(
        { error: "Mood inference failed" },
        { status: 502 }
      );
    }
  }

  const category = SCORE_TO_CATEGORY[score];
  const moodLabel = defaultLabel(category);
  const now = new Date().toISOString();

  const sb = makeUserClient(auth.accessToken);

  const { data: existingRow, error: selectError } = await sb
    .from("entries")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (selectError) {
    console.error("[POST /api/entries] select failed", selectError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const draft: Entry = existingRow
    ? {
        ...fromRow(existingRow),
        moodLabel,
        moodCategory: category,
        text,
        updatedAt: now,
      }
    : {
        id: crypto.randomUUID(),
        date,
        moodLabel,
        moodCategory: category,
        text,
        createdAt: now,
        updatedAt: now,
      };

  const { data, error } = await sb
    .from("entries")
    .upsert(toRow(draft), { onConflict: "user_id,date" })
    .select()
    .single();

  if (error || !data) {
    console.error("[POST /api/entries] upsert failed", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ entry: fromRow(data) }, { status: 201 });
}
