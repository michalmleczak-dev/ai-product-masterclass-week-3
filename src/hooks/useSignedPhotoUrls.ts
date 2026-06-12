"use client";

import { useEffect, useState } from "react";
import { createSignedPhotoUrl } from "@/lib/storage";

/**
 * Resolves Supabase Storage paths to signed URLs (1h TTL).
 * Only the authenticated owner can generate signed URLs (enforced by RLS).
 */
export function useSignedPhotoUrls(paths: string[]): Record<string, string> {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Use a stable string as dependency so React can compare by value,
  // not by array reference — and so React 18 strict-mode double-invocation
  // doesn't get blocked by a ref-based dedup guard.
  const pathsKey = paths.join(",");

  useEffect(() => {
    if (!pathsKey) {
      setSignedUrls({});
      return;
    }

    let cancelled = false;
    const currentPaths = pathsKey.split(",");

    Promise.all(
      currentPaths.map(async (p) => {
        const url = await createSignedPhotoUrl(p);
        return [p, url ?? ""] as [string, string];
      })
    ).then((pairs) => {
      if (!cancelled) {
        setSignedUrls(Object.fromEntries(pairs.filter(([, url]) => url)));
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey]);

  return signedUrls;
}
