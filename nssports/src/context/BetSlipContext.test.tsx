import { describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { BetSlipProvider, useBetSlip } from './BetSlipContext';
import type { Game } from '@/types';
import { ReactNode } from 'react';

// Mock the calculatePayout function
jest.mock('@/services/api', () => ({
  calculatePayout: (stake: number, odds: number) => {
    const decimalOdds = odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
    return stake * (decimalOdds - 1);
  },
}));

describe('BetSlipContext - Custom Mode', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <BetSlipProvider>{children}</BetSlipProvider>
  );

  const mockGame1: Game = {
    id: 'game1',
    leagueId: 'nba',
    homeTeam: {
      id: 'lakers',
      name: 'Los Angeles Lakers',
      shortName: 'LAL',
      logo: '/lakers.svg',
    },
    awayTeam: {
      id: 'celtics',
      name: 'Boston Celtics',
      shortName: 'BOS',
      logo: '/celtics.svg',
    },
    startTime: new Date('2024-01-01T19:00:00'),
    status: 'upcoming',
    odds: {
      spread: {
        home: { odds: -110, line: -2.5, lastUpdated: new Date() },
        away: { odds: -110, line: 2.5, lastUpdated: new Date() },
      },
      moneyline: {
        home: { odds: -140, lastUpdated: new Date() },
        away: { odds: 120, lastUpdated: new Date() },
      },
      total: {
        home: { odds: -110, line: 220.5, lastUpdated: new Date() },
        away: { odds: -110, line: 220.5, lastUpdated: new Date() },
        over: { odds: -110, line: 220.5, lastUpdated: new Date() },
        under: { odds: -110, line: 220.5, lastUpdated: new Date() },
      },
    },
  };

  const mockGame2: Game = {
    ...mockGame1,
    id: 'game2',
    homeTeam: {
      id: 'warriors',
      name: 'Golden State Warriors',
      shortName: 'GSW',
      logo: '/warriors.svg',
    },
    awayTeam: {
      id: 'nets',
      name: 'Brooklyn Nets',
      shortName: 'BKN',
      logo: '/nets.svg',
    },
  };

  it('should initialize with custom mode state', () => {
    const { result } = renderHook(() => useBetSlip(), { wrapper });

    expect(result.current.betSlip.customStraightBets).toEqual([]);
    expect(result.current.betSlip.customParlayBets).toEqual([]);
    expect(result.current.betSlip.customStakes).toEqual({});
  });

  it('should toggle a bet as straight in custom mode', () => {
    const { result } = renderHook(() => useBetSlip(), { wrapper });

    // Add a bet
    act(() => {
      result.current.addBet(mockGame1, 'moneyline', 'home', -140);
    });

    // Switch to custom mode
    act(() => {
      result.current.setBetType('custom');
    });

    const betId = result.current.betSlip.bets[0].id;

    // Toggle straight
    act(() => {
      result.current.toggleCustomStraight(betId);
    });

    expect(result.current.betSlip.customStraightBets).toContain(betId);
    expect(result.current.betSlip.customParlayBets).not.toContain(betId);
  });

  it('should toggle a bet as parlay in custom mode', () => {
    const { result } = renderHook(() => useBetSlip(), { wrapper });

    // Add a bet
    act(() => {
      result.current.addBet(mockGame1, 'moneyline', 'home', -140);
    });

    // Switch to custom mode
    act(() => {
      result.current.setBetType('custom');
    });

    const betId = result.current.betSlip.bets[0].id;

    // Toggle parlay
    act(() => {
      result.current.toggleCustomParlay(betId);
    });

    expect(result.current.betSlip.customParlayBets).toContain(betId);
    expect(result.current.betSlip.customStraightBets).not.toContain(betId);
  });

  it('should not allow a bet to be both straight and parlay', () => {
    const { result } = renderHook(() => useBetSlip(), { wrapper });

    // Add a bet
    act(() => {
      result.current.addBet(mockGame1, 'moneyline', 'home', -140);
    });

    // Switch to custom mode
    act(() => {
      result.current.setBetType('custom');
    });

    const betId = result.current.betSlip.bets[0].id;

    // Toggle straight
    act(() => {
      result.current.toggleCustomStraight(betId);
    });

    expect(result.current.betSlip.customStraightBets).toContain(betId);

    // Toggle parlay (should remove from straight)
    act(() => {
      result.current.toggleCustomParlay(betId);
    });

    expect(result.current.betSlip.customParlayBets).toContain(betId);
    expect(result.current.betSlip.customStraightBets).not.toContain(betId);
  });

  it('should update custom stake for a straight bet', () => {
    const { result } = renderHook(() => useBetSlip(), { wrapper });

    // Add a bet
    act(() => {
      result.current.addBet(mockGame1, 'moneyline', 'home', -140);
    });

    // Switch to custom mode
    act(() => {
      result.current.setBetType('custom');
    });

    const betId = result.current.betSlip.bets[0].id;

    // Toggle straight and update stake
    act(() => {
      result.current.toggleCustomStraight(betId);
      result.current.updateCustomStake(betId, 50);
    });

    expect(result.current.betSlip.customStakes?.[betId]).toBe(50);
  });

  it('should update custom stake for parlay', () => {
    const { result } = renderHook(() => useBetSlip(), { wrapper });

    // Add two bets
    act(() => {
      result.current.addBet(mockGame1, 'moneyline', 'home', -140);
      result.current.addBet(mockGame2, 'moneyline', 'away', 120);
    });

    // Switch to custom mode
    act(() => {
      result.current.setBetType('custom');
    });

    const betId1 = result.current.betSlip.bets[0].id;
    const betId2 = result.current.betSlip.bets[1].id;

    // Toggle both as parlay
    act(() => {
      result.current.toggleCustomParlay(betId1);
      result.current.toggleCustomParlay(betId2);
      result.current.updateCustomStake('parlay', 100);
    });

    expect(result.current.betSlip.customStakes?.['parlay']).toBe(100);
  });

  it('should calculate totals correctly in custom mode', () => {
    const { result } = renderHook(() => useBetSlip(), { wrapper });

    // Add three bets
    act(() => {
      result.current.addBet(mockGame1, 'moneyline', 'home', -140);
      result.current.addBet(mockGame2, 'moneyline', 'away', 120);
      result.current.addBet(mockGame1, 'spread', 'home', -110, -2.5);
    });

    // Switch to custom mode
    act(() => {
      result.current.setBetType('custom');
    });

    const betId1 = result.current.betSlip.bets[0].id;
    const betId2 = result.current.betSlip.bets[1].id;
    const betId3 = result.current.betSlip.bets[2].id;

    // One straight bet, two parlay bets
    act(() => {
      result.current.toggleCustomStraight(betId1);
      result.current.updateCustomStake(betId1, 50);
      
      result.current.toggleCustomParlay(betId2);
      result.current.toggleCustomParlay(betId3);
      result.current.updateCustomStake('parlay', 25);
    });

    // Total stake should be 50 (straight) + 25 (parlay) = 75
    expect(result.current.betSlip.totalStake).toBe(75);
    
    // Total payout should be greater than total stake
    expect(result.current.betSlip.totalPayout).toBeGreaterThan(75);
  });

  it('should remove bet from custom arrays when bet is removed', () => {
    const { result } = renderHook(() => useBetSlip(), { wrapper });

    // Add a bet
    act(() => {
      result.current.addBet(mockGame1, 'moneyline', 'home', -140);
    });

    // Switch to custom mode
    act(() => {
      result.current.setBetType('custom');
    });

    const betId = result.current.betSlip.bets[0].id;

    // Toggle straight
    act(() => {
      result.current.toggleCustomStraight(betId);
    });

    expect(result.current.betSlip.customStraightBets).toContain(betId);

    // Remove the bet
    act(() => {
      result.current.removeBet(betId);
    });

    expect(result.current.betSlip.customStraightBets).not.toContain(betId);
    expect(result.current.betSlip.bets).toHaveLength(0);
  });

  it('should clear all custom state when betslip is cleared', () => {
    const { result } = renderHook(() => useBetSlip(), { wrapper });

    // Add bets and configure custom mode
    act(() => {
      result.current.addBet(mockGame1, 'moneyline', 'home', -140);
      result.current.addBet(mockGame2, 'moneyline', 'away', 120);
      result.current.setBetType('custom');
    });

    const betId1 = result.current.betSlip.bets[0].id;
    const betId2 = result.current.betSlip.bets[1].id;

    act(() => {
      result.current.toggleCustomStraight(betId1);
      result.current.toggleCustomParlay(betId2);
      result.current.updateCustomStake(betId1, 50);
      result.current.updateCustomStake('parlay', 25);
    });

    // Clear betslip
    act(() => {
      result.current.clearBetSlip();
    });

    expect(result.current.betSlip.customStraightBets).toEqual([]);
    expect(result.current.betSlip.customParlayBets).toEqual([]);
    expect(result.current.betSlip.customStakes).toEqual({});
    expect(result.current.betSlip.bets).toHaveLength(0);
  });
});
