import Lenis from '@studio-freight/lenis';

export const initLenis = (_isMobile: boolean = false) => {
  if (typeof window === 'undefined') return null;

  const lenis = new Lenis({
    duration: 1.3,
    easing: (t: number) => 1 - Math.pow(1 - t, 3), // cubic ease-out for a natural feel
    touchMultiplier: 1.0,
    wheelMultiplier: 0.8,
    lerp: 0.07,
  });

  // Global scroll shadow effect for all game pages/lists
  lenis.on('scroll', () => {
    const shadow = document.getElementById('global-scroll-shadow');
    if (!shadow) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const maxScroll = scrollHeight - clientHeight;
    let opacity = 1;
    if (maxScroll > 0) {
      const progress = Math.min(1, scrollTop / maxScroll);
      opacity = 1 - progress;
    } else {
      opacity = 0;
    }
    shadow.style.opacity = opacity.toString();
  });

  // Emit custom scroll events for shadow synchronization
  lenis.on('scroll', (e: { scroll: number; limit: number; velocity: number; direction: number }) => {
    window.dispatchEvent(new CustomEvent('lenis-scroll', { 
      detail: { 
        scroll: e.scroll, 
        limit: e.limit, 
        velocity: e.velocity, 
        direction: e.direction 
      } 
    }));
  });

  let rafId: number;
  const raf = (time: number) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  return lenis;
};
