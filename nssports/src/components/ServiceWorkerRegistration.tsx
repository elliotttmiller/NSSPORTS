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
    // Only register in production and if service workers are supported
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);
          
          // Check for updates periodically
          registration.update();
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}
