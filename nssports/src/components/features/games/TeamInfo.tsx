"use client";

import { memo } from "react";
import { TeamLogo } from "./TeamLogo";
import type { Team } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  team: Team;
  score?: number | null;
  size?: number;
  className?: string;
}

export const TeamInfo = memo(function TeamInfo({ team, score, size = 16, className }: Props) {
  return (
    <div className={cn("flex items-center gap-1 min-w-0 flex-1", className)}>
      <TeamLogo src={team.logo} alt={team.name} size={size} />
      <span className="text-xs font-medium text-foreground truncate leading-tight">
        {team.shortName || team.name}
      </span>
      {typeof score === 'number' ? (
        <span className="text-xs font-bold text-foreground ml-auto shrink-0">{score}</span>
      ) : (
        team.record ? (
          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{team.record}</span>
        ) : null
      )}
    </div>
  );
});

TeamInfo.displayName = 'TeamInfo';

export default TeamInfo;
