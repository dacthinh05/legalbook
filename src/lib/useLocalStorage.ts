'use client';

import { useSyncExternalStore, useCallback } from 'react';

// In-memory cache for stable snapshots required by useSyncExternalStore contract
const memoryCache: Record<string, string> = {};
const listeners: Record<string, Set<() => void>> = {};

function readStorageSafely(key: string, fallback: string): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(key);
      if (item !== null) return item;
    }
  } catch {
    // Handled in restricted iframe / disabled storage modes
  }
  return fallback;
}

function writeStorageSafely(key: string, value: string): void {
  memoryCache[key] = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
  
  // Notify all active component subscribers
  listeners[key]?.forEach((cb) => cb());
}

function subscribe(key: string, fallback: string, callback: () => void) {
  if (!listeners[key]) {
    listeners[key] = new Set();
  }
  listeners[key].add(callback);

  // Initialize cache on first subscription
  if (memoryCache[key] === undefined) {
    memoryCache[key] = readStorageSafely(key, fallback);
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) {
      memoryCache[key] = readStorageSafely(key, fallback);
      callback();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    listeners[key]?.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

/**
 * SSR-safe, cached external store hook for string localStorage keys.
 */
export function useLocalStorageString(
  key: string,
  serverDefault: string
): [string, (newValue: string) => void] {
  const subscribeToKey = useCallback(
    (callback: () => void) => subscribe(key, serverDefault, callback),
    [key, serverDefault]
  );

  const getClientSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return serverDefault;
    if (memoryCache[key] === undefined) {
      memoryCache[key] = readStorageSafely(key, serverDefault);
    }
    return memoryCache[key];
  }, [key, serverDefault]);

  const getServerSnapshot = useCallback(() => serverDefault, [serverDefault]);

  const value = useSyncExternalStore(subscribeToKey, getClientSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (newValue: string) => {
      writeStorageSafely(key, newValue);
    },
    [key]
  );

  return [value, setValue];
}

/**
 * SSR-safe, cached external store hook for numeric values.
 */
export function useLocalStorageNumber(
  key: string,
  serverDefault: number,
  min?: number,
  max?: number
): [number, (newValue: number | ((prev: number) => number)) => void] {
  const [strVal, setStrVal] = useLocalStorageString(key, String(serverDefault));

  let num = Number(strVal);
  if (isNaN(num)) num = serverDefault;
  if (min !== undefined) num = Math.max(min, num);
  if (max !== undefined) num = Math.min(max, num);

  const setNum = useCallback(
    (action: number | ((prev: number) => number)) => {
      const nextRaw = typeof action === 'function' ? action(num) : action;
      let next = nextRaw;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      setStrVal(String(next));
    },
    [num, min, max, setStrVal]
  );

  return [num, setNum];
}

/**
 * SSR-safe, cached external store hook for boolean values.
 */
export function useLocalStorageBoolean(
  key: string,
  serverDefault: boolean
): [boolean, (newValue: boolean | ((prev: boolean) => boolean)) => void] {
  const [strVal, setStrVal] = useLocalStorageString(key, String(serverDefault));
  const boolVal = strVal === 'true';

  const setBool = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof action === 'function' ? action(boolVal) : action;
      setStrVal(String(next));
    },
    [boolVal, setStrVal]
  );

  return [boolVal, setBool];
}
