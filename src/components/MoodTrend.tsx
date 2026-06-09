"use client";

import { useMemo, useState } from "react";

import { ALL_LABELS, getMoodDef } from "@/lib/moods";
import { todayISO } from "@/lib/date";
import type { Entry } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Range = "week" | "month" | "year";

const RANGES: Array<{ id: Range; label: string; days: number }> = [
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "year", label: "Year", days: 365 },
];

function dateAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
}

function dateDiffDays(from: string, to: string): number {
  const [ay, am, ad] = from.split("-").map(Number);
  const [by, bm, bd] = to.split("-").map(Number);
  return Math.round(
    (new Date(by, bm - 1, bd).getTime() -
      new Date(ay, am - 1, ad).getTime()) /
      86_400_000
  );
}

const NEUTRAL_COLOR = "#C9C9D3";

interface MoodTrendProps {
  entries: Entry[];
}

export function MoodTrend({ entries }: MoodTrendProps) {
  const [range, setRange] = useState<Range>("week");
  const days = RANGES.find((r) => r.id === range)!.days;

  const data = useMemo(() => {
    const today = todayISO();
    const startDate = dateAddDays(today, -(days - 1));
    const span = Math.max(1, days - 1);

    // Take latest entry per day, in range. (One-entry-per-day already enforced
    // upstream, but we de-dupe defensively.)
    const byDate = new Map<string, Entry>();
    for (const e of entries) {
      if (e.date < startDate || e.date > today) continue;
      const existing = byDate.get(e.date);
      if (!existing || existing.updatedAt < e.updatedAt) {
        byDate.set(e.date, e);
      }
    }

    const points = Array.from(byDate.values())
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((e) => {
        const idx = ALL_LABELS.indexOf(e.moodLabel);
        const def = getMoodDef(e.moodLabel);
        // y: 0 (Angry, worst) at the bottom, 1 (Excited, best) at the top
        const score =
          idx >= 0 ? (ALL_LABELS.length - 1 - idx) / (ALL_LABELS.length - 1) : 0.5;
        // x: fraction of the range
        const x = dateDiffDays(startDate, e.date) / span;
        return {
          date: e.date,
          x,
          score,
          color: def?.bg ?? NEUTRAL_COLOR,
          label: e.moodLabel,
        };
      });

    return { startDate, today, points, span };
  }, [entries, days]);

  return (
    <section aria-label="Mood trend">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Mood trend</h2>
        <RangeTabs value={range} onChange={setRange} />
      </div>
      {data.points.length < 2 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-8 text-center text-sm text-muted-foreground">
          Not enough data in this range yet.
          <br />
          {data.points.length === 0
            ? "Log at least two days to see a trend."
            : "One more day to go."}
        </div>
      ) : (
        <TrendChart
          points={data.points}
          startDate={data.startDate}
          endDate={data.today}
        />
      )}
    </section>
  );
}

interface RangeTabsProps {
  value: Range;
  onChange: (r: Range) => void;
}

