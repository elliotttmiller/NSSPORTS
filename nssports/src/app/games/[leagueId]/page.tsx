import { LeaguePageClient } from './LeaguePageClient';

export function generateStaticParams() {
  return [];
}

export const dynamicParams = false;

export default function LeaguePage() {
  return <LeaguePageClient />;
}
