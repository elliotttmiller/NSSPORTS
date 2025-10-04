import Lenis from '@studio-freight/lenis';

export const initLenis = (isMobile: boolean = false) => {
  const lenis = new Lenis({
    // Mobile-optimized settings vs Desktop settings
    duration: isMobile ? 1.2 : 2.5, // Faster on mobile for responsive feel
    easing: isMobile 
      ? (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // Smooth but snappy easing for mobile
      : (t: number) => 1 - Math.pow(1 - t, 4), // Quartic ease-out for desktop
    touchMultiplier: isMobile ? 1.5 : 0.8, // Higher sensitivity on mobile for natural touch
    wheelMultiplier: isMobile ? 1.0 : 0.4, // Standard wheel on mobile, reduced on desktop
    lerp: isMobile ? 0.1 : 0.05, // Less smooth interpolation on mobile for better performance
    wrapper: window, // Use window for both mobile and desktop for consistency
  });

  // Global scroll shadow effect for game card lists
  lenis.on('scroll', () => {
    const shadowElements = document.querySelectorAll('[data-scroll-shadow]');
    
    shadowElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate if element is in viewport and how much
      const elementTop = rect.top;
      const elementBottom = rect.bottom;
      const isInViewport = elementTop < viewportHeight && elementBottom > 0;
      
      if (isInViewport) {
        // Calculate shadow opacity based on scroll position and element visibility
        const elementProgress = Math.max(0, Math.min(1, (viewportHeight - elementTop) / viewportHeight));
        const shadowOpacity = Math.max(0, 1 - elementProgress);
        
        // Apply shadow effect
        (element as HTMLElement).style.setProperty(
          '--scroll-shadow-opacity', 
          shadowOpacity.toString()
        );
      }
    });
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

  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  return lenis;
};
