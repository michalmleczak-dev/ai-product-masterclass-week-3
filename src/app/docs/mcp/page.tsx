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
    title: "Getting started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "claude-desktop", label: "Connect from Claude Desktop" },
      { id: "cursor", label: "Connect from Cursor" },
    ],
  },
  {
    title: "Authentication",
    items: [{ id: "auth", label: "Bearer token" }],
  },
  {
    title: "Tools",
    items: [
      { id: "tool-create-entry", label: "create_entry", badge: "TOOL" },
      { id: "tool-get-entry", label: "get_entry_by_date", badge: "TOOL" },
      { id: "tool-ask-agent", label: "ask_agent", badge: "TOOL" },
      { id: "tool-transcribe", label: "transcribe_audio", badge: "TOOL" },
    ],
  },
];

function ToolHeader({ name }: { name: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <MethodBadge method="TOOL" />
      <code className="font-mono text-[14px] text-zinc-900">{name}</code>
    </div>
  );
}

export default function McpDocsPage() {
  return (
    <DocsShell
      nav={NAV}
      eyebrow="MCP Reference"
      title="Mood Journal MCP Server"
      intro={
        <>
          <p>
            The Mood Journal MCP server lets any MCP-compatible AI agent (Claude
            Desktop, Cursor, Windsurf, custom agents) read and write your journal
            entries and talk to the in-app therapist agent. It exposes the same
            capabilities as the REST API, packaged as tools.
          </p>
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-zinc-600">
              Endpoint
            </p>
            <Pre>{`https://your-app.vercel.app/api/mcp`}</Pre>
            <p className="mt-1.5 text-[13px] text-zinc-600">
              Streamable HTTP transport. Send your Supabase access token as a
              Bearer header — use <strong>Generate token</strong> above.
            </p>
          </div>
        </>
      }
    >
      <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Getting started
      </h2>

      <Section id="overview">
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">Overview</h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          The server speaks the Model Context Protocol over Streamable HTTP. Any
          client that supports remote MCP can connect by pointing at{" "}
          <Code>/api/mcp</Code> and sending an <Code>Authorization: Bearer</Code>{" "}
          header. Stdio-only clients (older Claude Desktop builds) can wrap it
          with <Code>mcp-remote</Code>.
        </p>
        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">
          Available tools
        </h4>
        <ul className="space-y-1 text-[13.5px] text-zinc-700">
          <li><Code>create_entry</Code> — create or update a journal entry</li>
          <li><Code>get_entry_by_date</Code> — read an entry by date</li>
          <li><Code>ask_agent</Code> — talk to the Claude-backed therapist agent</li>
          <li><Code>transcribe_audio</Code> — transcribe audio via Whisper v3</li>
        </ul>
      </Section>

      <Section id="claude-desktop">
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">
          Connect from Claude Desktop
        </h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          Open Claude Desktop → Settings → Developer → <Code>Edit Config</Code>{" "}
          and add the server to <Code>claude_desktop_config.json</Code>:
        </p>
        <Pre>{`{
  "mcpServers": {
    "mood-journal": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer <PASTE_TOKEN>"
      }
    }
  }
}`}</Pre>
        <p className="mt-4 text-[13.5px] text-zinc-700">
          If your Claude Desktop build only supports stdio, wrap with{" "}
          <Code>mcp-remote</Code>:
        </p>
        <Pre>{`{
  "mcpServers": {
    "mood-journal": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-app.vercel.app/api/mcp",
        "--header",
        "Authorization: Bearer <PASTE_TOKEN>"
      ]
    }
  }
}`}</Pre>
      </Section>

      <Section id="cursor">
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">
          Connect from Cursor
        </h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          In Cursor: Settings → MCP → <Code>+ Add new MCP server</Code>. Use
          Streamable HTTP transport:
        </p>
        <Pre>{`{
  "mcpServers": {
    "mood-journal": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer <PASTE_TOKEN>"
      }
    }
  }
}`}</Pre>
      </Section>

      <h2 className="mb-6 mt-14 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Authentication
      </h2>

      <Section id="auth">
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">Bearer token</h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          All tools except <Code>transcribe_audio</Code> require a Supabase
          access token. Click <strong>Generate token</strong> in the top bar
          while signed in, copy the value, and paste it into your client config
          as <Code>Authorization: Bearer &lt;token&gt;</Code>.
        </p>
        <p className="text-[13.5px] text-zinc-700">
          Tokens expire after about an hour. When your agent starts seeing{" "}
          <Code>401</Code> errors, refresh the token from this page and update
          your client config.
        </p>
      </Section>

      <h2 className="mb-6 mt-14 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Tools
      </h2>

      <Section id="tool-create-entry">
        <ToolHeader name="create_entry" />
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">
          Create or update a journal entry
        </h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          Wraps <Code>POST /api/entries</Code>. Upserts by{" "}
          <Code>user_id + date</Code>; mood is inferred from <Code>text</Code> if
          omitted.
        </p>
        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Input</h4>
        <Pre>{`{
  "text": "string (required)",
  "date": "YYYY-MM-DD (optional, defaults to today)",
  "mood": "integer 1..5 (optional, otherwise inferred)"
}`}</Pre>
        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Output</h4>
        <Pre>{`{
  "status": 201,
  "body": {
    "entry": {
      "id": "uuid",
      "date": "2026-06-07",
      "moodLabel": "Happy",
      "moodCategory": "Positive",
      "text": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}`}</Pre>
      </Section>

      <Section id="tool-get-entry">
        <ToolHeader name="get_entry_by_date" />
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">
          Get journal entry by date
        </h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          Wraps <Code>GET /api/entries/{`{date}`}</Code>.
        </p>
        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Input</h4>
        <Pre>{`{ "date": "YYYY-MM-DD" }`}</Pre>
        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Output</h4>
        <Pre>{`{
  "status": 200,
  "body": {
    "entry": { /* same shape as REST */ }
  }
}`}</Pre>
      </Section>

      <Section id="tool-ask-agent">
        <ToolHeader name="ask_agent" />
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">
          Ask the Mood Journal agent
        </h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          Wraps <Code>POST /api/agent</Code>. Non-streaming; full reply returned
          in one tool result.
        </p>
        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Input</h4>
        <Pre>{`{
  "messages": [
    { "role": "user" | "assistant", "content": "string" }
  ],
  "date": "YYYY-MM-DD (optional)"
}`}</Pre>
        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Output</h4>
        <Pre>{`{
  "status": 200,
  "body": {
    "reply": "...",
    "toolCalls": [],
    "crisis": false
  }
}`}</Pre>
      </Section>

      <Section id="tool-transcribe">
        <ToolHeader name="transcribe_audio" />
        <h3 className="mb-2 text-xl font-semibold text-zinc-900">
          Transcribe audio to text
        </h3>
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-700">
          Wraps <Code>POST /api/transcribe</Code>. Accepts base64-encoded audio
          and forwards it to Whisper v3. Max 25&nbsp;MB after decoding. No
          Bearer token required.
        </p>
        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Input</h4>
        <Pre>{`{
  "audio_base64": "string (base64, no data: prefix)",
  "mime_type": "audio/webm",
  "filename": "recording.webm"
}`}</Pre>
        <h4 className="mb-2 mt-6 text-[13px] font-semibold text-zinc-900">Output</h4>
        <Pre>{`{
  "status": 200,
  "body": { "text": "transcribed speech goes here" }
}`}</Pre>
      </Section>

      <p className="mt-12 text-xs text-zinc-500">
        Server source:{" "}
        <Code>app/src/app/api/[transport]/route.ts</Code>. Powered by{" "}
        <Code>mcp-handler</Code> on Vercel.
      </p>
    </DocsShell>
  );
}
