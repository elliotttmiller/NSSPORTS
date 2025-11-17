'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Define the animation variants - crossfade for smooth transitions
const variants = {
  hidden: { opacity: 0 },
  enter: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Scroll to top on route change (covers all pages)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [pathname]);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="hidden"
        animate="enter"
        exit="exit"
        transition={{ 
          duration: 0.2, 
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{ 
          minHeight: '100vh',
          backgroundColor: '#0a0a0a',
          position: 'relative',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
