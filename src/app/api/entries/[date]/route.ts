import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { fromRow } from "@/lib/entry-mapper";
import { makeUserClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  request: Request,
  { params }: { params: { date: string } }
) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const { date } = params;
  if (!DATE_RE.test(date)) {
    return NextResponse.json(
      { error: "`date` must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const sb = makeUserClient(auth.accessToken);
  const { data, error } = await sb
    .from("entries")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.error("[GET /api/entries/[date]] failed", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "No entry for this date" },
      { status: 404 }
    );
  }

  return NextResponse.json({ entry: fromRow(data) });
}
