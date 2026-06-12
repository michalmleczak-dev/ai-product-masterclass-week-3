import { fromRow } from "@/lib/entry-mapper";
import type { Entry } from "@/lib/entry-mapper";
import { makeUserClient } from "@/lib/supabase-server";

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings error ${res.status}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

/**
 * Łączy wyszukiwanie wektorowe (cosine similarity) z klasycznym (ILIKE).
 * Zwraca zdeduplikowaną listę — wyniki wektorowe na górze.
 */
function userIdFromToken(token: string): string {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  const uid = payload.sub as string | undefined;
  if (!uid) throw new Error("Unauthenticated");
  return uid;
}

export async function hybridSearch(
  query: string,
  accessToken: string,
  limit = 30
): Promise<Entry[]> {
  const sb = makeUserClient(accessToken);
  const userId = userIdFromToken(accessToken);

  const [embedding, keywordResult] = await Promise.all([
    embedQuery(query),
    sb
      .from("entries")
      .select("id,date,mood_label,mood_category,text,created_at,updated_at")
      .ilike("text", `%${query}%`)
      .order("date", { ascending: false })
      .limit(limit),
  ]);

  const vectorResult = await sb.rpc("match_entries", {
    query_embedding: embedding,
    match_count: limit,
    p_user_id: userId,
  });

  const vectorRows: Entry[] = ((vectorResult.data as unknown[]) ?? []).map(
    (r) => fromRow(r as Parameters<typeof fromRow>[0])
  );

  const keywordRows: Entry[] = ((keywordResult.data as unknown[]) ?? []).map(
    (r) => fromRow(r as Parameters<typeof fromRow>[0])
  );

  const seen = new Set(vectorRows.map((e) => e.id));
  const merged = [
    ...vectorRows,
    ...keywordRows.filter((e) => !seen.has(e.id)),
  ];

  return merged;
}
