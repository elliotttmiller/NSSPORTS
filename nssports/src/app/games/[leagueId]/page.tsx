import { LeaguePageClient } from './LeaguePageClient';
import { STATIC_SPORTS } from '@/lib/data/sportsDatabase';

export function generateStaticParams() {
  return STATIC_SPORTS.flatMap((sport) =>
    sport.leagues.map((league) => ({ leagueId: league.id }))
  );
}

export const dynamicParams = false;

export default function LeaguePage() {
  return <LeaguePageClient />;
}
