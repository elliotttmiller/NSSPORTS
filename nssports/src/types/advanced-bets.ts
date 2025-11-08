/**
 * Advanced Bet Types - Industry Standard Implementation
 * 
 * This file contains type definitions for advanced betting types:
 * - Round Robin: Multiple parlays from selections
 * - If Bets: Conditional betting (If Win Only, If Win or Tie)
 * - Reverse Bets: Both directions (Win Reverse, Action Reverse)
 * - Bet It All: Progressive chain betting
 * 
 * Research Sources:
 * - Round Robin: DraftKings, FanDuel, BetMGM combination algorithms
 * - If Bets: Boyd's Bets, PPH Sportsbook conditional logic
 * - Reverse Bets: Action Reverse vs Win Reverse standards
 * - Bet It All: Progressive betting systems and chain betting
 */

import type { Bet } from "./index";

/**
 * ROUND ROBIN BET TYPES
 * 
 * Round Robin creates multiple parlays from a set of selections.
 * Algorithm: k-combinations where n = total selections, k = parlay size
 * Formula: C(n, k) = n! / (k!(n - k)!)
 * 
 * Example: 4 selections (A, B, C, D) "by 2's" creates:
 * - AB, AC, AD, BC, BD, CD (6 parlays)
 */

export type RoundRobinType = 
  | "by_2s"    // 2-team parlays
  | "by_3s"    // 3-team parlays
  | "by_4s"    // 4-team parlays
  | "by_5s"    // 5-team parlays
  | "by_6s"    // 6-team parlays
  | "by_7s"    // 7-team parlays
  | "by_8s";   // 8-team parlays

export interface RoundRobinConfig {
  type: RoundRobinType;
  parlaySize: number;           // Size of each parlay (2, 3, 4, etc.)
  displayName: string;          // "By 2's", "By 3's", etc.
  description: string;
}

export interface RoundRobinParlay {
  id: string;
  legs: Bet[];                  // Bets included in this parlay
  odds: number;                 // Combined odds
  stake: number;                // Individual parlay stake
  potentialPayout: number;
}

export interface RoundRobinBet {
  id: string;
  selections: Bet[];            // All selected bets
  roundRobinTypes: RoundRobinType[]; // Can do multiple (by 2's + by 3's)
  parlays: RoundRobinParlay[];  // All generated parlays
  stakePerParlay: number;       // Stake for each individual parlay
  totalStake: number;           // Total stake across all parlays
  totalParlays: number;         // Number of parlays created
  potentialPayout: number;      // If all parlays win
}

/**
 * IF BET TYPES
 * 
 * Conditional bets where next bet is placed only if condition is met.
 * "If Win Only": Next bet placed only on win
 * "If Win or Tie": Next bet placed on win or push
 */

export type IfBetCondition = 
  | "if_win_only"      // Next bet only if previous wins
  | "if_win_or_tie";   // Next bet if previous wins or pushes

export interface IfBetLeg {
  bet: Bet;
  order: number;              // Position in sequence (1, 2, 3, etc.)
  condition: IfBetCondition;
  status: "pending" | "active" | "won" | "lost" | "pushed" | "cancelled";
  triggeredBy?: string;       // ID of bet that triggered this leg
}

export interface IfBet {
  id: string;
  legs: IfBetLeg[];           // Sequence of conditional bets
  condition: IfBetCondition;
  totalStake: number;         // Initial stake
  currentStake?: number;      // Running stake if progressive
  potentialPayout: number;    // If all legs win
  status: "pending" | "active" | "settled" | "cancelled";
}

/**
 * REVERSE BET TYPES
 * 
 * Reverse bets place if bets in both directions.
 * "Win Reverse": Both directions, win-only triggers
 * "Action Reverse": Both directions, win/push/cancel triggers
 */

export type ReverseBetType = 
  | "win_reverse"      // Trigger only on wins
  | "action_reverse";  // Trigger on wins, pushes, or cancellations

export interface ReverseBetSequence {
  id: string;
  order: string[];            // Order of bet IDs (e.g., ["A", "B"])
  legs: IfBetLeg[];
  status: "pending" | "active" | "won" | "lost" | "pushed" | "cancelled";
  payout: number;
}

