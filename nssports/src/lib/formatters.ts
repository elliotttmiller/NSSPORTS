// Format odds for display
export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

// Format spread line for display
export function formatSpreadLine(line: number | undefined): string {
  if (line === undefined) return "—";
  return line > 0 ? `+${line}` : `${line}`;
}

// Format total line for display
export function formatTotalLine(line: number | undefined, type?: "over" | "under"): string {
  if (line === undefined) return "—";
  if (type) {
    return `${type === "over" ? "O" : "U"} ${line}`;
  }
  return `${line}`;
}

// Calculate potential payout
export function calculatePayout(stake: number, odds: number): number {
  if (odds > 0) {
    return stake * (odds / 100);
  } else {
    return stake * (100 / Math.abs(odds));
  }
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format date/time
export function formatGameTime(date: Date | string): string {
  const gameDate = typeof date === "string" ? new Date(date) : date;
  return gameDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatGameDate(date: Date | string): string {
  const gameDate = typeof date === "string" ? new Date(date) : date;
  return gameDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
