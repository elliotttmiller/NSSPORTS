// Utility for handling bet interactions and feedback
import { toast } from "sonner";

export const provideBetFeedback = (
  betAdded: boolean,
  betType: string,
  selection: string,
  teamName?: string,
) => {
  // Haptic feedback for mobile devices
  if (navigator.vibrate) {
    navigator.vibrate(betAdded ? [50, 50, 50] : [25]);
  }

  // Optional toast notification for significant actions
  if (betAdded) {
    toast.success(
      `Added ${teamName ? `${teamName} ` : ""}${betType} ${selection} to bet slip`,
      { duration: 1500 },
    );
  }
};

// Helper for smooth animation delays
export const getStaggerDelay = (index: number, baseDelay: number = 0.05) => {
  return index * baseDelay;
};

// Animation presets for bet buttons
export const betButtonAnimations = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.2, type: "spring" as const, stiffness: 300 },
};

export const mobileButtonAnimations = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: { duration: 0.2, type: "spring" as const, stiffness: 400 },
};