export interface ReverseBet {
  id: string;
  selections: Bet[];          // All selected bets
  type: ReverseBetType;
  sequences: ReverseBetSequence[]; // All direction combinations
  stakePerSequence: number;   // Stake for each sequence
  totalStake: number;         // Total stake (2x for 2 bets, 6x for 3 bets)
  potentialPayout: number;    // Maximum possible payout
  status: "pending" | "active" | "settled" | "cancelled";
}

/**
 * BET IT ALL TYPES
 * 
 * Progressive betting where winnings from each bet are automatically
 * bet on the next bet in the chain. All-or-nothing settlement.
 */

export interface BetItAllLeg {
  bet: Bet;
  order: number;              // Position in chain (1, 2, 3, etc.)
  stake: number;              // Stake for this leg (progressive)
  potentialPayout: number;
  status: "pending" | "active" | "won" | "lost" | "pushed" | "cancelled";
  actualPayout?: number;      // Actual payout if won
}

export interface BetItAll {
  id: string;
  legs: BetItAllLeg[];        // Chain of bets
  initialStake: number;       // Starting stake
  currentStake: number;       // Running stake amount
  potentialPayout: number;    // If all legs win
  status: "pending" | "active" | "settled" | "cancelled";
  allOrNothing: boolean;      // If true, lose resets to 0 (default true)
}

/**
 * ROUND ROBIN CONFIGURATIONS
 * Standard configurations for different parlay sizes
 */
export const ROUND_ROBIN_CONFIGS: Record<RoundRobinType, RoundRobinConfig> = {
  by_2s: {
    type: "by_2s",
    parlaySize: 2,
    displayName: "By 2's",
    description: "All possible 2-team parlays",
  },
  by_3s: {
    type: "by_3s",
    parlaySize: 3,
    displayName: "By 3's",
    description: "All possible 3-team parlays",
  },
  by_4s: {
    type: "by_4s",
    parlaySize: 4,
    displayName: "By 4's",
    description: "All possible 4-team parlays",
  },
  by_5s: {
    type: "by_5s",
    parlaySize: 5,
    displayName: "By 5's",
    description: "All possible 5-team parlays",
  },
  by_6s: {
    type: "by_6s",
    parlaySize: 6,
    displayName: "By 6's",
    description: "All possible 6-team parlays",
  },
  by_7s: {
    type: "by_7s",
    parlaySize: 7,
    displayName: "By 7's",
    description: "All possible 7-team parlays",
  },
  by_8s: {
    type: "by_8s",
    parlaySize: 8,
    displayName: "By 8's",
    description: "All possible 8-team parlays",
  },
};

/**
 * Helper function to calculate number of parlays in round robin
 * Formula: C(n, k) = n! / (k!(n - k)!)
 */
export function calculateRoundRobinParlays(
  numSelections: number,
  parlaySize: number
): number {
  if (parlaySize > numSelections || parlaySize < 1) return 0;
  
  // Calculate n! / (k!(n - k)!)
  let numerator = 1;
  let denominator = 1;
  
  for (let i = 0; i < parlaySize; i++) {
    numerator *= (numSelections - i);
    denominator *= (i + 1);
  }
  
  return Math.floor(numerator / denominator);
}

/**
 * Helper function to generate k-combinations for round robin
 * Returns all possible combinations of size k from array of size n
 */
export function generateCombinations<T>(
  items: T[],
  k: number
): T[][] {
  if (k === 0) return [[]];
  if (k > items.length) return [];
  
  const result: T[][] = [];
  
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}

/**
 * Helper function to generate all reverse bet sequences
 * For n selections, generates all permutations (n! sequences)
 */
export function generateReverseSequences(
  betIds: string[]
): string[][] {
  if (betIds.length === 0) return [];
  if (betIds.length === 1) return [[betIds[0]]];
  
  const result: string[][] = [];
  
  function permute(arr: string[], current: string[] = []) {
    if (current.length === arr.length) {
      result.push([...current]);
      return;
    }
    
    for (let i = 0; i < arr.length; i++) {
      if (current.includes(arr[i])) continue;
      current.push(arr[i]);
      permute(arr, current);
      current.pop();
    }
  }
  
  permute(betIds);
  return result;
}
