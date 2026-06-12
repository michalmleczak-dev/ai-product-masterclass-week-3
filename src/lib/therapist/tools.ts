import { stripHtml, truncate } from "@/lib/html";
import { makeUserClient } from "@/lib/supabase-server";
import { hybridSearch } from "@/lib/search";

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const THERAPIST_TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_entries",
      description:
        "Fetch additional mood journal entries with filters. The most relevant entries are already pre-searched and provided in the system prompt. Use this tool only when you need entries outside that set — e.g. a specific date range, a mood category filter, or more than 5 results.",
      parameters: {
        type: "object",
        properties: {
          rangeStart: { type: "string", description: "Inclusive ISO date YYYY-MM-DD" },
          rangeEnd: { type: "string", description: "Inclusive ISO date YYYY-MM-DD" },
          moodCategory: {
            type: "string",
            enum: ["Positive", "Calm", "Neutral", "Difficult", "Intense"],
          },
          keyword: { type: "string", description: "Case-insensitive substring of entry text" },
          limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_mood_stats",
      description:
        "Aggregated mood stats over a rolling window. Use for trend questions ('how has my week been?').",
      parameters: {
        type: "object",
        required: ["window"],
        properties: {
          window: { type: "string", enum: ["7d", "30d", "90d", "all"] },
        },
      },
    },
  },
];

const CATEGORY_SCORE: Record<string, number> = {
  Positive: 2,
  Calm: 1,
  Neutral: 0,
  Difficult: -2,
  Intense: -3,
};

interface EntryRow {
  id: string;
  date: string;
  mood_label: string;
  mood_category: string;
  text: string;
}

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function formatEntry(e: { date: string; mood: string; category: string; text: string }) {
  return e;
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  accessToken: string
): Promise<unknown> {
  const sb = makeUserClient(accessToken);

  if (name === "get_entries") {
    const limit = Math.min(Number(args.limit ?? 20), 50);
    let q = sb
      .from("entries")
      .select("id,date,mood_label,mood_category,text")
      .order("date", { ascending: false })
      .limit(limit);
    if (typeof args.rangeStart === "string") q = q.gte("date", args.rangeStart);
    if (typeof args.rangeEnd === "string") q = q.lte("date", args.rangeEnd);
    if (typeof args.moodCategory === "string") q = q.eq("mood_category", args.moodCategory);

    let mainResults: { date: string; mood: string; category: string; text: string }[] = [];

    if (typeof args.keyword === "string" && args.keyword.length > 0) {
      try {
        const results = await hybridSearch(args.keyword, accessToken, limit);
        mainResults = results.map((e) => ({
          date: e.date,
          mood: e.moodLabel,
          category: e.moodCategory,
          text: truncate(stripHtml(e.text), 500),
        }));
      } catch {
        // fallback to classic search if hybrid fails
        q = q.ilike("text", `%${args.keyword}%`);
        const { data, error } = await q;
        if (error) return { error: error.message };
        mainResults = (data ?? []).map((r: EntryRow) => ({
          date: r.date,
          mood: r.mood_label,
          category: r.mood_category,
          text: truncate(stripHtml(r.text), 500),
        }));
      }
    } else {
      const { data, error } = await q;
      if (error) return { error: error.message };
      mainResults = (data ?? []).map((r: EntryRow) => ({
        date: r.date,
        mood: r.mood_label,
        category: r.mood_category,
        text: truncate(stripHtml(r.text), 500),
      }));
    }

    // Zawsze doklejamy ostatnie 7 dni — żeby agent rozumiał pytania w stylu
    // "wczoraj się pokłóciłem z X" bez potrzeby szukania słów kluczowych.
    const { data: recentData } = await sb
      .from("entries")
      .select("id,date,mood_label,mood_category,text")
      .gte("date", sevenDaysAgo())
      .order("date", { ascending: false });

    const recentFormatted = (recentData ?? []).map((r: EntryRow) => ({
      date: r.date,
      mood: r.mood_label,
      category: r.mood_category,
      text: truncate(stripHtml(r.text), 500),
    }));

    const seenDates = new Set(mainResults.map((e) => e.date));
    const merged = [
      ...mainResults,
      ...recentFormatted.filter((e) => !seenDates.has(e.date)),
    ];

    return merged.map(formatEntry);
  }

  if (name === "get_mood_stats") {
    const window = (args.window as string) ?? "30d";
    const since = (() => {
      if (window === "all") return null;
      const days = window === "7d" ? 7 : window === "30d" ? 30 : 90;
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().slice(0, 10);
    })();
    let q = sb
      .from("entries")
      .select("date,mood_label,mood_category")
      .order("date", { ascending: true });
    if (since) q = q.gte("date", since);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const rows = (data ?? []) as Pick<EntryRow, "date" | "mood_label" | "mood_category">[];
    if (rows.length === 0) {
      return { count: 0, message: "No entries in this window." };
    }
    const distribution: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      distribution[r.mood_category] = (distribution[r.mood_category] ?? 0) + 1;
      total += CATEGORY_SCORE[r.mood_category] ?? 0;
    }
    const avgScore = +(total / rows.length).toFixed(2);
    const dominant = Object.entries(distribution).sort((a, b) => b[1] - a[1])[0][0];
    const half = Math.floor(rows.length / 2);
    const firstAvg =
      rows.slice(0, half).reduce((s, r) => s + (CATEGORY_SCORE[r.mood_category] ?? 0), 0) /
        Math.max(half, 1);
    const secondAvg =
      rows.slice(half).reduce((s, r) => s + (CATEGORY_SCORE[r.mood_category] ?? 0), 0) /
        Math.max(rows.length - half, 1);
    const trend =
      secondAvg - firstAvg > 0.3 ? "improving" : secondAvg - firstAvg < -0.3 ? "declining" : "stable";
    return {
      window,
      count: rows.length,
      avgMoodScore: avgScore,
      dominantCategory: dominant,
      distribution,
      trend,
      timeline: rows.map((r) => ({ date: r.date, category: r.mood_category })),
    };
  }

  return { error: `Unknown tool: ${name}` };
}
