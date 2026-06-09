export type MoodCategory =
  | "Positive"
  | "Calm"
  | "Neutral"
  | "Difficult"
  | "Intense";

export type MoodFace = "happy" | "neutral" | "sad" | "angry";

export interface MoodCategoryDef {
  category: MoodCategory;
  labels: string[];
  bg: string;
  text: string;
  face: MoodFace;
  /** Public path to the illustration asset for this category. */
  image: string;
  recommendation: string;
}

export const MOOD_CATEGORIES: MoodCategoryDef[] = [
  {
    category: "Positive",
    labels: ["Excited", "Joyful", "Content"],
    bg: "#F5C842",
    text: "#1A1A1A",
    face: "happy",
    image: "/moods/joy.jpeg",
    recommendation:
      "You're in a great headspace. Use this energy — reach out to someone, start that task, or simply enjoy the moment.",
  },
  {
    category: "Calm",
    labels: ["Relaxed", "Focused", "Reflective"],
    bg: "#A8D5BA",
    text: "#1A1A1A",
    face: "happy",
    image: "/moods/calm.jpeg",
    recommendation:
      "Steady and clear. A good time to reflect, plan, or do deep work.",
  },
  {
    category: "Neutral",
    labels: ["Indifferent", "Bored", "Tired"],
    bg: "#C9C9D3",
    text: "#1A1A1A",
    face: "neutral",
    image: "/moods/low.jpeg",
    recommendation:
      "Steady, in-between energy. Not a flaw — rest, a short walk, or a change of scene can nudge things either way.",
  },
  {
    category: "Difficult",
    labels: ["Drained", "Sad", "Anxious"],
    bg: "#E8856A",
    text: "#FFFFFF",
    face: "sad",
    image: "/moods/difficult.jpeg",
    recommendation:
      "Something's weighing on you. Writing it out is already a step. Be kind to yourself today.",
  },
  {
    category: "Intense",
    labels: ["Overwhelmed", "Frustrated", "Angry"],
    bg: "#C0392B",
    text: "#FFFFFF",
    face: "angry",
    image: "/moods/intense.jpeg",
    recommendation:
      "This is a hard moment. Take a breath. You don't have to solve everything right now — just get through today.",
  },
];

const LABEL_TO_DEF = new Map<string, MoodCategoryDef>(
  MOOD_CATEGORIES.flatMap((def) =>
    def.labels.map((label) => [label, def] as const)
  )
);

/**
 * One emoji per mood label. Rendered as text in the UI (system color emoji),
 * scales freely with font-size.
 */
export const LABEL_EMOJI: Record<string, string> = {
  // Positive
  Excited: "🤩",
  Joyful: "😀",
  Content: "🙂",
  // Calm
  Relaxed: "😎",
  Focused: "🧐",
  Reflective: "🤔",
  // Neutral
  Indifferent: "😐",
  Bored: "😑",
  Tired: "🥱",
  // Difficult
  Drained: "😫",
  Sad: "😢",
  Anxious: "😰",
  // Intense
  Overwhelmed: "🤯",
  Frustrated: "😤",
  Angry: "😡",
};

export function getMoodEmoji(label: string | null | undefined): string {
  if (!label) return "🫥";
  return LABEL_EMOJI[label] ?? "🫥";
}

export function getMoodDef(label: string): MoodCategoryDef | undefined {
  return LABEL_TO_DEF.get(label);
}

export function getMoodDefByCategory(
  category: MoodCategory
): MoodCategoryDef | undefined {
  return MOOD_CATEGORIES.find((def) => def.category === category);
}

export const ALL_LABELS: string[] = MOOD_CATEGORIES.flatMap((d) => d.labels);
