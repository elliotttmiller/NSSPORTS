"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBetSlip } from "@/context";

/**
 * TeaserModeGuard Component
 * 
 * Ensures teaser bet mode is strictly scoped to the /teasers page.
 * Automatically resets betType to "single" when navigating away from /teasers.
 * 
 * This prevents teaser validation logic from interfering with normal game cards
 * on other pages like /games, /props, etc.
 */
export function TeaserModeGuard() {
  const pathname = usePathname();
  const { betSlip, setBetType } = useBetSlip();

  useEffect(() => {
    // If we're in teaser mode but NOT on the teaser page, reset to single mode
    if (betSlip.betType === "teaser" && pathname !== "/teasers") {
      console.log(`[TeaserModeGuard] Resetting teaser mode - left /teasers page (now on ${pathname})`);
      setBetType("single");
    }
  }, [pathname, betSlip.betType, setBetType]);

  return null; // This is a logic-only component
}
