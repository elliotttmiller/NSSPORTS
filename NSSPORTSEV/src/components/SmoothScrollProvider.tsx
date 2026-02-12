"use client";

import { useEffect, useState } from "react";
import { initLenis } from "@/lib/lenis";

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile devices
    const checkDevice = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 1024;
      setIsMobile(isTouch || isSmallScreen);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    // On mobile, prefer native momentum scrolling for best UX
    if (isMobile) return;

    const lenis = initLenis(false);
    return () => {
      if (lenis) lenis.destroy();
    };
  }, [isMobile]);

  return <>{children}</>;
}
