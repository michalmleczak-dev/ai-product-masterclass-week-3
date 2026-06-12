import { NextResponse } from "next/server";

import { requireVerifiedAuth } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { hybridSearch } from "@/lib/search";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireVerifiedAuth(request);
  if (!auth.ok) return auth.response;

  const limit = checkRateLimit(auth.userId);
  if (!limit.ok) return limit.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ error: "Missing query param `q`" }, { status: 400 });
  }

  try {
    const entries = await hybridSearch(q, auth.accessToken, 30);
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[GET /api/entries/search] failed", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
