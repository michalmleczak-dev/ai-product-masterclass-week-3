import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;
const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing GROQ_API_KEY" },
      { status: 500 }
    );
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = incoming.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing 'file' field" },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "Empty audio file" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Audio exceeds 25 MB limit" },
      { status: 413 }
    );
  }

  const upstreamForm = new FormData();
  const filename =
    file instanceof File && file.name ? file.name : "audio.webm";
  upstreamForm.append("file", file, filename);
  upstreamForm.append("model", "whisper-large-v3");
  upstreamForm.append("language", "pl");
  upstreamForm.append("response_format", "json");
  upstreamForm.append("temperature", "0");

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("Groq transcription failed", upstream.status, detail);
      return NextResponse.json(
        { error: "Transcription service error" },
        { status: 502 }
      );
    }

    const data = (await upstream.json()) as { text?: string };
    return NextResponse.json({ text: (data.text ?? "").trim() });
  } catch (err) {
    console.error("Groq transcription threw", err);
    return NextResponse.json(
      { error: "Network error contacting transcription service" },
      { status: 502 }
    );
  }
}
