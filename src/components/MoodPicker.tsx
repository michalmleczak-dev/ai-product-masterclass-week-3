"use client";

import { MOOD_CATEGORIES } from "@/lib/moods";
import { MoodPill } from "./MoodPill";

interface MoodPickerProps {
  value: string | null;
  onChange: (label: string) => void;
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="space-y-3">
      {MOOD_CATEGORIES.map((cat) => (
        <div key={cat.category}>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {cat.category}
          </p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {cat.labels.map((label) => (
              <MoodPill
                key={label}
                label={label}
                selected={value === label}
                onClick={() => onChange(label)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
