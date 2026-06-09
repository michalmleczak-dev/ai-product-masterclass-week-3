"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type State =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "ready"; token: string; expiresAt: number };

function maskToken(t: string): string {
  if (t.length <= 12) return t;
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

function expiresIn(expiresAt: number): string {
  const secs = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
  const m = Math.floor(secs / 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}

export function TokenButton() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.access_token) {
      setState({ kind: "signed-out" });
      return;
    }
    setState({
      kind: "ready",
      token: session.access_token,
      expiresAt: session.expires_at ?? 0,
    });
  }, []);

  useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const copy = useCallback(async () => {
    if (state.kind !== "ready") return;
    await navigator.clipboard.writeText(state.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [state]);

  const refresh = useCallback(async () => {
    setState({ kind: "loading" });
    await supabase.auth.refreshSession();
    await load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <div className="flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-[12px] text-zinc-500">
        Checking session…
      </div>
    );
  }

  if (state.kind === "signed-out") {
    return (
      <a
        href="/"
        className="flex h-8 items-center gap-2 rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white hover:bg-zinc-800"
      >
        Sign in for token
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 font-mono text-[12px] text-zinc-700">
        <span className="text-zinc-400">token</span>
        <span>{maskToken(state.token)}</span>
        <span className="text-zinc-400">· expires in {expiresIn(state.expiresAt)}</span>
      </div>
      <button
        type="button"
        onClick={copy}
        className="h-8 rounded-md bg-zinc-900 px-3 text-[12px] font-medium text-white hover:bg-zinc-800"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        type="button"
        onClick={refresh}
        className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-[12px] text-zinc-600 hover:text-zinc-900"
        title="Refresh session"
      >
        ↻
      </button>
    </div>
  );
}
