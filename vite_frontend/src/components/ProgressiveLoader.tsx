import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface ProgressiveLoaderProps {
  text?: string;
  showProgress?: boolean;
  delay?: number;
}

export function ProgressiveLoader({
  text = "Loading...",
  showProgress = true,
  delay = 0,
}: ProgressiveLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  useEffect(() => {
    if (!visible || !showProgress) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [visible, showProgress]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center min-h-[200px] p-8"
    >
      {/* Main loader */}
      <div className="relative mb-6">
        <div className="w-16 h-16 border-3 border-accent/20 border-t-accent rounded-full animate-spin"></div>
        <motion.div
          className="absolute inset-0 w-16 h-16 border-2 border-accent/10 rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-48 h-1 bg-muted/20 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Loading text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-2"
      >
        <p className="text-lg font-medium text-foreground">{text}</p>
        <motion.div
          className="flex justify-center space-x-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            className="w-2 h-2 bg-accent rounded-full"
            animate={{ y: [-2, 0, -2] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 bg-accent rounded-full"
            animate={{ y: [-2, 0, -2] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 bg-accent rounded-full"
            animate={{ y: [-2, 0, -2] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Skeleton loader for specific components
export function GameCardSkeleton() {
  return (
    <motion.div
      className="border rounded-lg p-4 space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted/20 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted/20 rounded animate-pulse w-1/2" />
        </div>
        <div className="h-6 w-16 bg-muted/20 rounded animate-pulse" />
      </div>

      {/* Teams with logo placeholders */}
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {/* Team logo skeleton */}
              <div className="w-8 h-8 bg-muted/20 rounded-full animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/10 to-transparent animate-shimmer" />
              </div>
              {/* Team name skeleton */}
              <div className="space-y-1">
                <div className="h-4 bg-muted/20 rounded animate-pulse w-24" />
                <div className="h-3 bg-muted/20 rounded animate-pulse w-12" />
              </div>
            </div>
            {/* Betting buttons skeleton */}
            <div className="flex space-x-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="w-16 h-8 bg-muted/20 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-2 border-t">
        <div className="h-3 bg-muted/20 rounded animate-pulse w-20" />
        <div className="h-6 w-20 bg-muted/20 rounded animate-pulse" />
      </div>
    </motion.div>
  );
}
