import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.bet.deleteMany();
  await prisma.odds.deleteMany();
  await prisma.game.deleteMany();
  await prisma.team.deleteMany();
  await prisma.league.deleteMany();
  await prisma.sport.deleteMany();

  // Create Sports
  console.log('Creating sports...');
  await prisma.sport.createMany({
    data: [
      { id: 'nba', name: 'Basketball', icon: '🏀' },
      { id: 'nfl', name: 'Football', icon: '🏈' },
      { id: 'nhl', name: 'Hockey', icon: '🏒' },
    ],
  });

  // Create Leagues
  console.log('Creating leagues...');
  await prisma.league.createMany({
    data: [
      { id: 'nba', name: 'NBA', sportId: 'nba' },
      { id: 'nfl', name: 'NFL', sportId: 'nfl' },
      { id: 'nhl', name: 'NHL', sportId: 'nhl' },
    ],
  });

  // Create NBA Teams
  console.log('Creating NBA teams...');
  await prisma.team.createMany({
    data: [
      { id: 'lakers', name: 'Los Angeles Lakers', shortName: 'LAL', logo: '/logos/nba/los-angeles-lakers.svg', record: '15-10', leagueId: 'nba' },
      { id: 'warriors', name: 'Golden State Warriors', shortName: 'GSW', logo: '/logos/nba/golden-state-warriors.svg', record: '12-13', leagueId: 'nba' },
      { id: 'celtics', name: 'Boston Celtics', shortName: 'BOS', logo: '/logos/nba/boston-celtics.svg', record: '18-7', leagueId: 'nba' },
      { id: 'heat', name: 'Miami Heat', shortName: 'MIA', logo: '/logos/nba/miami-heat.svg', record: '13-12', leagueId: 'nba' },
      { id: 'nets', name: 'Brooklyn Nets', shortName: 'BKN', logo: '/logos/nba/brooklyn-nets.svg', record: '11-14', leagueId: 'nba' },
      { id: '76ers', name: 'Philadelphia 76ers', shortName: 'PHI', logo: '/logos/nba/philadelphia-76ers.svg', record: '14-11', leagueId: 'nba' },
      { id: 'bucks', name: 'Milwaukee Bucks', shortName: 'MIL', logo: '/logos/nba/milwaukee-bucks.svg', record: '16-9', leagueId: 'nba' },
      { id: 'bulls', name: 'Chicago Bulls', shortName: 'CHI', logo: '/logos/nba/chicago-bulls.svg', record: '10-15', leagueId: 'nba' },
      { id: 'mavericks', name: 'Dallas Mavericks', shortName: 'DAL', logo: '/logos/nba/dallas-mavericks.svg', record: '17-8', leagueId: 'nba' },
      { id: 'suns', name: 'Phoenix Suns', shortName: 'PHX', logo: '/logos/nba/phoenix-suns.svg', record: '14-11', leagueId: 'nba' },
    ],
  });

  // Create NFL Teams
  console.log('Creating NFL teams...');
  await prisma.team.createMany({
    data: [
      { id: 'chiefs', name: 'Kansas City Chiefs', shortName: 'KC', logo: '/logos/nfl/kansas-city-chiefs.svg', record: '11-1', leagueId: 'nfl' },
      { id: 'bills', name: 'Buffalo Bills', shortName: 'BUF', logo: '/logos/nfl/buffalo-bills.svg', record: '10-2', leagueId: 'nfl' },
      { id: 'eagles', name: 'Philadelphia Eagles', shortName: 'PHI', logo: '/logos/nfl/philadelphia-eagles.svg', record: '10-2', leagueId: 'nfl' },
      { id: '49ers', name: 'San Francisco 49ers', shortName: 'SF', logo: '/logos/nfl/san-francisco-49ers.svg', record: '9-3', leagueId: 'nfl' },
      { id: 'cowboys', name: 'Dallas Cowboys', shortName: 'DAL', logo: '/logos/nfl/dallas-cowboys.svg', record: '8-4', leagueId: 'nfl' },
      { id: 'lions', name: 'Detroit Lions', shortName: 'DET', logo: '/logos/nfl/detroit-lions.svg', record: '9-3', leagueId: 'nfl' },
    ],
  });

  // Create NHL Teams
  console.log('Creating NHL teams...');
  await prisma.team.createMany({
    data: [
      { id: 'avalanche', name: 'Colorado Avalanche', shortName: 'COL', logo: '/logos/nhl/colorado-avalanche.svg', record: '18-14-0', leagueId: 'nhl' },
      { id: 'oilers', name: 'Edmonton Oilers', shortName: 'EDM', logo: '/logos/nhl/edmonton-oilers.svg', record: '20-11-2', leagueId: 'nhl' },
      { id: 'rangers', name: 'New York Rangers', shortName: 'NYR', logo: '/logos/nhl/new-york-rangers.svg', record: '16-13-1', leagueId: 'nhl' },
      { id: 'bruins', name: 'Boston Bruins', shortName: 'BOS', logo: '/logos/nhl/boston-bruins.svg', record: '19-12-3', leagueId: 'nhl' },
      { id: 'maple-leafs', name: 'Toronto Maple Leafs', shortName: 'TOR', logo: '/logos/nhl/toronto-maple-leafs.svg', record: '20-11-2', leagueId: 'nhl' },
      { id: 'lightning', name: 'Tampa Bay Lightning', shortName: 'TB', logo: '/logos/nhl/tampa-bay-lightning.svg', record: '17-12-2', leagueId: 'nhl' },
    ],
  });

  const now = new Date();

  // Create NBA Games
  console.log('Creating NBA games...');
  const nbaGame1 = await prisma.game.create({
    data: {
      id: '1',
      leagueId: 'nba',
      homeTeamId: 'lakers',
      awayTeamId: 'warriors',
      startTime: new Date(now.getTime() + 3600000),
      status: 'upcoming',
    },
  });

  // Create odds for game 1
  await prisma.odds.createMany({
    data: [
      { gameId: '1', betType: 'spread', selection: 'away', odds: -110, line: 2.5 },
      { gameId: '1', betType: 'spread', selection: 'home', odds: -110, line: -2.5 },
      { gameId: '1', betType: 'moneyline', selection: 'away', odds: 130 },
      { gameId: '1', betType: 'moneyline', selection: 'home', odds: -150 },
      { gameId: '1', betType: 'total', selection: 'over', odds: -110, line: 225.5 },
      { gameId: '1', betType: 'total', selection: 'under', odds: -110, line: 225.5 },
    ],
  });

  const nbaGame2 = await prisma.game.create({
    data: {
      id: '2',
      leagueId: 'nba',
      homeTeamId: 'celtics',
      awayTeamId: 'heat',
      startTime: new Date(now.getTime() + 5400000),
      status: 'upcoming',
    },
  });

  await prisma.odds.createMany({
    data: [
      { gameId: '2', betType: 'spread', selection: 'away', odds: -110, line: 5.5 },
      { gameId: '2', betType: 'spread', selection: 'home', odds: -110, line: -5.5 },
      { gameId: '2', betType: 'moneyline', selection: 'away', odds: 190 },
      { gameId: '2', betType: 'moneyline', selection: 'home', odds: -225 },
      { gameId: '2', betType: 'total', selection: 'over', odds: -110, line: 218.5 },
      { gameId: '2', betType: 'total', selection: 'under', odds: -110, line: 218.5 },
    ],
  });

  const nbaGame3 = await prisma.game.create({
    data: {
      id: '3',
      leagueId: 'nba',
      homeTeamId: 'nets',
      awayTeamId: '76ers',
      startTime: new Date(now.getTime() + 7200000),
      status: 'live',
    },
  });

  await prisma.odds.createMany({
    data: [
      { gameId: '3', betType: 'spread', selection: 'away', odds: -110, line: -3.5 },
      { gameId: '3', betType: 'spread', selection: 'home', odds: -110, line: 3.5 },
      { gameId: '3', betType: 'moneyline', selection: 'away', odds: -155 },
      { gameId: '3', betType: 'moneyline', selection: 'home', odds: 135 },
      { gameId: '3', betType: 'total', selection: 'over', odds: -110, line: 220.5 },
      { gameId: '3', betType: 'total', selection: 'under', odds: -110, line: 220.5 },
    ],
  });

  const nbaGame4 = await prisma.game.create({
    data: {
      id: '4',
      leagueId: 'nba',
      homeTeamId: 'bucks',
      awayTeamId: 'bulls',
      startTime: new Date(now.getTime() + 9000000),
      status: 'live',
    },
  });

  await prisma.odds.createMany({
    data: [
      { gameId: '4', betType: 'spread', selection: 'away', odds: -110, line: 7.5 },
      { gameId: '4', betType: 'spread', selection: 'home', odds: -110, line: -7.5 },
      { gameId: '4', betType: 'moneyline', selection: 'away', odds: 270 },
      { gameId: '4', betType: 'moneyline', selection: 'home', odds: -330 },
      { gameId: '4', betType: 'total', selection: 'over', odds: -110, line: 228.5 },
      { gameId: '4', betType: 'total', selection: 'under', odds: -110, line: 228.5 },
    ],
  });

  const nbaGame5 = await prisma.game.create({
    data: {
      id: '5',
      leagueId: 'nba',
      homeTeamId: 'mavericks',
      awayTeamId: 'suns',
      startTime: new Date(now.getTime() + 10800000),
      status: 'live',
    },
  });

  await prisma.odds.createMany({
    data: [
      { gameId: '5', betType: 'spread', selection: 'away', odds: -110, line: 1.5 },
      { gameId: '5', betType: 'spread', selection: 'home', odds: -110, line: -1.5 },
      { gameId: '5', betType: 'moneyline', selection: 'away', odds: 105 },
      { gameId: '5', betType: 'moneyline', selection: 'home', odds: -125 },
      { gameId: '5', betType: 'total', selection: 'over', odds: -110, line: 232.5 },
      { gameId: '5', betType: 'total', selection: 'under', odds: -110, line: 232.5 },
    ],
  });

  // Create NFL Games
  console.log('Creating NFL games...');
  const nflGame1 = await prisma.game.create({
    data: {
      id: 'nfl-1',
      leagueId: 'nfl',
      homeTeamId: 'chiefs',
      awayTeamId: 'bills',
      startTime: new Date(now.getTime() + 14400000),
      status: 'live',
    },
  });

  await prisma.odds.createMany({
    data: [
      { gameId: 'nfl-1', betType: 'spread', selection: 'away', odds: -110, line: 2.5 },
      { gameId: 'nfl-1', betType: 'spread', selection: 'home', odds: -110, line: -2.5 },
      { gameId: 'nfl-1', betType: 'moneyline', selection: 'away', odds: 125 },
      { gameId: 'nfl-1', betType: 'moneyline', selection: 'home', odds: -145 },
      { gameId: 'nfl-1', betType: 'total', selection: 'over', odds: -110, line: 48.5 },
      { gameId: 'nfl-1', betType: 'total', selection: 'under', odds: -110, line: 48.5 },
    ],
  });

  const nflGame2 = await prisma.game.create({
    data: {
      id: 'nfl-2',
      leagueId: 'nfl',
      homeTeamId: 'eagles',
      awayTeamId: '49ers',
      startTime: new Date(now.getTime() + 18000000),
      status: 'upcoming',
    },
  });

  await prisma.odds.createMany({
    data: [
      { gameId: 'nfl-2', betType: 'spread', selection: 'away', odds: -110, line: 3.5 },
      { gameId: 'nfl-2', betType: 'spread', selection: 'home', odds: -110, line: -3.5 },
      { gameId: 'nfl-2', betType: 'moneyline', selection: 'away', odds: 155 },
      { gameId: 'nfl-2', betType: 'moneyline', selection: 'home', odds: -180 },
      { gameId: 'nfl-2', betType: 'total', selection: 'over', odds: -110, line: 45.5 },
      { gameId: 'nfl-2', betType: 'total', selection: 'under', odds: -110, line: 45.5 },
    ],
  });

  const nflGame3 = await prisma.game.create({
    data: {
      id: 'nfl-3',
      leagueId: 'nfl',
      homeTeamId: 'cowboys',
      awayTeamId: 'lions',
      startTime: new Date(now.getTime() + 21600000),
      status: 'upcoming',
    },
  });

  await prisma.odds.createMany({
    data: [
      { gameId: 'nfl-3', betType: 'spread', selection: 'away', odds: -110, line: -1.5 },
      { gameId: 'nfl-3', betType: 'spread', selection: 'home', odds: -110, line: 1.5 },
      { gameId: 'nfl-3', betType: 'moneyline', selection: 'away', odds: -115 },
      { gameId: 'nfl-3', betType: 'moneyline', selection: 'home', odds: -105 },
      { gameId: 'nfl-3', betType: 'total', selection: 'over', odds: -110, line: 52.5 },
      { gameId: 'nfl-3', betType: 'total', selection: 'under', odds: -110, line: 52.5 },
    ],
  });

  // Create NHL Games
  console.log('Creating NHL games...');
  const nhlGame1 = await prisma.game.create({
    data: {
      id: 'nhl-1',
      leagueId: 'nhl',
      homeTeamId: 'avalanche',
      awayTeamId: 'oilers',
      startTime: new Date(now.getTime() + 7200000),
      status: 'live',
    },
  });

  await prisma.odds.createMany({
    data: [
      { gameId: 'nhl-1', betType: 'spread', selection: 'away', odds: 180, line: -1.5 },
      { gameId: 'nhl-1', betType: 'spread', selection: 'home', odds: -220, line: 1.5 },
      { gameId: 'nhl-1', betType: 'moneyline', selection: 'away', odds: -135 },
      { gameId: 'nhl-1', betType: 'moneyline', selection: 'home', odds: 115 },
      { gameId: 'nhl-1', betType: 'total', selection: 'over', odds: -110, line: 6.5 },
      { gameId: 'nhl-1', betType: 'total', selection: 'under', odds: -110, line: 6.5 },
    ],
  });

  const nhlGame2 = await prisma.game.create({
    data: {
      id: 'nhl-2',
      leagueId: 'nhl',
      homeTeamId: 'rangers',
      awayTeamId: 'bruins',
      startTime: new Date(now.getTime() + 10800000),
      status: 'live',
    },
  });

  await prisma.odds.createMany({
    data: [
      { gameId: 'nhl-2', betType: 'spread', selection: 'away', odds: 190, line: -1.5 },
      { gameId: 'nhl-2', betType: 'spread', selection: 'home', odds: -230, line: 1.5 },
      { gameId: 'nhl-2', betType: 'moneyline', selection: 'away', odds: -145 },
      { gameId: 'nhl-2', betType: 'moneyline', selection: 'home', odds: 125 },
      { gameId: 'nhl-2', betType: 'total', selection: 'over', odds: -110, line: 5.5 },
      { gameId: 'nhl-2', betType: 'total', selection: 'under', odds: -110, line: 5.5 },
    ],
  });

  const nhlGame3 = await prisma.game.create({
    data: {
      id: 'nhl-3',
      leagueId: 'nhl',
      homeTeamId: 'maple-leafs',
      awayTeamId: 'lightning',
      startTime: new Date(now.getTime() + 14400000),
      status: 'upcoming',
    },
  });

  await prisma.odds.createMany({
    data: [
      { gameId: 'nhl-3', betType: 'spread', selection: 'away', odds: -210, line: 1.5 },
      { gameId: 'nhl-3', betType: 'spread', selection: 'home', odds: 170, line: -1.5 },
      { gameId: 'nhl-3', betType: 'moneyline', selection: 'away', odds: 130 },
      { gameId: 'nhl-3', betType: 'moneyline', selection: 'home', odds: -150 },
      { gameId: 'nhl-3', betType: 'total', selection: 'over', odds: -110, line: 6.5 },
      { gameId: 'nhl-3', betType: 'total', selection: 'under', odds: -110, line: 6.5 },
    ],
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
