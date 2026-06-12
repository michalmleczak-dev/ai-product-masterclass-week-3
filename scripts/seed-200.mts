/**
 * Seed script — wgrywa ~179 historycznych wpisów Marty do Supabase.
 *
 * Wymaga zalogowanego użytkownika: podaj e-mail i hasło jako argumenty,
 * albo ustaw SEED_EMAIL i SEED_PASSWORD w .env.local.
 *
 * Uruchomienie:
 *   cd app
 *   pnpm tsx scripts/seed-200.mts
 *
 * lub z argumentami:
 *   pnpm tsx scripts/seed-200.mts user@example.com haslo123
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ręczne wczytanie .env.local bez zależności od dotenv
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
  // .env.local nie istnieje — zmienne mogą być ustawione inaczej
}

// ── Importuj dane ──────────────────────────────────────────────────────────
// Używamy dynamicznego importu żeby tsx mógł przetworzyć TypeScript
const { SEED_200 } = await import("../src/lib/seed-200.js");

// ── Konfiguracja ───────────────────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("❌  Brak NEXT_PUBLIC_SUPABASE_URL lub NEXT_PUBLIC_SUPABASE_ANON_KEY w .env.local");
  process.exit(1);
}

const email = process.argv[2] ?? process.env.SEED_EMAIL;
const password = process.argv[3] ?? process.env.SEED_PASSWORD;

if (!email || !password) {
  console.error(
    "❌  Podaj e-mail i hasło:\n" +
    "    pnpm tsx scripts/seed-200.mts user@example.com haslo123\n" +
    "    lub ustaw SEED_EMAIL i SEED_PASSWORD w .env.local"
  );
  process.exit(1);
}

// ── Supabase client ────────────────────────────────────────────────────────
const supabase = createClient(url, anonKey);

// ── Logowanie ──────────────────────────────────────────────────────────────
console.log(`🔑  Loguję jako ${email}…`);
const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) {
  console.error("❌  Logowanie nie powiodło się:", signInError.message);
  process.exit(1);
}
console.log("✅  Zalogowano.\n");

// ── Upsert wpisów ──────────────────────────────────────────────────────────
const BATCH = 50; // Supabase przyjmuje do ~500, ale 50 jest bezpieczne
let inserted = 0;
let skipped = 0;

for (let i = 0; i < SEED_200.length; i += BATCH) {
  const chunk = SEED_200.slice(i, i + BATCH);

  const { error } = await supabase
    .from("entries")
    .upsert(chunk, { onConflict: "id" });  // id-based upsert — bezpieczne przy re-runach

  if (error) {
    console.error(`❌  Błąd przy wpisach ${i}–${i + chunk.length}:`, error.message);
    console.error("    Szczegóły:", JSON.stringify(error, null, 2));
  } else {
    inserted += chunk.length;
    console.log(`   ✔  Wsady ${i + 1}–${Math.min(i + BATCH, SEED_200.length)} / ${SEED_200.length} dodane`);
  }
}

console.log(`\n🎉  Gotowe! Dodano ${inserted} wpisów (pominięto/błędy: ${SEED_200.length - inserted}).`);
console.log("    Otwórz aplikację → /entries żeby zobaczyć historię Marty.");

await supabase.auth.signOut();
