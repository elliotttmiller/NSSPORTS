// Utility functions for formatting betting data

/**
 * Safely convert any date-like value to a Date object
 */
export const safeDate = (
  date: Date | string | number | null | undefined,
): Date => {
  try {
    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        console.warn("Invalid Date object received, using current date");
        return new Date();
      }
      return date;
    }

    if (typeof date === "string" || typeof date === "number") {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        console.warn("Failed to parse date:", date, "using current date");
        return new Date();
      }
      return parsed;
    }

    console.warn("Date is null/undefined, using current date");
    return new Date();
  } catch (error) {
    console.error("Error in safeDate:", error, "using current date");
    return new Date();
  }
};

/**
 * Format date with error handling - compact version for components
 */
export const formatDate = (
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  },
): string => {
  try {
    const safeD = safeDate(date);
    return new Intl.DateTimeFormat("en-US", options).format(safeD);
  } catch (error) {
    console.warn("Date formatting error:", error);
    return "TBD";
  }
};

/**
 * Format date with detailed options - for GameDetailPage
 */
export const formatDateDetailed = (
  date: Date | string | number | null | undefined,
): string => {
  return formatDate(date, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Convert decimal to numeric format for totals (e.g., 41.5 -> "41.5")
 */
export const formatTotalLine = (total: number): string => {
  if (typeof total !== "number" || isNaN(total)) {
    return "0";
  }

  // Format to one decimal place if needed, otherwise show as integer
  return total % 1 === 0 ? total.toString() : total.toFixed(1);
};

/**
 * Format odds with proper + sign for positive odds
 */
export const formatOdds = (odds: number): string => {
  return odds > 0 ? `+${odds}` : `${odds}`;
};

/**
 * Format spread lines with proper + sign for positive lines
 */
export const formatSpreadLine = (line: number): string => {
  return line > 0 ? `+${line}` : `${line}`;
};

/**
 * Format time only for compact displays
 */
export const formatTime = (
  date: Date | string | number | null | undefined,
): string => {
  return formatDate(date, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};
