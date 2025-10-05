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

// Format currency in compact notation for tight spaces (e.g., mobile): $10K, $1.2M
export function formatCurrencyCompact(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: abs >= 1000 ? 1 : 2,
    minimumFractionDigits: 0,
  }).format(abs);
  return isNegative ? `-${formatted}` : formatted;
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

// Format currency without cents (no decimals)
export function formatCurrencyNoCents(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
