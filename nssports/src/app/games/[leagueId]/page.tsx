import { LeaguePageClient } from './LeaguePageClient';

export function generateStaticParams() {
  return [
    { leagueId: 'nba' },
    { leagueId: 'nfl' },
    { leagueId: 'nhl' },
    { leagueId: 'mlb' },
    { leagueId: 'ncaab' },
    { leagueId: 'ncaaf' },
  ];
}

export const dynamicParams = false;

export default function LeaguePage() {
  return <LeaguePageClient />;
}
