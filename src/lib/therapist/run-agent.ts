import type { Entry } from "@/lib/entry-mapper";

import { detectCrisis, getGrokKey, GROK_MODEL, GROK_URL } from "./grok-client";
import { buildSystemPrompt } from "./system-prompt";
import { runTool, THERAPIST_TOOLS } from "./tools";

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
}

export interface RunAgentInput {
  messages: { role: "user" | "assistant"; content: string }[];
  currentEntry: Entry | null;
  accessToken: string;
  onToken?: (text: string) => void;
  onToolCall?: (call: ToolCallInfo) => void;
  onCrisis?: () => void;
}

export interface RunAgentResult {
  text: string;
  toolCalls: ToolCallInfo[];
  crisis: boolean;
}

export class AgentError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const apiKey = getGrokKey();
  if (!apiKey) {
    throw new AgentError("Server misconfiguration: missing XAI_API_KEY", 500);
  }

  const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
  const crisis = lastUser ? detectCrisis(lastUser.content) : false;
  if (crisis) input.onCrisis?.();

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(input.currentEntry) },
    ...input.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const toolCallsAll: ToolCallInfo[] = [];
  let finalText = "";

  for (let step = 0; step < 5; step++) {
    const upstream = await fetch(GROK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages,
        tools: THERAPIST_TOOLS,
        tool_choice: "auto",
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      console.error("[runAgent] Grok error", upstream.status, detail);
      throw new AgentError("Upstream error", 502);
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";
    const toolCalls = new Map<
      number,
      { id: string; name: string; args: string }
    >();

    let done = false;
    while (!done) {
      const { value, done: rdone } = await reader.read();
      if (rdone) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") {
          done = true;
          break;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          if (!delta) continue;
          if (typeof delta.content === "string" && delta.content.length > 0) {
            assistantContent += delta.content;
            input.onToken?.(delta.content);
          }
          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              const slot = toolCalls.get(idx) ?? { id: "", name: "", args: "" };
              if (tc.id) slot.id = tc.id;
              if (tc.function?.name) slot.name = tc.function.name;
              if (tc.function?.arguments) slot.args += tc.function.arguments;
              toolCalls.set(idx, slot);
            }
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }

    if (toolCalls.size === 0) {
      finalText = assistantContent;
      return { text: finalText, toolCalls: toolCallsAll, crisis };
    }

    const calls = Array.from(toolCalls.values());
    messages.push({
      role: "assistant",
      content: assistantContent,
      tool_calls: calls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: c.args || "{}" },
      })),
    });

    for (const call of calls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = call.args ? JSON.parse(call.args) : {};
      } catch {
        parsedArgs = {};
      }
      const info: ToolCallInfo = { name: call.name, args: parsedArgs };
      toolCallsAll.push(info);
      input.onToolCall?.(info);
      const result = await runTool(call.name, parsedArgs, input.accessToken);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return { text: finalText, toolCalls: toolCallsAll, crisis };
}
