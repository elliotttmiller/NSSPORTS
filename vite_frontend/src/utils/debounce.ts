// frontend/src/utils/debounce.ts
// Lightweight debounce utility for API calls and rapid user actions

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Usage example:
// const debouncedFetch = debounce(fetchData, 300);
