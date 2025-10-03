"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for key-value storage using localStorage
 * Compatible with Next.js SSR by checking for window availability
 */
export function useKV<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  // Initialize state with default value
  const [storedValue, setStoredValue] = useState<T>(defaultValue);

  // Load value from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    }
  }, [key]);

  // Save value to localStorage
  const setValue = useCallback(
    (value: T) => {
      if (typeof window === "undefined") return;

      try {
        setStoredValue(value);
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
      }
    },
    [key]
  );

  return [storedValue, setValue];
}
