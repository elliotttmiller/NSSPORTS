import { useEffect, useRef } from 'react';
import Lenis from '@studio-freight/lenis';

interface LenisScrollOptions {
  enabled?: boolean;
  duration?: number;
  easing?: (t: number) => number;
  orientation?: 'vertical' | 'horizontal';
  lerp?: number;
}

export function useLenisScroll(options: LenisScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!options.enabled || !containerRef.current) return;

    // Initialize Lenis for the specific container
    const lenis = new Lenis({
      duration: options.duration || 1.5,
      easing: options.easing || ((t: number) => 1 - Math.pow(1 - t, 3)),
      orientation: options.orientation || 'vertical',
      wrapper: containerRef.current,
      content: containerRef.current.firstElementChild as HTMLElement,
      lerp: options.lerp || 0.08,
      touchMultiplier: 1.2,
      wheelMultiplier: 0.6,
    });

    lenisRef.current = lenis;

    // Animation loop
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Cleanup
    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [options.enabled, options.duration, options.easing, options.orientation, options.lerp]);

  return {
    containerRef,
    lenis: lenisRef.current,
  };
}
