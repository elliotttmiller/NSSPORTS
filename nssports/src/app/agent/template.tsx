'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

// Smooth crossfade variants - no white flash
const variants = {
  hidden: { opacity: 0 },
  enter: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Agent Dashboard Template
 * Provides smooth page transitions for all agent routes
 * Uses crossfade animation to prevent white flash
 */
export default function AgentTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
