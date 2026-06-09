import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { fromRow, type Entry } from "@/lib/entry-mapper";
import { makeUserClient } from "@/lib/supabase-server";
import { AgentError, runAgent } from "@/lib/therapist/run-agent";

export const runtime = "nodejs";

interface RequestBody {
  messages?: unknown;
  date?: unknown;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validMessages(
  value: unknown
): value is { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  for (const m of value) {
    if (!m || typeof m !== "object") return false;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") return false;
    if (typeof content !== "string") return false;
  }
  return value[value.length - 1].role === "user";
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

  if (!validMessages(body.messages)) {
    return NextResponse.json(
      { error: "`messages` must be a non-empty array ending with a user message" },
      { status: 400 }
    );
  }

  let date: string | null = null;
  if (body.date !== undefined && body.date !== null) {
    if (typeof body.date !== "string" || !DATE_RE.test(body.date)) {
      return NextResponse.json(
        { error: "`date` must be YYYY-MM-DD" },
        { status: 400 }
      );
    }
    date = body.date;
  }

  let currentEntry: Entry | null = null;
  if (date) {
    const sb = makeUserClient(auth.accessToken);
    const { data, error } = await sb
      .from("entries")
      .select("*")
      .eq("date", date)
      .maybeSingle();
    if (error) {
      console.error("[POST /api/agent] entry lookup failed", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    if (data) currentEntry = fromRow(data);
  }

  try {
    const result = await runAgent({
      messages: body.messages,
      currentEntry,
      accessToken: auth.accessToken,
    });
    return NextResponse.json({
      reply: result.text,
      toolCalls: result.toolCalls,
      crisis: result.crisis,
    });
  } catch (err) {
    if (err instanceof AgentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[POST /api/agent] failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
