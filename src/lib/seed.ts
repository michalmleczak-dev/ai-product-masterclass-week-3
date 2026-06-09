import { dateAddDays, todayISO } from "./date";
import type { MoodCategory } from "./moods";
import type { Entry } from "./storage";

/**
 * The seed entries that anyone opening the app for the first time should
 * see — six days of mood history preceding their first own entry. They get
 * deterministic IDs starting with `seed-` so we can detect and skip
 * re-seeding on subsequent loads, even after the user logs many entries.
 *
 * Dates are computed relative to the user's "today" the first time the
 * app boots in their browser, then frozen — the entries age naturally
 * with the user instead of jumping forward each day.
 */
interface SeedSpec {
  id: string;
  /** Days before today (e.g. 1 = yesterday). */
  offset: number;
  moodLabel: string;
  moodCategory: MoodCategory;
  /** Stored as HTML (TipTap output format). */
  text: string;
}

const SEED_SPECS: readonly SeedSpec[] = [
  {
    id: "seed-1",
    offset: 1,
    moodLabel: "Reflective",
    moodCategory: "Calm",
    text: "<p>Quiet evening. Took some time to write down what went well this week and what I'd do differently.</p>",
  },
  {
    id: "seed-2",
    offset: 2,
    moodLabel: "Focused",
    moodCategory: "Calm",
    text: "<p>Long deep-work block in the morning. Closed the laptop right after lunch and went for a walk to reset.</p>",
  },
  {
    id: "seed-3",
    offset: 3,
    moodLabel: "Drained",
    moodCategory: "Difficult",
    text: "<p>Back-to-back meetings, didn't eat properly. Calling it early and going to bed.</p>",
  },
  {
    id: "seed-4",
    offset: 4,
    moodLabel: "Overwhelmed",
    moodCategory: "Intense",
    text: "<p>Too many things landed at once — three deadlines colliding, an unexpected meeting, and a fire to put out. Couldn't get my head above water.</p>",
  },
  {
    id: "seed-5",
    offset: 5,
    moodLabel: "Bored",
    moodCategory: "Neutral",
    text: "<p>Energy was flat. Got the basics done but nothing felt particularly engaging.</p>",
  },
  {
    id: "seed-6",
    offset: 6,
    moodLabel: "Indifferent",
    moodCategory: "Neutral",
    text: "<p>One of those days where nothing really stood out. Showed up, did the basics, didn't feel strongly either way.</p>",
  },
];

/**
 * Make sure the journal contains the canonical six historical seed entries.
 *
 * For each seed spec:
 * - If an entry with that `seed-N` id already exists, we sync its `moodLabel`,
 *   `moodCategory` and `text` to whatever this file currently declares —
 *   that way edits to the seed specs propagate to existing users on next
 *   load. The original `date` and `createdAt` are preserved so the entry
 *   doesn't jump around in time; `updatedAt` is bumped only when something
 *   actually changed.
 * - If it doesn't exist, we add it with the date offset from today.
 *
 * User-created entries (any id not starting with `seed-`) are never touched.
 */
export function ensureSeedEntries(existing: Entry[]): {
  entries: Entry[];
  changed: boolean;
} {
  const today = todayISO();
  const nowIso = new Date().toISOString();
  const byId = new Map(existing.map((e) => [e.id, e] as const));
  let changed = false;

  for (const spec of SEED_SPECS) {
    const current = byId.get(spec.id);
    if (current) {
      if (
        current.moodLabel !== spec.moodLabel ||
        current.moodCategory !== spec.moodCategory ||
        current.text !== spec.text
      ) {
        byId.set(spec.id, {
          ...current,
          moodLabel: spec.moodLabel,
          moodCategory: spec.moodCategory,
          text: spec.text,
          updatedAt: nowIso,
        });
        changed = true;
      }
    } else {
      byId.set(spec.id, {
        id: spec.id,
        date: dateAddDays(today, -spec.offset),
        moodLabel: spec.moodLabel,
        moodCategory: spec.moodCategory,
        text: spec.text,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      changed = true;
    }
  }

  if (!changed) return { entries: existing, changed: false };
  return { entries: Array.from(byId.values()), changed: true };
}
