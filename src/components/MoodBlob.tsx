import type { MoodFace } from "@/lib/moods";

interface MoodBlobProps {
  face: MoodFace;
  /** Body fill (hex). The 3D look layers translucent highlight / shade on top. */
  color: string;
  size?: number;
  className?: string;
}

const STROKE = "#1A1A1A";

/**
 * 3D-style emoji-like mood character. The body is a perfect sphere lit
 * with a radial highlight (top-left) and a soft shade (bottom-right);
 * a separate elliptical specular dot reinforces the glossy look. A drop
 * shadow grounds the character.
 *
 * Each face uses bold, thick features to read at a glance.
 * `face` selects one of: happy | neutral | sad | angry.
 */
export function MoodBlob({
  face,
  color,
  size = 180,
  className,
}: MoodBlobProps) {
  // Unique IDs per render so multiple instances on the same page don't
  // share gradient definitions.
  const uid = useDeterministicId(color, face);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      aria-hidden
    >
      <defs>
        {/* Highlight: bright halo coming from the top-left */}
        <radialGradient
          id={`hl-${uid}`}
          cx="32%"
          cy="28%"
          r="55%"
          fx="32%"
          fy="28%"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {/* Shade: soft darkness in the bottom-right */}
        <radialGradient
          id={`sh-${uid}`}
          cx="72%"
          cy="78%"
          r="58%"
          fx="72%"
          fy="78%"
        >
          <stop offset="0%" stopColor="#000000" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        {/* Drop shadow under the sphere */}
        <filter
          id={`ds-${uid}`}
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="0" dy="6" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.35" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grounding ellipse shadow */}
      <ellipse cx="100" cy="186" rx="62" ry="6" fill="#000000" opacity="0.15" />

      {/* Body sphere — base color, shade overlay, highlight overlay,
          plus a small specular dot for that glossy emoji feel */}
      <g filter={`url(#ds-${uid})`}>
        <circle cx="100" cy="100" r="86" fill={color} />
        <circle cx="100" cy="100" r="86" fill={`url(#sh-${uid})`} />
        <circle cx="100" cy="100" r="86" fill={`url(#hl-${uid})`} />
        {/* Specular */}
        <ellipse
          cx="68"
          cy="58"
          rx="22"
          ry="12"
          fill="#FFFFFF"
          opacity="0.45"
          transform="rotate(-22 68 58)"
        />
        <ellipse
          cx="58"
          cy="50"
          rx="8"
          ry="4"
          fill="#FFFFFF"
          opacity="0.8"
          transform="rotate(-22 58 50)"
        />
      </g>

      {/* ----- HAPPY ----- */}
      {face === "happy" && (
        <>
          {/* Bold brows */}
          <path
            d="M50 70 Q72 56 92 70"
            stroke={STROKE}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M150 70 Q128 56 108 70"
            stroke={STROKE}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {/* Squinted (closed) eyes */}
          <path
            d="M52 100 Q72 86 92 100"
            stroke={STROKE}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M148 100 Q128 86 108 100"
            stroke={STROKE}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {/* Open laughing mouth: outer black, white teeth band, tongue */}
          <path
            d="M50 130
               Q100 188 150 130
               Q142 118 100 120
               Q58 118 50 130 Z"
            fill={STROKE}
          />
          <path
            d="M66 136
               Q100 162 134 136
               Q120 130 100 130
               Q80 130 66 136 Z"
            fill="#FFFFFF"
          />
          {/* Tongue */}
          <ellipse cx="100" cy="156" rx="22" ry="10" fill="#FF6B7A" />
          <ellipse
            cx="94"
            cy="152"
            rx="8"
            ry="3"
            fill="#FFFFFF"
            opacity="0.45"
          />
          {/* Cheeks */}
          <ellipse
            cx="48"
            cy="122"
            rx="10"
            ry="6"
            fill="rgba(255,120,120,0.35)"
          />
          <ellipse
            cx="152"
            cy="122"
            rx="10"
            ry="6"
            fill="rgba(255,120,120,0.35)"
          />
        </>
      )}

      {/* ----- NEUTRAL ----- */}
      {face === "neutral" && (
        <>
          {/* Flat brows */}
          <path
            d="M58 76 L88 76"
            stroke={STROKE}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M112 76 L142 76"
            stroke={STROKE}
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* 3D eyes */}
          <circle cx="73" cy="98" r="9" fill="#FFFFFF" />
          <circle cx="127" cy="98" r="9" fill="#FFFFFF" />
          <circle cx="73" cy="100" r="5" fill={STROKE} />
          <circle cx="127" cy="100" r="5" fill={STROKE} />
          <circle cx="71" cy="97" r="1.6" fill="#FFFFFF" />
          <circle cx="125" cy="97" r="1.6" fill="#FFFFFF" />
          {/* Flat line mouth */}
          <path
            d="M75 138 L125 138"
            stroke={STROKE}
            strokeWidth="6"
            strokeLinecap="round"
          />
        </>
      )}

      {/* ----- SAD ----- */}
      {face === "sad" && (
        <>
          {/* Drooping brows */}
          <path
            d="M50 78 Q72 70 90 84"
            stroke={STROKE}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M150 78 Q128 70 110 84"
            stroke={STROKE}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          {/* 3D eyes */}
          <circle cx="73" cy="102" r="9" fill="#FFFFFF" />
          <circle cx="127" cy="102" r="9" fill="#FFFFFF" />
          <circle cx="73" cy="105" r="5" fill={STROKE} />
          <circle cx="127" cy="105" r="5" fill={STROKE} />
          <circle cx="71" cy="101" r="1.6" fill="#FFFFFF" />
          <circle cx="125" cy="101" r="1.6" fill="#FFFFFF" />
          {/* Teardrop */}
          <path
            d="M73 115 Q68 128 73 138 Q78 128 73 115 Z"
            fill="#4DA6E8"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="0.5"
          />
          <ellipse cx="71.5" cy="124" rx="1.5" ry="3" fill="#FFFFFF" opacity="0.7" />
          {/* Frown */}
          <path
            d="M68 152 Q100 124 132 152"
            stroke={STROKE}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}

      {/* ----- ANGRY ----- */}
      {face === "angry" && (
        <>
          {/* Angled brows (V shape down to the centre) */}
          <path
            d="M48 70 L94 92"
            stroke={STROKE}
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M152 70 L106 92"
            stroke={STROKE}
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* Wide 3D eyes */}
          <circle cx="73" cy="108" r="11" fill="#FFFFFF" />
          <circle cx="127" cy="108" r="11" fill="#FFFFFF" />
          <circle cx="73" cy="110" r="6" fill={STROKE} />
          <circle cx="127" cy="110" r="6" fill={STROKE} />
          <circle cx="71" cy="107" r="1.8" fill="#FFFFFF" />
          <circle cx="125" cy="107" r="1.8" fill="#FFFFFF" />
          {/* Clenched mouth with subtle teeth */}
          <path
            d="M70 146 Q100 132 130 146"
            stroke={STROKE}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M82 142 L118 142"
            stroke={STROKE}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
          />
        </>
      )}
    </svg>
  );
}

// Deterministic short ID derived from inputs so SSR and CSR markup match
// and there's no collision across multiple <MoodBlob> instances with
// different colors/faces on the same page.
function useDeterministicId(color: string, face: string): string {
  let h = 0;
  const seed = `${color}|${face}`;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}
