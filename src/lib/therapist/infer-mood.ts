import { stripHtml } from "@/lib/html";

import { getGrokKey, GROK_MODEL, GROK_URL } from "./grok-client";

export type MoodScore = 1 | 2 | 3 | 4 | 5;

const SYSTEM_PROMPT = `You classify mood from a journal entry on a 1-5 scale.
1 = intense distress (overwhelmed, angry, panicked)
2 = difficult (sad, anxious, drained)
3 = neutral (indifferent, bored, tired)
4 = calm (relaxed, focused, reflective)
5 = positive (excited, joyful, content)
Reply with strict JSON: {"score": <integer 1-5>}. No prose.`;

export async function inferMoodScore(text: string): Promise<MoodScore> {
  const apiKey = getGrokKey();
  if (!apiKey) throw new Error("Missing XAI_API_KEY");

  const plain = stripHtml(text).slice(0, 4000);

  const resp = await fetch(GROK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: plain },
      ],
      response_format: { type: "json_object" },
      max_tokens: 50,
      stream: false,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.error("[inferMoodScore] Grok error", resp.status, detail);
    throw new Error("Mood inference failed");
  }

  const json = await resp.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";
  let parsed: { score?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Mood inference returned non-JSON");
  }
  const score = Number(parsed.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error(`Mood inference returned invalid score: ${parsed.score}`);
  }
  return score as MoodScore;
}
