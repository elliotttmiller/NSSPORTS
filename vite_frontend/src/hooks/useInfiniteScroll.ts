import { useEffect, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Custom hook for implementing smooth infinite scroll
 * Uses Intersection Observer for optimal performance
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  threshold = 0.1,
  rootMargin = "100px",
}: UseInfiniteScrollOptions) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleIntersect, threshold, rootMargin]);

  return loadMoreRef;
}

/**
 * Hook for smooth scroll behavior within containers
 */
export function useSmoothScroll() {
  const scrollToTop = useCallback((element?: HTMLElement) => {
    const target = element || window;
    if (target === window) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      element?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const scrollToBottom = useCallback((element?: HTMLElement) => {
    if (!element) return;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const scrollToElement = useCallback(
    (elementId: string, container?: HTMLElement, offset = 0) => {
      const targetElement = document.getElementById(elementId);
      if (!targetElement) return;

      if (container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const relativeTop =
          elementRect.top - containerRect.top + container.scrollTop - offset;

        container.scrollTo({
          top: relativeTop,
          behavior: "smooth",
        });
      } else {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    },
    [],
  );

  return {
    scrollToTop,
    scrollToBottom,
    scrollToElement,
  };
}
