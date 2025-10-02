// Fetch all bets for a user
export function useBets(userId) {
  return useApi(`/redis/bets/${userId}`);
}

// Set all bets for a user
export function useSetBets() {
  return useCallback(async (userId, bets) => {
    const res = await fetch(`${API_BASE}/redis/bets/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bets),
    });
    return res.ok;
  }, []);
}
import { useState, useEffect, useCallback } from "react";
import { debounce } from "@/utils/debounce";

const API_BASE = "/api/v1";

// Generic fetch hook
interface UseApiOptions extends RequestInit {
  debounceMs?: number;
}

function useApi(endpoint: string, options: UseApiOptions = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Optionally debounce API calls for endpoints prone to rapid requests
  const debounceMs = options.debounceMs || 0;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Always add ngrok-skip-browser-warning header
      const mergedOptions = {
        ...options,
        headers: {
          ...(options.headers || {}),
          "ngrok-skip-browser-warning": "true",
        },
      };
      const res = await fetch(API_BASE + endpoint, mergedOptions);
      if (res.ok) {
        const json = await res.json();
        setData(json.success ? json.data : json);
      } else {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, JSON.stringify(options)]);

  // Debounced version of fetchData
  const debouncedFetchData = useCallback(
    debounceMs > 0 ? debounce(fetchData, debounceMs) : fetchData,
    [fetchData, debounceMs],
  );

  useEffect(() => {
    debouncedFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFetchData]);

  // Return refetch function along with data, loading, error
  return { data, loading, error, refetch: debouncedFetchData };
}

// User
export function useUser(userId) {
  return useApi(`/redis/user/${userId}`);
}
export function useSetUser() {
  return useCallback(async (userId, profile) => {
    const res = await fetch(`${API_BASE}/redis/user/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    return res.ok;
  }, []);
}

// BetSlip
export function useActiveBetSlip(userId) {
  return useApi(`/redis/betslip/${userId}/active`);
}
export function useSetActiveBetSlip() {
  return useCallback(async (userId, betSlip) => {
    const res = await fetch(`${API_BASE}/redis/betslip/${userId}/active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(betSlip),
    });
    return res.ok;
  }, []);
}
export function useBetSlipHistory(userId, count = 10) {
  return useApi(`/redis/betslip/${userId}/history?count=${count}`);
}
export function useAddBetSlipToHistory() {
  return useCallback(async (userId, betslipId) => {
    const res = await fetch(`${API_BASE}/redis/betslip/${userId}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betslipId }),
    });
    return res.ok;
  }, []);
}

// Bet
export function useBet(betId) {
  return useApi(`/redis/bet/${betId}`);
}
export function useSetBet() {
  return useCallback(async (betId, bet) => {
    const res = await fetch(`${API_BASE}/redis/bet/${betId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bet),
    });
    return res.ok;
  }, []);
}

// Game
export function useGame(gameId) {
  return useApi(`/redis/game/${gameId}`);
}
export function useSetGame() {
  return useCallback(async (gameId, game) => {
    const res = await fetch(`${API_BASE}/redis/game/${gameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(game),
    });
    return res.ok;
  }, []);
}

// Leaderboard
export function useLeaderboard(type, count = 10) {
  return useApi(`/leaderboard/${type}?count=${count}`);
}
export function useUpdateLeaderboard() {
  return useCallback(async (type, userId, score) => {
    const res = await fetch(`${API_BASE}/leaderboard/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, score }),
    });
    return res.ok;
  }, []);
}
