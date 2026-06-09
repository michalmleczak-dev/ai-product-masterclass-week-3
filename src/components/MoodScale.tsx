"use client";

import { useCallback, useMemo, useRef } from "react";

import { ALL_LABELS, getMoodDef } from "@/lib/moods";
import { MoodPill } from "./MoodPill";

interface MoodScaleProps {
  value: string | null;
  onChange: (label: string) => void;
}

// Half cosine over the scale: peak at the left edge (Joyful, +1),
// zero crossing in the middle, trough at the right edge (Devastated, -1).
// Range: [-1, 1]. Deterministic so SSR == CSR.
function computeAmplitudes(n: number): number[] {
  if (n <= 1) return [1];
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1); // 0..1
    return Math.cos(t * Math.PI);
  });
}

export function MoodScale({ value, onChange }: MoodScaleProps) {
  const labels = ALL_LABELS;
  const selectedIdx = value ? labels.indexOf(value) : -1;
  const amplitudes = useMemo(
    () => computeAmplitudes(labels.length),
    [labels.length]
  );

  const railRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const idx = Math.round(t * (labels.length - 1));
      const label = labels[idx];
      if (label && label !== value) onChange(label);
    },
    [labels, value, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* noop */
    }
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const endDrag = () => {
    draggingRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(0, (selectedIdx < 0 ? 0 : selectedIdx) - 1);
      onChange(labels[next]);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(
        labels.length - 1,
        (selectedIdx < 0 ? -1 : selectedIdx) + 1
      );
      onChange(labels[next]);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(labels[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(labels[labels.length - 1]);
    }
  };

  const prevLabel = selectedIdx > 0 ? labels[selectedIdx - 1] : null;
  const currLabel = selectedIdx >= 0 ? labels[selectedIdx] : null;
  const nextLabel =
    selectedIdx >= 0 && selectedIdx < labels.length - 1
      ? labels[selectedIdx + 1]
      : null;

  const currDef = currLabel ? getMoodDef(currLabel) : undefined;

  return (
    <div className="space-y-4">
      {/* Pill carousel: prev | current | next — above the rail */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex w-24 justify-end">
          {prevLabel ? (
            <button
              type="button"
              onClick={() => onChange(prevLabel)}
              className="truncate text-sm text-muted-foreground hover:text-foreground"
              aria-label={`Previous mood: ${prevLabel}`}
            >
              {prevLabel}
            </button>
          ) : null}
        </div>
        <div className="min-w-[120px] text-center">
          {currLabel && currDef ? (
            <MoodPill
              label={currLabel}
              selected
              size="md"
              asButton={false}
              withEmoji
            />
          ) : (
            <span className="text-sm italic text-muted-foreground">
              Pick a mood
            </span>
          )}
        </div>
        <div className="flex w-24 justify-start">
          {nextLabel ? (
            <button
              type="button"
              onClick={() => onChange(nextLabel)}
              className="truncate text-sm text-muted-foreground hover:text-foreground"
              aria-label={`Next mood: ${nextLabel}`}
            >
              {nextLabel}
            </button>
          ) : null}
        </div>
      </div>

      {/* Sine-wave bars: axis is the vertical center of the container.
          Positive amplitudes grow upward, negative ones grow downward.
          The whole rail is a slider — drag or click anywhere to choose. */}
      <div
        ref={railRef}
        role="slider"
        aria-label="Mood scale"
        aria-valuemin={0}
        aria-valuemax={labels.length - 1}
        aria-valuenow={selectedIdx >= 0 ? selectedIdx : 0}
        aria-valuetext={currLabel ?? "No mood selected"}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onKeyDown={handleKeyDown}
        className="relative flex h-24 cursor-ew-resize select-none items-stretch gap-[3px] px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{ touchAction: "none" }}
      >
        {labels.map((label, i) => {
          const def = getMoodDef(label)!;
          const isSelected = i === selectedIdx;
          const amp = amplitudes[i]; // -1..1
          const heightPct = Math.max(6, Math.abs(amp) * 50);
          const goesUp = amp >= 0;
          return (
            <div
              key={label}
              className="pointer-events-none relative flex-1"
              style={{ minWidth: 0 }}
              aria-hidden
            >
              <div
                className="absolute left-0 right-0 rounded-full transition-colors duration-150"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isSelected ? def.bg : "#E5E5E5",
                  outline: isSelected ? `2px solid ${def.bg}` : "none",
                  outlineOffset: 2,
                  ...(goesUp ? { bottom: "50%" } : { top: "50%" }),
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
