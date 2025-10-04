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
      { id: 'hawks', name: 'Atlanta Hawks', shortName: 'ATL', logo: '/logos/nba/atlanta-hawks.svg', record: '', leagueId: 'nba' },
      { id: 'celtics', name: 'Boston Celtics', shortName: 'BOS', logo: '/logos/nba/boston-celtics.svg', record: '', leagueId: 'nba' },
      { id: 'nets', name: 'Brooklyn Nets', shortName: 'BKN', logo: '/logos/nba/brooklyn-nets.svg', record: '', leagueId: 'nba' },
      { id: 'hornets', name: 'Charlotte Hornets', shortName: 'CHA', logo: '/logos/nba/charlotte-hornets.svg', record: '', leagueId: 'nba' },
      { id: 'bulls', name: 'Chicago Bulls', shortName: 'CHI', logo: '/logos/nba/chicago-bulls.svg', record: '', leagueId: 'nba' },
      { id: 'cavaliers', name: 'Cleveland Cavaliers', shortName: 'CLE', logo: '/logos/nba/cleveland-cavaliers.svg', record: '', leagueId: 'nba' },
      { id: 'mavericks', name: 'Dallas Mavericks', shortName: 'DAL', logo: '/logos/nba/dallas-mavericks.svg', record: '', leagueId: 'nba' },
      { id: 'nuggets', name: 'Denver Nuggets', shortName: 'DEN', logo: '/logos/nba/denver-nuggets.svg', record: '', leagueId: 'nba' },
      { id: 'pistons', name: 'Detroit Pistons', shortName: 'DET', logo: '/logos/nba/detroit-pistons.svg', record: '', leagueId: 'nba' },
      { id: 'warriors', name: 'Golden State Warriors', shortName: 'GSW', logo: '/logos/nba/golden-state-warriors.svg', record: '', leagueId: 'nba' },
      { id: 'rockets', name: 'Houston Rockets', shortName: 'HOU', logo: '/logos/nba/houston-rockets.svg', record: '', leagueId: 'nba' },
      { id: 'pacers', name: 'Indiana Pacers', shortName: 'IND', logo: '/logos/nba/indiana-pacers.svg', record: '', leagueId: 'nba' },
      { id: 'clippers', name: 'Los Angeles Clippers', shortName: 'LAC', logo: '/logos/nba/los-angeles-clippers.svg', record: '', leagueId: 'nba' },
      { id: 'lakers', name: 'Los Angeles Lakers', shortName: 'LAL', logo: '/logos/nba/los-angeles-lakers.svg', record: '', leagueId: 'nba' },
      { id: 'grizzlies', name: 'Memphis Grizzlies', shortName: 'MEM', logo: '/logos/nba/memphis-grizzlies.svg', record: '', leagueId: 'nba' },
      { id: 'heat', name: 'Miami Heat', shortName: 'MIA', logo: '/logos/nba/miami-heat.svg', record: '', leagueId: 'nba' },
      { id: 'bucks', name: 'Milwaukee Bucks', shortName: 'MIL', logo: '/logos/nba/milwaukee-bucks.svg', record: '', leagueId: 'nba' },
      { id: 'timberwolves', name: 'Minnesota Timberwolves', shortName: 'MIN', logo: '/logos/nba/minnesota-timberwolves.svg', record: '', leagueId: 'nba' },
      { id: 'pelicans', name: 'New Orleans Pelicans', shortName: 'NOP', logo: '/logos/nba/new-orleans-pelicans.svg', record: '', leagueId: 'nba' },
      { id: 'knicks', name: 'New York Knicks', shortName: 'NYK', logo: '/logos/nba/new-york-knicks.svg', record: '', leagueId: 'nba' },
      { id: 'thunder', name: 'Oklahoma City Thunder', shortName: 'OKC', logo: '/logos/nba/oklahoma-city-thunder.svg', record: '', leagueId: 'nba' },
      { id: 'magic', name: 'Orlando Magic', shortName: 'ORL', logo: '/logos/nba/orlando-magic.svg', record: '', leagueId: 'nba' },
      { id: '76ers', name: 'Philadelphia 76ers', shortName: 'PHI', logo: '/logos/nba/philadelphia-76ers.svg', record: '', leagueId: 'nba' },
      { id: 'suns', name: 'Phoenix Suns', shortName: 'PHX', logo: '/logos/nba/phoenix-suns.svg', record: '', leagueId: 'nba' },
      { id: 'blazers', name: 'Portland Trail Blazers', shortName: 'POR', logo: '/logos/nba/portland-trail-blazers.svg', record: '', leagueId: 'nba' },
      { id: 'kings', name: 'Sacramento Kings', shortName: 'SAC', logo: '/logos/nba/sacramento-kings.svg', record: '', leagueId: 'nba' },
      { id: 'spurs', name: 'San Antonio Spurs', shortName: 'SAS', logo: '/logos/nba/san-antonio-spurs.svg', record: '', leagueId: 'nba' },
      { id: 'raptors', name: 'Toronto Raptors', shortName: 'TOR', logo: '/logos/nba/toronto-raptors.svg', record: '', leagueId: 'nba' },
      { id: 'jazz', name: 'Utah Jazz', shortName: 'UTA', logo: '/logos/nba/utah-jazz.svg', record: '', leagueId: 'nba' },
      { id: 'wizards', name: 'Washington Wizards', shortName: 'WAS', logo: '/logos/nba/washington-wizards.svg', record: '', leagueId: 'nba' },
    ],
  });

  // Create NFL Teams
  console.log('Creating NFL teams...');
  await prisma.team.createMany({
    data: [
      { id: '49ers', name: 'San Francisco 49ers', shortName: 'SF', logo: '/logos/nfl/san-francisco-49ers.svg', record: '', leagueId: 'nfl' },
      { id: 'bears', name: 'Chicago Bears', shortName: 'CHI', logo: '/logos/nfl/chicago-bears.svg', record: '', leagueId: 'nfl' },
      { id: 'bengals', name: 'Cincinnati Bengals', shortName: 'CIN', logo: '/logos/nfl/cincinnati-bengals.svg', record: '', leagueId: 'nfl' },
      { id: 'bills', name: 'Buffalo Bills', shortName: 'BUF', logo: '/logos/nfl/buffalo-bills.svg', record: '', leagueId: 'nfl' },
      { id: 'broncos', name: 'Denver Broncos', shortName: 'DEN', logo: '/logos/nfl/denver-broncos.svg', record: '', leagueId: 'nfl' },
      { id: 'browns', name: 'Cleveland Browns', shortName: 'CLE', logo: '/logos/nfl/cleveland-browns.svg', record: '', leagueId: 'nfl' },
      { id: 'buccaneers', name: 'Tampa Bay Buccaneers', shortName: 'TB', logo: '/logos/nfl/tampa-bay-buccaneers.svg', record: '', leagueId: 'nfl' },
      { id: 'cardinals', name: 'Arizona Cardinals', shortName: 'ARI', logo: '/logos/nfl/arizona-cardinals.svg', record: '', leagueId: 'nfl' },
      { id: 'chargers', name: 'Los Angeles Chargers', shortName: 'LAC', logo: '/logos/nfl/los-angeles-chargers.svg', record: '', leagueId: 'nfl' },
      { id: 'chiefs', name: 'Kansas City Chiefs', shortName: 'KC', logo: '/logos/nfl/kansas-city-chiefs.svg', record: '', leagueId: 'nfl' },
      { id: 'colts', name: 'Indianapolis Colts', shortName: 'IND', logo: '/logos/nfl/indianapolis-colts.svg', record: '', leagueId: 'nfl' },
      { id: 'commanders', name: 'Washington Commanders', shortName: 'WAS', logo: '/logos/nfl/washington-commanders.svg', record: '', leagueId: 'nfl' },
      { id: 'cowboys', name: 'Dallas Cowboys', shortName: 'DAL', logo: '/logos/nfl/dallas-cowboys.svg', record: '', leagueId: 'nfl' },
      { id: 'dolphins', name: 'Miami Dolphins', shortName: 'MIA', logo: '/logos/nfl/miami-dolphins.svg', record: '', leagueId: 'nfl' },
      { id: 'eagles', name: 'Philadelphia Eagles', shortName: 'PHI', logo: '/logos/nfl/philadelphia-eagles.svg', record: '', leagueId: 'nfl' },
      { id: 'falcons', name: 'Atlanta Falcons', shortName: 'ATL', logo: '/logos/nfl/atlanta-falcons.svg', record: '', leagueId: 'nfl' },
      { id: 'giants', name: 'New York Giants', shortName: 'NYG', logo: '/logos/nfl/new-york-giants.svg', record: '', leagueId: 'nfl' },
      { id: 'jaguars', name: 'Jacksonville Jaguars', shortName: 'JAX', logo: '/logos/nfl/jacksonville-jaguars.svg', record: '', leagueId: 'nfl' },
      { id: 'jets', name: 'New York Jets', shortName: 'NYJ', logo: '/logos/nfl/new-york-jets.svg', record: '', leagueId: 'nfl' },
      { id: 'lions', name: 'Detroit Lions', shortName: 'DET', logo: '/logos/nfl/detroit-lions.svg', record: '', leagueId: 'nfl' },
      { id: 'packers', name: 'Green Bay Packers', shortName: 'GB', logo: '/logos/nfl/green-bay-packers.svg', record: '', leagueId: 'nfl' },
      { id: 'panthers', name: 'Carolina Panthers', shortName: 'CAR', logo: '/logos/nfl/carolina-panthers.svg', record: '', leagueId: 'nfl' },
      { id: 'patriots', name: 'New England Patriots', shortName: 'NE', logo: '/logos/nfl/new-england-patriots.svg', record: '', leagueId: 'nfl' },
      { id: 'raiders', name: 'Las Vegas Raiders', shortName: 'LV', logo: '/logos/nfl/las-vegas-raiders.svg', record: '', leagueId: 'nfl' },
      { id: 'rams', name: 'Los Angeles Rams', shortName: 'LAR', logo: '/logos/nfl/los-angeles-rams.svg', record: '', leagueId: 'nfl' },
      { id: 'ravens', name: 'Baltimore Ravens', shortName: 'BAL', logo: '/logos/nfl/baltimore-ravens.svg', record: '', leagueId: 'nfl' },
      { id: 'saints', name: 'New Orleans Saints', shortName: 'NO', logo: '/logos/nfl/new-orleans-saints.svg', record: '', leagueId: 'nfl' },
      { id: 'seahawks', name: 'Seattle Seahawks', shortName: 'SEA', logo: '/logos/nfl/seattle-seahawks.svg', record: '', leagueId: 'nfl' },
      { id: 'steelers', name: 'Pittsburgh Steelers', shortName: 'PIT', logo: '/logos/nfl/pittsburgh-steelers.svg', record: '', leagueId: 'nfl' },
      { id: 'texans', name: 'Houston Texans', shortName: 'HOU', logo: '/logos/nfl/houston-texans.svg', record: '', leagueId: 'nfl' },
      { id: 'titans', name: 'Tennessee Titans', shortName: 'TEN', logo: '/logos/nfl/tennessee-titans.svg', record: '', leagueId: 'nfl' },
      { id: 'vikings', name: 'Minnesota Vikings', shortName: 'MIN', logo: '/logos/nfl/minnesota-vikings.svg', record: '', leagueId: 'nfl' },
    ],
  });

  // Create NHL Teams
  console.log('Creating NHL teams...');
  await prisma.team.createMany({
    data: [
      { id: 'ducks', name: 'Anaheim Ducks', shortName: 'ANA', logo: '/logos/nhl/anaheim-ducks.svg', record: '', leagueId: 'nhl' },
      { id: 'coyotes', name: 'Arizona Coyotes', shortName: 'ARI', logo: '/logos/nhl/arizona-coyotes.svg', record: '', leagueId: 'nhl' },
      { id: 'bruins', name: 'Boston Bruins', shortName: 'BOS', logo: '/logos/nhl/boston-bruins.svg', record: '', leagueId: 'nhl' },
      { id: 'sabres', name: 'Buffalo Sabres', shortName: 'BUF', logo: '/logos/nhl/buffalo-sabres.svg', record: '', leagueId: 'nhl' },
      { id: 'flames', name: 'Calgary Flames', shortName: 'CGY', logo: '/logos/nhl/calgary-flames.svg', record: '', leagueId: 'nhl' },
      { id: 'hurricanes', name: 'Carolina Hurricanes', shortName: 'CAR', logo: '/logos/nhl/carolina-hurricanes.svg', record: '', leagueId: 'nhl' },
      { id: 'blackhawks', name: 'Chicago Blackhawks', shortName: 'CHI', logo: '/logos/nhl/chicago-blackhawks.svg', record: '', leagueId: 'nhl' },
      { id: 'avalanche', name: 'Colorado Avalanche', shortName: 'COL', logo: '/logos/nhl/colorado-avalanche.svg', record: '', leagueId: 'nhl' },
      { id: 'blue-jackets', name: 'Columbus Blue Jackets', shortName: 'CBJ', logo: '/logos/nhl/columbus-blue-jackets.svg', record: '', leagueId: 'nhl' },
      { id: 'stars', name: 'Dallas Stars', shortName: 'DAL', logo: '/logos/nhl/dallas-stars.svg', record: '', leagueId: 'nhl' },
      { id: 'red-wings', name: 'Detroit Red Wings', shortName: 'DET', logo: '/logos/nhl/detroit-red-wings.svg', record: '', leagueId: 'nhl' },
      { id: 'oilers', name: 'Edmonton Oilers', shortName: 'EDM', logo: '/logos/nhl/edmonton-oilers.svg', record: '', leagueId: 'nhl' },
      { id: 'panthers', name: 'Florida Panthers', shortName: 'FLA', logo: '/logos/nhl/florida-panthers.svg', record: '', leagueId: 'nhl' },
      { id: 'kings', name: 'Los Angeles Kings', shortName: 'LAK', logo: '/logos/nhl/los-angeles-kings.svg', record: '', leagueId: 'nhl' },
      { id: 'wild', name: 'Minnesota Wild', shortName: 'MIN', logo: '/logos/nhl/minnesota-wild.svg', record: '', leagueId: 'nhl' },
      { id: 'canadiens', name: 'Montreal Canadiens', shortName: 'MTL', logo: '/logos/nhl/montreal-canadiens.svg', record: '', leagueId: 'nhl' },
      { id: 'predators', name: 'Nashville Predators', shortName: 'NSH', logo: '/logos/nhl/nashville-predators.svg', record: '', leagueId: 'nhl' },
      { id: 'devils', name: 'New Jersey Devils', shortName: 'NJD', logo: '/logos/nhl/new-jersey-devils.svg', record: '', leagueId: 'nhl' },
      { id: 'islanders', name: 'New York Islanders', shortName: 'NYI', logo: '/logos/nhl/new-york-islanders.svg', record: '', leagueId: 'nhl' },
      { id: 'rangers', name: 'New York Rangers', shortName: 'NYR', logo: '/logos/nhl/new-york-rangers.svg', record: '', leagueId: 'nhl' },
      { id: 'senators', name: 'Ottawa Senators', shortName: 'OTT', logo: '/logos/nhl/ottawa-senators.svg', record: '', leagueId: 'nhl' },
      { id: 'flyers', name: 'Philadelphia Flyers', shortName: 'PHI', logo: '/logos/nhl/philadelphia-flyers.svg', record: '', leagueId: 'nhl' },
      { id: 'penguins', name: 'Pittsburgh Penguins', shortName: 'PIT', logo: '/logos/nhl/pittsburgh-penguins.svg', record: '', leagueId: 'nhl' },
      { id: 'sharks', name: 'San Jose Sharks', shortName: 'SJS', logo: '/logos/nhl/san-jose-sharks.svg', record: '', leagueId: 'nhl' },
      { id: 'kraken', name: 'Seattle Kraken', shortName: 'SEA', logo: '/logos/nhl/seattle-kraken.svg', record: '', leagueId: 'nhl' },
      { id: 'blues', name: 'St. Louis Blues', shortName: 'STL', logo: '/logos/nhl/st-louis-blues.svg', record: '', leagueId: 'nhl' },
      { id: 'lightning', name: 'Tampa Bay Lightning', shortName: 'TB', logo: '/logos/nhl/tampa-bay-lightning.svg', record: '', leagueId: 'nhl' },
      { id: 'maple-leafs', name: 'Toronto Maple Leafs', shortName: 'TOR', logo: '/logos/nhl/toronto-maple-leafs.svg', record: '', leagueId: 'nhl' },
      { id: 'canucks', name: 'Vancouver Canucks', shortName: 'VAN', logo: '/logos/nhl/vancouver-canucks.svg', record: '', leagueId: 'nhl' },
      { id: 'golden-knights', name: 'Vegas Golden Knights', shortName: 'VGK', logo: '/logos/nhl/vegas-golden-knights.svg', record: '', leagueId: 'nhl' },
      { id: 'capitals', name: 'Washington Capitals', shortName: 'WSH', logo: '/logos/nhl/washington-capitals.svg', record: '', leagueId: 'nhl' },
      { id: 'jets', name: 'Winnipeg Jets', shortName: 'WPG', logo: '/logos/nhl/winnipeg-jets.svg', record: '', leagueId: 'nhl' },
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
