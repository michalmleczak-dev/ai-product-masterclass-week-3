"use client";

import { Info, Loader2, Mic, Plus, Send, Square, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEntry } from "@/hooks/useCurrentEntry";

export const JOURNAL_VOICE_INPUT_EVENT = "mood-journal:voice-input";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const HELPLINE = "116 123";

export function TherapistPanel() {
  const [open, setOpen] = useState(false);
  const { session } = useAuth();
  const { entry, label } = useCurrentEntry();
  const pathname = usePathname();
  const journalMode = pathname === "/";
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recorder = useAudioRecorder();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  if (!session) return null;

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || streaming) return;
    const nextMsgs: ChatMsg[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...nextMsgs, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setToolStatus(null);

    try {
      const res = await fetch("/api/therapist/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: nextMsgs,
          currentEntryId: entry?.id ?? null,
        }),
      });

      if (!res.ok || !res.body) {
        let detail = "";
        try {
          const data = await res.json();
          detail = (data as { error?: string })?.error ?? "";
        } catch {}
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: detail
              ? `Therapist unavailable: ${detail}`
              : "Sorry, something went wrong reaching the therapist.",
          };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let event = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          if (raw.startsWith("event: ")) {
            event = raw.slice(7).trim();
          } else if (raw.startsWith("data: ")) {
            const data = raw.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (event === "token") {
                setMessages((m) => {
                  const copy = [...m];
                  const last = copy[copy.length - 1];
                  copy[copy.length - 1] = {
                    role: "assistant",
                    content: last.content + parsed.text,
                  };
                  return copy;
                });
              } else if (event === "tool_call") {
                setToolStatus(
                  parsed.name === "get_mood_stats"
                    ? "Looking at your mood trends…"
                    : "Looking at your entries…"
                );
              } else if (event === "crisis") {
                setCrisis(true);
              } else if (event === "done" || event === "error") {
                setToolStatus(null);
              }
            } catch {}
          } else if (raw === "") {
            event = "";
          }
        }
      }
    } finally {
      setStreaming(false);
      setToolStatus(null);
    }
  };

  const transcribe = async (blob: Blob): Promise<string | null> => {
    const form = new FormData();
    const filename = blob.type.includes("mp4") ? "audio.mp4" : "audio.webm";
    form.append("file", blob, filename);
    const res = await fetch("/api/transcribe", { method: "POST", body: form });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Transcription failed" }));
      setVoiceError(error || "Transcription failed");
      return null;
    }
    const { text } = (await res.json()) as { text: string };
    return text || null;
  };

  const startRecording = async () => {
    setVoiceError(null);
    if (!journalMode && !open) setOpen(true);
    await recorder.start();
  };

  const stopAndDispatch = async () => {
    const blob = await recorder.stop();
    if (!blob) {
      recorder.reset();
      return;
    }
    recorder.setProcessing();
    const text = await transcribe(blob);
    recorder.reset();
    if (!text) return;
    if (journalMode) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(JOURNAL_VOICE_INPUT_EVENT, { detail: { text } })
        );
      }
    } else {
      await sendMessage(text);
    }
  };

  const handleMicClick = async () => {
    if (recorder.state === "idle" || recorder.state === "error") {
      await startRecording();
      return;
    }
    if (recorder.state === "recording") {
      await stopAndDispatch();
    }
  };

  const sendText = () => sendMessage(input);

  const fabState: "idle" | "recording" | "processing" =
    recorder.state === "recording"
      ? "recording"
      : recorder.state === "processing"
      ? "processing"
      : "idle";

  const fabLabel =
    fabState === "recording"
      ? "Stop recording"
      : fabState === "processing"
      ? "Transcribing"
      : journalMode
      ? "Add entry by voice"
      : "Talk to therapist";

  const fabClass =
    fabState === "recording"
      ? "bg-red-600"
      : fabState === "processing"
      ? "bg-foreground/70"
      : "bg-foreground";

  return (
    <>
      <button
        type="button"
        aria-label={fabLabel}
        onClick={handleMicClick}
        disabled={fabState === "processing"}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-80 ${fabClass}`}
      >
        {fabState === "recording" ? (
          <Square className="h-5 w-5 fill-current" />
        ) : fabState === "processing" ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : journalMode ? (
          <Plus className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
        {fabState === "recording" && (
          <span className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-red-400" />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close"
            className="flex-1 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <aside className="flex h-full w-full max-w-[420px] flex-col bg-white shadow-xl">
            <header className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A8D5BA] text-sm font-semibold">
                  AB
                </div>
                <div>
                  <p className="text-sm font-semibold">Dr. Beck</p>
                  <p className="text-xs text-muted-foreground">CBT therapist · AI</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close panel"
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 text-xs">
              <span className="text-muted-foreground">
                Looking at: <span className="font-medium text-foreground">{label}</span>
              </span>
              <button
                type="button"
                aria-label="About"
                onClick={() => setShowDisclaimer((v) => !v)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>

            {showDisclaimer && (
              <div className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-900">
                I&apos;m an AI, not a licensed therapist. For serious concerns please
                reach out to a professional.
              </div>
            )}

            {crisis && (
              <div className="border-b bg-red-600 px-4 py-2 text-xs font-medium text-white">
                If you&apos;re in crisis, call <span className="font-bold">{HELPLINE}</span>{" "}
                (free, 24/7).
              </div>
            )}

            {(recorder.state === "recording" ||
              recorder.state === "processing" ||
              voiceError ||
              recorder.error) && (
              <div className="flex items-center gap-2 border-b bg-red-50 px-4 py-2 text-xs text-red-700">
                {recorder.state === "recording" && (
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
                )}
                {recorder.state === "recording" &&
                  `Recording… ${formatDuration(recorder.durationMs)}`}
                {recorder.state === "processing" && "Transcribing your voice…"}
                {(voiceError || recorder.error) &&
                  recorder.state === "idle" &&
                  (voiceError || recorder.error)}
              </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Tap the mic to talk, or type a message below.
                </p>
              )}
              {messages.map((m, i) => {
                const showTyping =
                  m.role === "assistant" &&
                  !m.content &&
                  streaming &&
                  i === messages.length - 1;
                return (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-foreground text-white"
                          : "bg-[#A8D5BA]/30 text-foreground"
                      }`}
                    >
                      {showTyping ? (
                        <span
                          className="flex items-center gap-1.5 py-1"
                          aria-label="Dr. Beck is typing"
                          role="status"
                        >
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </span>
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                );
              })}
              {toolStatus && (
                <div className="text-xs italic text-muted-foreground">{toolStatus}</div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendText();
              }}
              className="border-t p-3"
            >
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendText();
                    }
                  }}
                  placeholder="Type a message…"
                  rows={1}
                  disabled={fabState !== "idle"}
                  className="flex-1 resize-none rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-60"
                />
                <Button
                  type="button"
                  size="icon"
                  variant={fabState === "recording" ? "destructive" : "outline"}
                  onClick={handleMicClick}
                  disabled={fabState === "processing" || streaming}
                  aria-label={
                    fabState === "recording" ? "Stop recording" : "Record voice message"
                  }
                >
                  {fabState === "recording" ? (
                    <Square className="h-4 w-4 fill-current" />
                  ) : fabState === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  disabled={streaming || !input.trim() || fabState !== "idle"}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
