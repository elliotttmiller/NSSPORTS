"use client";

import { useEffect } from "react";

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
    // Register service worker if supported (now works in dev too for testing)
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("✅ Service Worker registered:", registration.scope);
          console.log("📱 PWA is ready! Add to Home Screen for app experience.");
          
          // Check for updates periodically
          registration.update();
        })
        .catch((error) => {
          console.error("❌ Service Worker registration failed:", error);
        });
    } else {
      console.log("⚠️ Service Workers not supported in this browser");
    }
  }, []);

  return null;
}
