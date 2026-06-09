"use client";

import { Loader2, Mic, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RecorderState } from "@/hooks/useAudioRecorder";

interface MicButtonProps {
  state: RecorderState;
  durationMs: number;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function MicButton({
  state,
  durationMs,
  disabled,
  onStart,
  onStop,
}: MicButtonProps) {
  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  const baseBtn =
    "inline-flex h-8 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:bg-accent";

  if (isProcessing) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Transcribing"
          disabled
          className={cn(baseBtn, "w-8 cursor-not-allowed opacity-70")}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
        </button>
        <span className="text-xs text-muted-foreground">Transkrybuję…</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Stop recording"
          onClick={onStop}
          className={cn(
            baseBtn,
            "w-8 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          )}
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
        <span className="flex items-center gap-1.5 text-xs text-red-600">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
          {formatDuration(durationMs)}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label="Record voice note"
      onClick={onStart}
      disabled={disabled}
      className={cn(baseBtn, "w-8", disabled && "cursor-not-allowed opacity-50")}
    >
      <Mic className="h-4 w-4" />
    </button>
  );
}
