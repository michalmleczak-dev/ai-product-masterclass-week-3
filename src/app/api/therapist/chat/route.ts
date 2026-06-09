import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { fromRow, type Entry } from "@/lib/entry-mapper";
import { makeUserClient } from "@/lib/supabase-server";
import { AgentError, runAgent } from "@/lib/therapist/run-agent";

export const runtime = "nodejs";

interface RequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  currentEntryId?: string | null;
}

function sse(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

async function loadEntryById(
  accessToken: string,
  entryId: string
): Promise<Entry | null> {
  const sb = makeUserClient(accessToken);
  const { data, error } = await sb
    .from("entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();
  if (error || !data) return null;
  return fromRow(data);
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
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const currentEntry = body.currentEntryId
    ? await loadEntryById(auth.accessToken, body.currentEntryId)
    : null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await runAgent({
          messages: body.messages,
          currentEntry,
          accessToken: auth.accessToken,
          onCrisis: () => {
            controller.enqueue(sse("crisis", { helpline: "116 123" }));
          },
          onToken: (text) => {
            controller.enqueue(sse("token", { text }));
          },
          onToolCall: (call) => {
            controller.enqueue(sse("tool_call", call));
          },
        });
        controller.enqueue(sse("done", {}));
        controller.close();
      } catch (err) {
        console.error("[therapist] stream error", err);
        try {
          if (err instanceof AgentError) {
            controller.enqueue(sse("error", { message: err.message }));
          } else {
            controller.enqueue(sse("error", { message: "Stream error" }));
          }
        } catch {}
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
