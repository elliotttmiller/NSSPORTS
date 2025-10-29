"use client";

import { motion } from "framer-motion";
import Image from "next/image";

/**
 * Global Loading Screen Component
 * Provides smooth, animated loading experience across the entire app
 * with proper waiting states and natural transitions
 */

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
}

export function LoadingScreen({ 
  title = "Loading...", 
  subtitle = "Please wait",
  showLogo = true
}: LoadingScreenProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
    >
      <div className="text-center px-6">
        {/* Logo */}
        {showLogo && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-8"
          >
            <Image 
              src="/mn-outline.svg" 
              alt="NSSPORTSCLUB" 
              width={80} 
              height={80}
              className="w-20 h-20 mx-auto"
              priority
            />
          </motion.div>
        )}

        {/* Animated Spinner */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative w-16 h-16 mx-auto">
            {/* Outer ring */}
            <div className="absolute inset-0 border-4 border-accent/20 rounded-full"></div>
            {/* Spinning ring */}
            <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            {/* Inner pulse */}
            <motion.div 
              animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-2 bg-accent/10 rounded-full"
            />
          </div>
        </motion.div>

        {/* Title with fade-in animation */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-lg font-semibold text-foreground mb-2">{title}</p>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-sm text-muted-foreground"
          >
            {subtitle}
          </motion.p>
        </motion.div>

        {/* Animated dots */}
        <motion.div 
          className="flex justify-center gap-1.5 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
              className="w-2 h-2 bg-accent rounded-full"
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
