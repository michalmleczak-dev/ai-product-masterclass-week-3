/**
 * Embed-entries — generuje embeddingi OpenAI text-embedding-3-small (1536 wymiarów)
 * dla każdego wpisu w bazie i zapisuje je do kolumny `embedding`.
 *
 * Jeden wpis = jeden wektor (bez chunkowania).
 *
 * Uruchomienie:
 *   pnpm tsx scripts/embed-entries.mts email haslo
 *
 * Przelatuje przez wpisy WHERE embedding IS NULL — więc można uruchamiać wielokrotnie,
 * tylko nowe/nieprzetworzone wpisy będą wysyłane do OpenAI.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Wczytaj .env.local ─────────────────────────────────────────────────────
const envPath = resolve(__dirname, "../.env.local");
try {
  const envFile = readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  /* brak pliku — zmienne mogą być ustawione inaczej */
}

// ── Konfiguracja ───────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌  Brak NEXT_PUBLIC_SUPABASE_URL lub NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!openaiKey) {
  console.error("❌  Brak OPENAI_API_KEY w .env.local");
  process.exit(1);
}

const email = process.argv[2] ?? process.env.SEED_EMAIL;
const password = process.argv[3] ?? process.env.SEED_PASSWORD;

if (!email || !password) {
  console.error(
    "❌  Podaj e-mail i hasło:\n" +
      "    pnpm tsx scripts/embed-entries.mts user@example.com haslo123"
  );
  process.exit(1);
}

// ── Pomocnicze ─────────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  // Usuń tagi HTML, zostaw tekst — dla embeddingów liczy się treść, nie znaczniki
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI API błąd ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as {
    data: { embedding: number[]; index: number }[];
  };
  // Posortuj po `index` (OpenAI zwraca w kolejności wejścia, ale na wszelki wypadek)
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

// ── Supabase ───────────────────────────────────────────────────────────────
const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`🔑  Loguję jako ${email}…`);
const { error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (signInError) {
  console.error("❌  Logowanie nie powiodło się:", signInError.message);
  process.exit(1);
}
console.log("✅  Zalogowano.\n");

// ── Pobierz wpisy bez embeddingów ──────────────────────────────────────────
console.log("📥  Pobieram wpisy bez embeddingów…");
const { data: entries, error: fetchError } = await supabase
  .from("entries")
  .select("id, text")
  .is("embedding", null);

if (fetchError) {
  console.error("❌  Nie udało się pobrać wpisów:", fetchError.message);
  process.exit(1);
}

if (!entries || entries.length === 0) {
  console.log("✨  Wszystkie wpisy mają już embeddingi. Nic do zrobienia.");
  await supabase.auth.signOut();
  process.exit(0);
}

console.log(`📊  Znaleziono ${entries.length} wpisów do przetworzenia.\n`);

// ── Generuj embeddingi w batchach ──────────────────────────────────────────
const BATCH_SIZE = 50; // OpenAI pozwala na duże batche; 50 to bezpieczna wartość
let processed = 0;
let failed = 0;

for (let i = 0; i < entries.length; i += BATCH_SIZE) {
  const batch = entries.slice(i, i + BATCH_SIZE);
  const inputs = batch.map((e) => stripHtml(e.text || "").slice(0, 8000));

  // Zabezpieczenie: nie wysyłaj pustych stringów
  const validBatch = batch.filter((_, idx) => inputs[idx].length > 0);
  const validInputs = inputs.filter((t) => t.length > 0);

  if (validInputs.length === 0) {
    console.log(`   ⚠  Batch ${i + 1}–${i + batch.length}: pusty, pominięto`);
    continue;
  }

  try {
    console.log(
      `   →  Batch ${i + 1}–${i + batch.length} / ${entries.length} (${validInputs.length} tekstów)…`
    );
    const embeddings = await embedBatch(validInputs);

    // Update każdego wiersza osobno (Supabase nie obsługuje batch update z różnymi wartościami)
    for (let j = 0; j < validBatch.length; j++) {
      const { error: updateError } = await supabase
        .from("entries")
        .update({ embedding: embeddings[j] as unknown as string })
        .eq("id", validBatch[j].id);

      if (updateError) {
        console.error(`      ❌  Błąd update id=${validBatch[j].id}:`, updateError.message);
        failed++;
      } else {
        processed++;
      }
    }
    console.log(`      ✔  Zapisano ${validBatch.length} embeddingów`);
  } catch (err) {
    console.error(`   ❌  Batch failed:`, err instanceof Error ? err.message : err);
    failed += batch.length;
  }
}

console.log(`\n🎉  Gotowe! Wygenerowano ${processed} embeddingów (błędy: ${failed}).`);
await supabase.auth.signOut();
