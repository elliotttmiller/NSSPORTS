"use client";

import { useEffect } from "react";
import { logger } from '@/lib/logger';

/**
 * Service Worker Registration Component
 * 
 * Official Next.js PWA Best Practices:
 * - Register service worker only in production
 * - Handle registration lifecycle events
 * - Support offline functionality
 * 
 * Reference: https://nextjs.org/docs/app/guides/progressive-web-apps
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    
    // Register service worker if supported (now works in dev too for testing)
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      // NEXT_PUBLIC_BASE_PATH is baked in at build time by next.config.ts, so it is
      // always defined at runtime.  The empty-string fallback is only present to
      // satisfy TypeScript (process.env values are typed as string | undefined).
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      navigator.serviceWorker
        .register(`${basePath}/sw.js`)
        .then((registration) => {
          if (isDev) {
            logger.info(`✅ Service Worker registered: ${registration.scope}`);
            logger.info('📱 PWA is ready! Add to Home Screen for app experience.');
          }
          // Check for updates periodically
          registration.update();
        })
        .catch((error) => {
          // Client-side error logging is acceptable for service worker
          logger.error('❌ Service Worker registration failed:', error as Error);
        });
    } else if (isDev) {
      logger.warn('⚠️ Service Workers not supported in this browser');
    }
  }, []);

  return null;
}
