export const GROK_URL = "https://api.x.ai/v1/chat/completions";
export const GROK_MODEL = process.env.XAI_MODEL || "grok-4.3";

export function getGrokKey(): string | null {
  return process.env.XAI_API_KEY || null;
}

const CRISIS_PATTERNS = [
  /\bkill (myself|me)\b/i,
  /\bsuicid/i,
  /\bend (my|it all) life\b/i,
  /\bself[- ]?harm/i,
  /\bcut(ting)? myself\b/i,
  /\bwant to die\b/i,
  /\bno reason to live\b/i,
  /\bnie chc[ęe] (już )?ży[ćc]/i,
  /\bsamob[óo]j/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}
