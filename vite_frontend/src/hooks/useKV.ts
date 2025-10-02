import { useState, useEffect, Dispatch, SetStateAction } from "react";

/**
 * useKV - React hook for localStorage-backed state (replacement for removed @github/spark/hooks)
 * @param key string - localStorage key
 * @param initialValue T - default value if not present
 * @returns [value, setValue]
 */
export function useKV<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}
