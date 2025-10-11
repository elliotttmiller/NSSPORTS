"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AddToHomeScreenPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    // Show only on iOS Safari when not installed; other platforms will use native browser prompt automatically
    if (!isStandalone && isIOS) {
      setVisible(true);
    }

    const onInstalled = () => {
      setVisible(false);
      toast.success("App installed");
    };

    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3" onClick={() => setVisible(false)}>
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70 shadow-lg">
        <div className="flex items-center gap-3 p-3">
          <div className="flex-1">
            <div className="text-sm font-semibold">Add to Home Screen</div>
            <div className="text-xs text-muted-foreground">
              On iOS, tap the Share icon, then Add to Home Screen to install NSSPORTS.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setVisible(false); }} aria-label="Dismiss install instructions" title="Dismiss">
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
