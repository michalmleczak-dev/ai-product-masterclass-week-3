"use client";

import { getMoodEmoji } from "@/lib/moods";

interface MoodIllustrationProps {
  /** Currently selected mood label, or null when nothing is picked yet. */
  label: string | null;
  /** Square size in px (controls both the box and the emoji). Default 220. */
  size?: number;
}

const EMOJI_FONT_STACK =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

export function MoodIllustration({
  label,
  size = 220,
}: MoodIllustrationProps) {
  const emoji = getMoodEmoji(label);

  return (
    <div
      className="relative mx-auto flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={label ? `${label} mood` : "No mood selected"}
    >
      <span
        role="img"
        aria-hidden="true"
        className="select-none leading-none"
        style={{
          fontSize: size * 0.86,
          fontFamily: EMOJI_FONT_STACK,
          // Tiny vertical nudge — most color-emoji fonts have a baseline
          // gap that makes the glyph sit slightly above center.
          transform: "translateY(2%)",
        }}
      >
        {emoji}
      </span>
    </div>
  );
}
