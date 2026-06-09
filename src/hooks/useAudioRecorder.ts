"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "processing" | "error";

interface UseAudioRecorderResult {
  state: RecorderState;
  error: string | null;
  durationMs: number;
  mimeType: string | null;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  cancel: () => void;
  setProcessing: () => void;
  reset: () => void;
}

function pickMimeType(): string | undefined {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return undefined;
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [mimeType, setMimeType] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.state === "recording" && recorderRef.current.stop();
      } catch {
        /* noop */
      }
      releaseStream();
    };
  }, [releaseStream]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setError("Twoja przeglądarka nie obsługuje nagrywania (wymaga HTTPS).");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as DOMException)?.name;
      setState("error");
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Brak dostępu do mikrofonu — zezwól w ustawieniach przeglądarki.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("Nie znaleziono mikrofonu.");
      } else {
        setError("Nie udało się uruchomić mikrofonu.");
      }
      return;
    }

    const chosen = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = chosen
        ? new MediaRecorder(stream, { mimeType: chosen })
        : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setState("error");
      setError("Twoja przeglądarka nie obsługuje nagrywania audio.");
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    streamRef.current = stream;
    recorderRef.current = recorder;
    setMimeType(recorder.mimeType || chosen || "audio/webm");
    startTimeRef.current = Date.now();
    setDurationMs(0);
    timerRef.current = setInterval(() => {
      setDurationMs(Date.now() - startTimeRef.current);
    }, 250);

    recorder.start();
    setState("recording");
  }, []);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        releaseStream();
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        releaseStream();
        resolve(blob.size > 0 ? blob : null);
      };
      try {
        recorder.stop();
      } catch {
        releaseStream();
        resolve(null);
      }
    });
  }, [releaseStream]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      try {
        recorder.onstop = null;
        recorder.stop();
      } catch {
        /* noop */
      }
    }
    chunksRef.current = [];
    releaseStream();
    setState("idle");
    setDurationMs(0);
    setError(null);
  }, [releaseStream]);

  const setProcessing = useCallback(() => setState("processing"), []);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setDurationMs(0);
  }, []);

  return { state, error, durationMs, mimeType, start, stop, cancel, setProcessing, reset };
}
