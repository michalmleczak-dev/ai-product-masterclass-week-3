import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

type IncomingHeaders = Record<string, string | string[] | undefined>;

function headerValue(headers: IncomingHeaders, name: string): string | null {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function originFromHeaders(headers: IncomingHeaders): string {
  const proto =
    headerValue(headers, "x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const host =
    headerValue(headers, "x-forwarded-host") ||
    headerValue(headers, "host") ||
    "localhost:3000";
  return `${proto}://${host}`;
}

function bearer(headers: IncomingHeaders): string | null {
  const h = headerValue(headers, "authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

function authError(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: message, status: 401 }),
      },
    ],
    isError: true,
  };
}

function toolResult(payload: unknown, isError = false) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
    isError,
  };
}

async function relayJson(
  incoming: IncomingHeaders,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  requireToken = true,
) {
  const token = bearer(incoming);
  if (requireToken && !token) return authError("Missing Bearer token");

  const origin = originFromHeaders(incoming);
  const headers: Record<string, string> = {};
  if (token) headers["authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";

  const res = await fetch(`${origin}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep as text */
  }

  return toolResult(
    { status: res.status, body: parsed },
    !res.ok,
  );
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "create_entry",
      {
        title: "Create or update a journal entry",
        description:
          "Creates a Mood Journal entry for a given date (or today). If `mood` is omitted, it is inferred from `text` (1-5). Upserts by user_id + date.",
        inputSchema: {
          text: z.string().min(1).describe("Entry body"),
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe("ISO date YYYY-MM-DD (defaults to today)"),
          mood: z
            .number()
            .int()
            .min(1)
            .max(5)
            .optional()
            .describe("Optional mood score 1..5"),
        },
      },
      async ({ text, date, mood }, extra) => {
        const headers = (extra.requestInfo?.headers ?? {}) as IncomingHeaders;
        return relayJson(headers, "POST", "/api/entries", { text, date, mood });
      },
    );

    server.registerTool(
      "get_entry_by_date",
      {
        title: "Get journal entry by date",
        description:
          "Returns the authenticated user's Mood Journal entry for the given date, if any.",
        inputSchema: {
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe("ISO date YYYY-MM-DD"),
        },
      },
      async ({ date }, extra) => {
        const headers = (extra.requestInfo?.headers ?? {}) as IncomingHeaders;
        return relayJson(headers, "GET", `/api/entries/${date}`);
      },
    );

    server.registerTool(
      "ask_agent",
      {
        title: "Ask the Mood Journal agent",
        description:
          "Runs the in-app Claude agent over a chat history and returns the full reply. Pass an optional `date` to load that day's entry as context.",
        inputSchema: {
          messages: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string(),
              }),
            )
            .min(1)
            .describe("Chat history; must end with a user message"),
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
        },
      },
      async ({ messages, date }, extra) => {
        const headers = (extra.requestInfo?.headers ?? {}) as IncomingHeaders;
        return relayJson(headers, "POST", "/api/agent", { messages, date });
      },
    );

    server.registerTool(
      "transcribe_audio",
      {
        title: "Transcribe audio to text",
        description:
          "Transcribes a base64-encoded audio blob using Groq Whisper v3 (Polish). Max 25 MB after decoding.",
        inputSchema: {
          audio_base64: z
            .string()
            .min(1)
            .describe("Base64-encoded audio (no data: prefix)"),
          mime_type: z
            .string()
            .default("audio/webm")
            .describe("MIME type, e.g. audio/webm"),
          filename: z.string().default("recording.webm").optional(),
        },
      },
      async ({ audio_base64, mime_type, filename }, extra) => {
        const headers = (extra.requestInfo?.headers ?? {}) as IncomingHeaders;

        let bytes: Buffer;
        try {
          bytes = Buffer.from(audio_base64, "base64");
        } catch {
          return toolResult({ error: "Invalid base64" }, true);
        }
        if (bytes.byteLength === 0) {
          return toolResult({ error: "Empty audio" }, true);
        }
        if (bytes.byteLength > 25 * 1024 * 1024) {
          return toolResult({ error: "Audio exceeds 25 MB" }, true);
        }

        const blob = new Blob([new Uint8Array(bytes)], { type: mime_type });
        const form = new FormData();
        form.append("file", blob, filename ?? "recording.webm");

        const origin = originFromHeaders(headers);
        const res = await fetch(`${origin}/api/transcribe`, {
          method: "POST",
          body: form,
        });
        const text = await res.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          /* keep as text */
        }
        return toolResult({ status: res.status, body: parsed }, !res.ok);
      },
    );
  },
  {},
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: false,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
