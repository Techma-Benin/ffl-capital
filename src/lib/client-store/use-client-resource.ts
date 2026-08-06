"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clientStore, type ClientCacheEntry } from "@/lib/client-store/store";

export type UseClientResourceOptions<T> = {
  /** SSR / first-paint seed. Always written into the store on mount. */
  initialData?: T;
  /**
   * Optional background revalidator. When the store already has data,
   * UI shows cache immediately and refreshes when the fetcher resolves.
   */
  fetcher?: () => Promise<T>;
  /** Re-run fetcher when the hook mounts (default true if fetcher set). */
  revalidateOnMount?: boolean;
  /**
   * Skip background fetch when cache is newer than this many ms.
   * Default: always revalidate when fetcher + revalidateOnMount.
   */
  staleTimeMs?: number;
};

export type UseClientResourceResult<T> = {
  data: T | undefined;
  updatedAt: number | undefined;
  isValidating: boolean;
  /** Replace cache entry (and local state). */
  mutate: (data: T | ((prev: T | undefined) => T)) => void;
  /** Drop cache for this key. */
  invalidate: () => void;
  /** Run fetcher now (if configured). */
  revalidate: () => Promise<void>;
};

function snapshotForKey(key: string): ClientCacheEntry<unknown> | null {
  return clientStore.get(key) ?? null;
}

/**
 * Stale-while-revalidate hook over {@link clientStore}.
 * Prefer SSR `initialData` for first visit; use `fetcher` for soft remounts.
 */
export function useClientResource<T>(
  key: string,
  options: UseClientResourceOptions<T> = {},
): UseClientResourceResult<T> {
  const {
    initialData,
    fetcher,
    revalidateOnMount = Boolean(fetcher),
    staleTimeMs,
  } = options;

  const entry = useSyncExternalStore(
    clientStore.subscribe,
    () => snapshotForKey(key),
    () => snapshotForKey(key),
  );

  const [isValidating, setIsValidating] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const seededRef = useRef(false);

  // Seed from SSR once per mount when provided.
  useEffect(() => {
    if (initialData === undefined) return;
    if (!seededRef.current) {
      seededRef.current = true;
      clientStore.set(key, initialData);
      return;
    }
    // Later SSR refreshes (router.refresh) always win.
    clientStore.set(key, initialData);
  }, [key, initialData]);

  const revalidate = useCallback(async () => {
    const run = fetcherRef.current;
    if (!run) return;

    const current = clientStore.get<T>(key);
    if (
      staleTimeMs != null &&
      current &&
      Date.now() - current.updatedAt < staleTimeMs
    ) {
      return;
    }

    setIsValidating(true);
    try {
      const next = await run();
      clientStore.set(key, next);
    } finally {
      setIsValidating(false);
    }
  }, [key, staleTimeMs]);

  useEffect(() => {
    if (!revalidateOnMount || !fetcherRef.current) return;
    void revalidate();
  }, [revalidateOnMount, revalidate]);

  const mutate = useCallback(
    (data: T | ((prev: T | undefined) => T)) => {
      const prev = clientStore.get<T>(key)?.data;
      const next =
        typeof data === "function"
          ? (data as (prev: T | undefined) => T)(prev)
          : data;
      clientStore.set(key, next);
    },
    [key],
  );

  const invalidate = useCallback(() => {
    clientStore.invalidate(key);
  }, [key]);

  const data = (entry?.data as T | undefined) ?? initialData;

  return {
    data,
    updatedAt: entry?.updatedAt,
    isValidating,
    mutate,
    invalidate,
    revalidate,
  };
}
