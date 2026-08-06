export type ClientCacheEntry<T> = {
  data: T;
  updatedAt: number;
};

type Listener = () => void;

/**
 * Lightweight Pinia/Zustand-style client cache (no deps).
 * Survives soft navigations within the SPA; cleared on full page reload.
 */
function createClientStore() {
  const cache = new Map<string, ClientCacheEntry<unknown>>();
  const listeners = new Set<Listener>();

  function emit() {
    for (const listener of listeners) listener();
  }

  return {
    get<T>(key: string): ClientCacheEntry<T> | undefined {
      return cache.get(key) as ClientCacheEntry<T> | undefined;
    },

    set<T>(key: string, data: T): void {
      cache.set(key, { data, updatedAt: Date.now() });
      emit();
    },

    /** Replace cached data via updater; no-op if key missing. */
    patch<T>(key: string, updater: (prev: T) => T): void {
      const entry = cache.get(key) as ClientCacheEntry<T> | undefined;
      if (!entry) return;
      cache.set(key, { data: updater(entry.data), updatedAt: Date.now() });
      emit();
    },

    invalidate(key: string | string[]): void {
      const keys = Array.isArray(key) ? key : [key];
      let changed = false;
      for (const k of keys) {
        if (cache.delete(k)) changed = true;
      }
      if (changed) emit();
    },

    invalidatePrefix(prefix: string): void {
      let changed = false;
      for (const k of cache.keys()) {
        if (k === prefix || k.startsWith(`${prefix}:`)) {
          cache.delete(k);
          changed = true;
        }
      }
      if (changed) emit();
    },

    has(key: string): boolean {
      return cache.has(key);
    },

    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Test / rare reset helper. */
    clear(): void {
      if (cache.size === 0) return;
      cache.clear();
      emit();
    },
  };
}

export const clientStore = createClientStore();
