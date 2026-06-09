"use client";

import {
  Code,
  DocsShell,
  MethodBadge,
  Pre,
  Section,
  type NavSection,
} from "../_components/DocsShell";

const NAV: NavSection[] = [
  {
    title: "Create",
    items: [
      { id: "create-entry", label: "Create entry", badge: "POST" },
      { id: "create-transcribe", label: "Transcribe audio", badge: "POST" },
    ],
  },
  {
    title: "Ask",
    items: [
      { id: "ask-agent", label: "Ask agent", badge: "POST" },
      { id: "ask-therapist", label: "Therapist chat (stream)", badge: "POST" },
    ],
  },
  {
    title: "Read",
    items: [{ id: "read-entry", label: "Get entry by date", badge: "GET" }],
  },
];

function EndpointHeader({
  method,
  path,
}: {
  method: "GET" | "POST";
  path: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <MethodBadge method={method} />
      <code className="font-mono text-[14px] text-zinc-900">{path}</code>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <DocsShell
      nav={NAV}
      eyebrow="API Reference"
      title="Mood Journal API"
      intro={
        <>
          <p>
            The Mood Journal API lets you create entries, read past entries by date,
            and talk to the in-app AI therapist. All endpoints (except where noted)
            are scoped to the authenticated user and return JSON.
          </p>
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-zinc-600">
              Authentication
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-700">
              All <Code>/api/*</Code> endpoints (except <Code>/api/transcribe</Code>)
              require a Supabase access token sent as a Bearer header. Use the{" "}
              <strong>Generate token</strong> button in the top bar to grab yours.
            </p>
            <Pre>{`Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`}</Pre>
          </div>
        </>
      }
    >
      <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Create
      </h2>

      <Section id="create-entry">
        <EndpointHeader method="POST" path="/api/entries" />
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">
          Create or update an entry
        </h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          Creates a journal entry for a given date, or replaces text + mood on the
          existing one (upserted by <Code>user_id + date</Code>). If <Code>mood</Code>{" "}
          is omitted, the mood score (1–5) is inferred from <Code>text</Code> by the
          Claude-backed mood inferrer.
        </p>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Body</h4>
        <Pre>{`{
  "text": "string (required)",
  "date": "YYYY-MM-DD (optional, defaults to today)",
  "mood": "integer 1..5 (optional, otherwise inferred)"
}`}</Pre>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Example</h4>
        <Pre>{`curl -X POST https://your-app.vercel.app/api/entries \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "text": "Great walk in the park today.", "date": "2026-06-07" }'`}</Pre>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Response · 201</h4>
        <Pre>{`{
  "entry": {
    "id": "uuid",
    "date": "2026-06-07",
    "moodLabel": "Happy",
    "moodCategory": "Positive",
    "text": "Great walk in the park today.",
    "createdAt": "2026-06-07T12:34:56.000Z",
    "updatedAt": "2026-06-07T12:34:56.000Z"
  }
}`}</Pre>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Errors</h4>
        <ul className="space-y-1 text-[13.5px] text-zinc-700">
          <li><Code>400</Code> — invalid JSON, missing <Code>text</Code>, bad date or mood.</li>
          <li><Code>401</Code> — missing or invalid Bearer token.</li>
          <li><Code>500</Code> — database error.</li>
          <li><Code>502</Code> — mood inference upstream failed.</li>
        </ul>
      </Section>

      <Section id="create-transcribe">
        <EndpointHeader method="POST" path="/api/transcribe" />
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">Transcribe audio</h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          Forwards an audio file to Groq&apos;s Whisper&nbsp;v3 endpoint and returns
          the transcript. Polish (<Code>pl</Code>) is the active language. Max upload
          size: <Code>25&nbsp;MB</Code>. This endpoint does not require auth.
        </p>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Body</h4>
        <p className="mb-2 text-[13.5px] text-zinc-700">
          <Code>multipart/form-data</Code> with a single <Code>file</Code> field
          containing the audio blob (e.g. <Code>audio/webm</Code>).
        </p>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Example</h4>
        <Pre>{`curl -X POST https://your-app.vercel.app/api/transcribe \\
  -F "file=@recording.webm"`}</Pre>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Response · 200</h4>
        <Pre>{`{ "text": "transcribed speech goes here" }`}</Pre>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Errors</h4>
        <ul className="space-y-1 text-[13.5px] text-zinc-700">
          <li><Code>400</Code> — invalid form data, missing or empty <Code>file</Code>.</li>
          <li><Code>413</Code> — file exceeds 25 MB.</li>
          <li><Code>500</Code> — server misconfigured (missing <Code>GROQ_API_KEY</Code>).</li>
          <li><Code>502</Code> — Groq upstream error.</li>
        </ul>
      </Section>

      <h2 className="mb-6 mt-14 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Ask
      </h2>

      <Section id="ask-agent">
        <EndpointHeader method="POST" path="/api/agent" />
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">
          Ask the agent (non-streaming)
        </h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          Runs the in-app Claude agent over a chat history and returns the full reply
          in a single response. Pass an optional <Code>date</Code> so the agent has
          the corresponding journal entry as context.
        </p>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Body</h4>
        <Pre>{`{
  "messages": [
    { "role": "user" | "assistant", "content": "string" }
  ],                                     // must end with a user message
  "date": "YYYY-MM-DD (optional)"        // entry on that date is loaded as context
}`}</Pre>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Example</h4>
        <Pre>{`curl -X POST https://your-app.vercel.app/api/agent \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      { "role": "user", "content": "Why have I felt low this week?" }
    ],
    "date": "2026-06-07"
  }'`}</Pre>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Response · 200</h4>
        <Pre>{`{
  "reply": "Looking at your entries this week ...",
  "toolCalls": [ /* tool invocations the agent made */ ],
  "crisis": false
}`}</Pre>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Errors</h4>
        <ul className="space-y-1 text-[13.5px] text-zinc-700">
          <li><Code>400</Code> — invalid JSON, bad <Code>messages</Code>, or bad <Code>date</Code>.</li>
          <li><Code>401</Code> — missing or invalid Bearer token.</li>
          <li><Code>500</Code> — database or internal error.</li>
        </ul>
      </Section>

      <Section id="ask-therapist">
        <EndpointHeader method="POST" path="/api/therapist/chat" />
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">
          Therapist chat (streaming)
        </h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          Same agent as <Code>/api/agent</Code>, but streamed as Server-Sent Events.
          Use this for the in-app therapist panel to render the reply token-by-token.
        </p>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Body</h4>
        <Pre>{`{
  "messages": [
    { "role": "user" | "assistant", "content": "string" }
  ],
  "currentEntryId": "uuid (optional) — entry to load as context"
}`}</Pre>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">
          Response · 200 · text/event-stream
        </h4>
        <p className="mb-2 text-[13.5px] text-zinc-700">
          Events emitted as SSE frames (<Code>event:</Code> + <Code>data:</Code>):
        </p>
        <ul className="mb-3 space-y-1 text-[13.5px] text-zinc-700">
          <li><Code>token</Code> — <Code>{`{ "text": "partial..." }`}</Code></li>
          <li><Code>tool_call</Code> — agent invoked a tool</li>
          <li><Code>crisis</Code> — <Code>{`{ "helpline": "116 123" }`}</Code> if a crisis signal is detected</li>
          <li><Code>done</Code> — stream finished</li>
          <li><Code>error</Code> — <Code>{`{ "message": "..." }`}</Code></li>
        </ul>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Errors</h4>
        <ul className="space-y-1 text-[13.5px] text-zinc-700">
          <li><Code>400</Code> — invalid JSON or empty <Code>messages</Code>.</li>
          <li><Code>401</Code> — missing or invalid Bearer token.</li>
        </ul>
      </Section>

      <h2 className="mb-6 mt-14 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Read
      </h2>

      <Section id="read-entry">
        <EndpointHeader method="GET" path="/api/entries/{date}" />
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">Get entry by date</h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          Returns the authenticated user&apos;s entry for the given date, if any.
        </p>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Path parameter</h4>
        <ul className="space-y-1 text-[13.5px] text-zinc-700">
          <li><Code>date</Code> — ISO date in <Code>YYYY-MM-DD</Code> format.</li>
        </ul>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Example</h4>
        <Pre>{`curl https://your-app.vercel.app/api/entries/2026-06-07 \\
  -H "Authorization: Bearer $TOKEN"`}</Pre>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Response · 200</h4>
        <Pre>{`{
  "entry": {
    "id": "uuid",
    "date": "2026-06-07",
    "moodLabel": "Happy",
    "moodCategory": "Positive",
    "text": "Great walk in the park today.",
    "createdAt": "2026-06-07T12:34:56.000Z",
    "updatedAt": "2026-06-07T12:34:56.000Z"
  }
}`}</Pre>

        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Errors</h4>
        <ul className="space-y-1 text-[13.5px] text-zinc-700">
          <li><Code>400</Code> — date not in <Code>YYYY-MM-DD</Code> format.</li>
          <li><Code>401</Code> — missing or invalid Bearer token.</li>
          <li><Code>404</Code> — no entry exists for that date.</li>
          <li><Code>500</Code> — database error.</li>
        </ul>
      </Section>

      <p className="mt-12 text-xs text-zinc-500">
        Need to test locally? Click <strong>Generate token</strong> in the top bar
        while signed in to grab your Supabase access token.
      </p>
    </DocsShell>
  );
}
