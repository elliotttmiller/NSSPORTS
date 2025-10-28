"use client";

import { createContext, useContext, useRef, useCallback, ReactNode } from "react";

interface MobileScrollContextType {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  getScrollTop: () => number;
  scrollToTop: (smooth?: boolean) => void;
  isAtTop: () => boolean;
  isAtBottom: () => boolean;
}

const MobileScrollContext = createContext<MobileScrollContextType | null>(null);

export function MobileScrollProvider({ children }: { children: ReactNode }) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const getScrollTop = useCallback(() => {
    if (!scrollContainerRef.current) return 0;
    return scrollContainerRef.current.scrollTop;
  }, []);

  const scrollToTop = useCallback((smooth = true) => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, []);

  const isAtTop = useCallback(() => {
    if (!scrollContainerRef.current) return false;
    return scrollContainerRef.current.scrollTop === 0;
  }, []);

  const isAtBottom = useCallback(() => {
    if (!scrollContainerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return Math.abs(scrollHeight - clientHeight - scrollTop) < 1;
  }, []);

  return (
    <MobileScrollContext.Provider
      value={{
        scrollContainerRef,
        getScrollTop,
        scrollToTop,
        isAtTop,
        isAtBottom,
      }}
    >
      {children}
    </MobileScrollContext.Provider>
  );
}

export function useMobileScroll() {
  const context = useContext(MobileScrollContext);
  
  // Return safe defaults if not in provider (e.g., desktop or SSR)
  if (!context) {
    return {
      scrollContainerRef: { current: null },
      getScrollTop: () => 0,
      scrollToTop: () => {},
      isAtTop: () => true,
      isAtBottom: () => false,
    };
  }
  
  return context;
}