function RangeTabs({ value, onChange }: RangeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Trend range"
      className="inline-flex rounded-full border bg-muted p-0.5 text-xs"
    >
      {RANGES.map((r) => (
        <button
          key={r.id}
          role="tab"
          aria-selected={value === r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            value === r.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

interface TrendPoint {
  date: string;
  x: number; // 0..1 across the range
  score: number; // 0..1 worst..best
  color: string;
  label: string;
}

// Five category "bands" — middle mood per category, used to draw the
// horizontal level guide-lines. Order matches the on-screen colour ramp.
const LEVELS: Array<{ category: string; score: number; color: string }> = [
  { category: "Positive", score: (15 - 1 - 1) / 14, color: "#F5C842" },
  { category: "Calm", score: (15 - 1 - 4) / 14, color: "#A8D5BA" },
  { category: "Neutral", score: (15 - 1 - 7) / 14, color: "#C9C9D3" },
  { category: "Difficult", score: (15 - 1 - 10) / 14, color: "#E8856A" },
  { category: "Intense", score: (15 - 1 - 13) / 14, color: "#C0392B" },
];

function TrendChart({
  points,
  startDate,
  endDate,
}: {
  points: TrendPoint[];
  startDate: string;
  endDate: string;
}) {
  // viewBox proportions chosen to match the rendered aspect ratio, so circles
  // stay round (preserveAspectRatio defaults to "xMidYMid meet" — no stretch).
  const W = 400;
  const H = 260;
  const PAD_LEFT = 78; // room for category labels on the left
  const PAD_RIGHT = 16;
  const PAD_TOP = 16;
  const PAD_BOT = 40;

  const xToPx = (x: number) => PAD_LEFT + x * (W - PAD_LEFT - PAD_RIGHT);
  const yToPx = (s: number) => PAD_TOP + (1 - s) * (H - PAD_TOP - PAD_BOT);

  // Smooth path through points
  const linePath = buildSmoothPath(
    points.map((p) => ({ x: xToPx(p.x), y: yToPx(p.score) }))
  );
  const bottomY = H - PAD_BOT;
  const firstX = xToPx(points[0].x);
  const lastX = xToPx(points[points.length - 1].x);
  const areaPath = `${linePath} L ${lastX.toFixed(2)} ${bottomY} L ${firstX.toFixed(
    2
  )} ${bottomY} Z`;

  // Unique IDs per chart so multiple charts on a page don't collide.
  const seed = `${startDate}-${endDate}-${points.length}`;
  const lineGradId = `line-${seed}`;
  const fillGradId = `fill-${seed}`;

  const stops = points.map((p) => ({ offset: p.x * 100, color: p.color }));

  // Decide how often to label dates so they don't overlap. Aim for ~6 labels.
  const tickStride = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="rounded-xl border bg-card p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Mood values plotted over the selected range"
      >
        <defs>
          <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
            {stops.map((s, i) => (
              <stop
                key={i}
                offset={`${s.offset}%`}
                stopColor={s.color}
                stopOpacity={1}
              />
            ))}
          </linearGradient>
          <linearGradient id={fillGradId} x1="0" y1="0" x2="1" y2="0">
            {stops.map((s, i) => (
              <stop
                key={i}
                offset={`${s.offset}%`}
                stopColor={s.color}
                stopOpacity={0.4}
              />
            ))}
          </linearGradient>
        </defs>

        {/* Y-axis level guide-lines, one per emotion category */}
        {LEVELS.map((lvl) => {
          const y = yToPx(lvl.score);
          return (
            <g key={lvl.category}>
              <line
                x1={PAD_LEFT}
                x2={W - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke={lvl.color}
                strokeWidth="1"
                strokeDasharray="2 4"
                opacity={0.5}
              />
              <text
                x={PAD_LEFT - 8}
                y={y + 4}
                fontSize="11"
                fill="#6B7280"
                textAnchor="end"
              >
                {lvl.category}
              </text>
            </g>
          );
        })}

        {/* Baseline (axis) */}
        <line
          x1={PAD_LEFT}
          x2={W - PAD_RIGHT}
          y1={bottomY}
          y2={bottomY}
          stroke="#E5E5E5"
          strokeWidth="1"
        />

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${fillGradId})`} />
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={`url(#${lineGradId})`}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* X-axis ticks + date labels under every point (stride-thinned) */}
        {points.map((p, i) => {
          const cx = xToPx(p.x);
          const showLabel =
            i % tickStride === 0 || i === points.length - 1;
          return (
            <g key={`tick-${i}`}>
              <line
                x1={cx}
                x2={cx}
                y1={bottomY}
                y2={bottomY + 4}
                stroke="#D4D4D8"
                strokeWidth="1"
              />
              {showLabel && (
                <text
                  x={cx}
                  y={bottomY + 16}
                  fontSize="10"
                  fill="#6B7280"
                  textAnchor="middle"
                >
                  {formatDateTick(p.date, i === 0)}
                </text>
              )}
            </g>
          );
        })}

        {/* Markers (drawn last so they sit above the line) */}
        {points.map((p, i) => (
          <circle
            key={`pt-${i}`}
            cx={xToPx(p.x)}
            cy={yToPx(p.score)}
            r="3.5"
            fill={p.color}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          >
            <title>
              {p.date}: {p.label}
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

const TICK_MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * First tick (`includeMonth=true`) shows the month name, e.g. "May, 25th".
 * Subsequent ticks show only the ordinal day, e.g. "26th", "27th".
 */
function formatDateTick(iso: string, includeMonth: boolean): string {
  const [, m, d] = iso.split("-").map(Number);
  const ord = `${d}${ordinalSuffix(d)}`;
  return includeMonth ? `${TICK_MONTHS[m - 1]}, ${ord}` : ord;
}

// Build a smooth cubic Bezier path through points. Tension ≈ Catmull-Rom.
function buildSmoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }
  const tension = 0.5;
  const segs: string[] = [`M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;
    segs.push(
      `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(
        2
      )} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    );
  }
  return segs.join(" ");
}
