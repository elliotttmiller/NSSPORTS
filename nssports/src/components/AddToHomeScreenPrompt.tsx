"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PROMPT_DISMISSED_KEY = "nssports_a2hs_dismissed";
const PROMPT_SHOWN_KEY = "nssports_a2hs_shown";

export function AddToHomeScreenPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user has already dismissed the prompt
    const hasBeenDismissed = localStorage.getItem(PROMPT_DISMISSED_KEY) === "true";
    const hasBeenShown = localStorage.getItem(PROMPT_SHOWN_KEY) === "true";

    if (hasBeenDismissed) {
      return; // Don't show if user has dismissed it before
    }

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    // Show only on iOS Safari when not installed and hasn't been shown before
    if (!isStandalone && isIOS && !hasBeenShown) {
      // Delay showing the prompt to avoid appearing during navigation
      const timer = setTimeout(() => {
        setVisible(true);
        localStorage.setItem(PROMPT_SHOWN_KEY, "true");
      }, 1000); // Show after 1 second delay

      return () => clearTimeout(timer);
    }

    const onInstalled = () => {
      setVisible(false);
      localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
      toast.success("App installed");
    };

    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-100 p-3" onClick={handleDismiss}>
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/70 shadow-lg">
        <div className="flex items-center gap-3 p-3">
          <div className="flex-1">
            <div className="text-sm font-semibold">Add to Home Screen</div>
            <div className="text-xs text-muted-foreground">
              On iOS, tap the Share icon, then Add to Home Screen to install NSSPORTS.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDismiss(); }} aria-label="Dismiss install instructions" title="Dismiss">
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
