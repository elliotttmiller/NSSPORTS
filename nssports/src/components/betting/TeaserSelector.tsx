"use client";

import { useBetSlip } from "@/context/BetSlipContext";
import { getAvailableTeaserTypes, getTeaserConfig, type TeaserType } from "@/types/teaser";

/**
 * TeaserSelector Component
 * 
 * Allows users to select a teaser type from available options.
 * Displays teaser details including:
 * - Number of teams required
 * - Point adjustment (NFL/NBA)
 * - Push rule (Push/Lose/Revert)
 * - Odds/payout
 */
export function TeaserSelector() {
  const { betSlip, setTeaserType } = useBetSlip();
  const availableTeasers = getAvailableTeaserTypes();

  const handleTeaserSelect = (type: TeaserType) => {
    setTeaserType(type);
  };

  if (betSlip.betType !== "teaser") {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white/90">Select Teaser Type</h3>
      
      <div className="grid gap-2">
        {availableTeasers.map((type) => {
          const config = getTeaserConfig(type);
          const isSelected = betSlip.teaserType === type;
          
          return (
            <button
              key={type}
              onClick={() => handleTeaserSelect(type)}
              className={`
                rounded-lg border p-3 text-left transition-all
                ${isSelected 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-white">
                    {config.displayName}
                  </div>
                  <div className="mt-1 text-xs text-white/60">
                    {config.description}
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-white/10 px-2 py-0.5 text-white/80">
                      NFL: {config.pointAdjustment}pts
                    </span>
                    {config.nbaPointAdjustment && (
                      <span className="rounded bg-white/10 px-2 py-0.5 text-white/80">
                        NBA: {config.nbaPointAdjustment}pts
                      </span>
                    )}
                    <span className="rounded bg-white/10 px-2 py-0.5 text-white/80">
                      {config.minLegs === config.maxLegs 
                        ? `${config.minLegs} Teams` 
                        : `${config.minLegs}-${config.maxLegs} Teams`}
                    </span>
                  </div>
                </div>
                
                <div className="ml-3 text-right">
                  <div className={`text-lg font-bold ${config.odds > 0 ? 'text-green-400' : 'text-white'}`}>
                    {config.odds > 0 ? '+' : ''}{config.odds}
                  </div>
                  <div className="text-xs text-white/50">
                    {config.pushRule === 'push' && 'Ties Push'}
                    {config.pushRule === 'lose' && 'Ties Lose'}
                    {config.pushRule === 'revert' && 'Reverts Down'}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {betSlip.teaserType && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-white/70">
          <strong className="text-white/90">How Teasers Work:</strong>
          <ul className="mt-2 space-y-1 pl-4">
            <li className="list-disc">Select {getTeaserConfig(betSlip.teaserType as TeaserType).minLegs}+ spread or total bets</li>
            <li className="list-disc">Lines are adjusted in your favor by {getTeaserConfig(betSlip.teaserType as TeaserType).pointAdjustment} points (NFL) or {getTeaserConfig(betSlip.teaserType as TeaserType).nbaPointAdjustment} points (NBA)</li>
            <li className="list-disc">All legs must win for the bet to pay</li>
            <li className="list-disc">
              {getTeaserConfig(betSlip.teaserType as TeaserType).pushRule === 'push' && 'If a leg pushes (ties), your stake is refunded'}
              {getTeaserConfig(betSlip.teaserType as TeaserType).pushRule === 'lose' && 'If a leg pushes (ties), the entire bet loses'}
              {getTeaserConfig(betSlip.teaserType as TeaserType).pushRule === 'revert' && 'If a leg pushes (ties), the bet reverts to the next lower teaser size'}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
