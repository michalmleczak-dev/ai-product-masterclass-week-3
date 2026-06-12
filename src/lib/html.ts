export function stripHtml(html: string): string {
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }
  // DOMParser builds an inert document: scripts and event handlers
  // (e.g. <img onerror=...>) never run, unlike with element.innerHTML.
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

export function truncate(text: string, n: number): string {
  if (text.length <= n) return text;
  return text.slice(0, n).trimEnd() + "…";
}
