import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.bet.deleteMany();
  await prisma.odds.deleteMany();
  await prisma.game.deleteMany();
  await prisma.team.deleteMany();
  await prisma.league.deleteMany();
  await prisma.sport.deleteMany();

  // Create Sports (official method: individual create calls)
  console.log('Creating sports...');
  const sportsData = [
    { id: 'basketball', name: 'Basketball', icon: '' },
    { id: 'football', name: 'Football', icon: '' },
    { id: 'hockey', name: 'Hockey', icon: '' },
  ];
  for (const sport of sportsData) {
    try {
      await prisma.sport.create({ data: sport });
    } catch (e) {
      console.error('Error creating sport:', sport, e);
    }
  }

  // Create Leagues (official method: individual create calls)
  console.log('Creating leagues...');
  const leaguesData = [
    { id: 'nba', name: 'NBA', sportId: 'basketball', logo: '/logos/nba/NBA.svg' },
    { id: 'nfl', name: 'NFL', sportId: 'football', logo: '/logos/nfl/NFL.svg' },
    { id: 'nhl', name: 'NHL', sportId: 'hockey', logo: '/logos/nhl/NHL.svg' },
  ];
  for (const league of leaguesData) {
    try {
      await prisma.league.create({ data: league });
    } catch (e) {
      console.error('Error creating league:', league, e);
    }
  }

  // Create NBA Teams
  console.log('Creating NBA teams...');
  const nbaTeamsData = [
  { id: 'nba-hawks', name: 'Atlanta Hawks', shortName: 'ATL', logo: '/logos/nba/atlanta-hawks.svg', record: '', leagueId: 'nba' },
  { id: 'nba-celtics', name: 'Boston Celtics', shortName: 'BOS', logo: '/logos/nba/boston-celtics.svg', record: '', leagueId: 'nba' },
  { id: 'nba-nets', name: 'Brooklyn Nets', shortName: 'BKN', logo: '/logos/nba/brooklyn-nets.svg', record: '', leagueId: 'nba' },
  { id: 'nba-hornets', name: 'Charlotte Hornets', shortName: 'CHA', logo: '/logos/nba/charlotte-hornets.svg', record: '', leagueId: 'nba' },
  { id: 'nba-bulls', name: 'Chicago Bulls', shortName: 'CHI', logo: '/logos/nba/chicago-bulls.svg', record: '', leagueId: 'nba' },
  { id: 'nba-cavaliers', name: 'Cleveland Cavaliers', shortName: 'CLE', logo: '/logos/nba/cleveland-cavaliers.svg', record: '', leagueId: 'nba' },
  { id: 'nba-mavericks', name: 'Dallas Mavericks', shortName: 'DAL', logo: '/logos/nba/dallas-mavericks.svg', record: '', leagueId: 'nba' },
  { id: 'nba-nuggets', name: 'Denver Nuggets', shortName: 'DEN', logo: '/logos/nba/denver-nuggets.svg', record: '', leagueId: 'nba' },
  { id: 'nba-pistons', name: 'Detroit Pistons', shortName: 'DET', logo: '/logos/nba/detroit-pistons.svg', record: '', leagueId: 'nba' },
  { id: 'nba-warriors', name: 'Golden State Warriors', shortName: 'GSW', logo: '/logos/nba/golden-state-warriors.svg', record: '', leagueId: 'nba' },
  { id: 'nba-rockets', name: 'Houston Rockets', shortName: 'HOU', logo: '/logos/nba/houston-rockets.svg', record: '', leagueId: 'nba' },
  { id: 'nba-pacers', name: 'Indiana Pacers', shortName: 'IND', logo: '/logos/nba/indiana-pacers.svg', record: '', leagueId: 'nba' },
  { id: 'nba-clippers', name: 'Los Angeles Clippers', shortName: 'LAC', logo: '/logos/nba/los-angeles-clippers.svg', record: '', leagueId: 'nba' },
  { id: 'nba-lakers', name: 'Los Angeles Lakers', shortName: 'LAL', logo: '/logos/nba/los-angeles-lakers.svg', record: '', leagueId: 'nba' },
  { id: 'nba-grizzlies', name: 'Memphis Grizzlies', shortName: 'MEM', logo: '/logos/nba/memphis-grizzlies.svg', record: '', leagueId: 'nba' },
  { id: 'nba-heat', name: 'Miami Heat', shortName: 'MIA', logo: '/logos/nba/miami-heat.svg', record: '', leagueId: 'nba' },
  { id: 'nba-bucks', name: 'Milwaukee Bucks', shortName: 'MIL', logo: '/logos/nba/milwaukee-bucks.svg', record: '', leagueId: 'nba' },
  { id: 'nba-timberwolves', name: 'Minnesota Timberwolves', shortName: 'MIN', logo: '/logos/nba/minnesota-timberwolves.svg', record: '', leagueId: 'nba' },
  { id: 'nba-pelicans', name: 'New Orleans Pelicans', shortName: 'NOP', logo: '/logos/nba/new-orleans-pelicans.svg', record: '', leagueId: 'nba' },
  { id: 'nba-knicks', name: 'New York Knicks', shortName: 'NYK', logo: '/logos/nba/new-york-knicks.svg', record: '', leagueId: 'nba' },
  { id: 'nba-thunder', name: 'Oklahoma City Thunder', shortName: 'OKC', logo: '/logos/nba/oklahoma-city-thunder.svg', record: '', leagueId: 'nba' },
  { id: 'nba-magic', name: 'Orlando Magic', shortName: 'ORL', logo: '/logos/nba/orlando-magic.svg', record: '', leagueId: 'nba' },
  { id: 'nba-76ers', name: 'Philadelphia 76ers', shortName: 'PHI', logo: '/logos/nba/philadelphia-76ers.svg', record: '', leagueId: 'nba' },
  { id: 'nba-suns', name: 'Phoenix Suns', shortName: 'PHX', logo: '/logos/nba/phoenix-suns.svg', record: '', leagueId: 'nba' },
  { id: 'nba-blazers', name: 'Portland Trail Blazers', shortName: 'POR', logo: '/logos/nba/portland-trail-blazers.svg', record: '', leagueId: 'nba' },
  { id: 'nba-kings', name: 'Sacramento Kings', shortName: 'SAC', logo: '/logos/nba/sacramento-kings.svg', record: '', leagueId: 'nba' },
  { id: 'nba-spurs', name: 'San Antonio Spurs', shortName: 'SAS', logo: '/logos/nba/san-antonio-spurs.svg', record: '', leagueId: 'nba' },
  { id: 'nba-raptors', name: 'Toronto Raptors', shortName: 'TOR', logo: '/logos/nba/toronto-raptors.svg', record: '', leagueId: 'nba' },
  { id: 'nba-jazz', name: 'Utah Jazz', shortName: 'UTA', logo: '/logos/nba/utah-jazz.svg', record: '', leagueId: 'nba' },
  { id: 'nba-wizards', name: 'Washington Wizards', shortName: 'WAS', logo: '/logos/nba/washington-wizards.svg', record: '', leagueId: 'nba' },
  ];
  for (const team of nbaTeamsData) {
    try {
      await prisma.team.create({ data: team });
    } catch (e) {
      console.error('Error creating NBA team:', team, e);
    }
  }
  const nbaTeamCount = await prisma.team.count({ where: { leagueId: 'nba' } });
  console.log(`Inserted ${nbaTeamCount} NBA teams`);

  // Create NFL Teams
  console.log('Creating NFL teams...');
  const nflTeamsData = [
  { id: 'nfl-49ers', name: 'San Francisco 49ers', shortName: 'SF', logo: '/logos/nfl/san-francisco-49ers.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-bears', name: 'Chicago Bears', shortName: 'CHI', logo: '/logos/nfl/chicago-bears.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-bengals', name: 'Cincinnati Bengals', shortName: 'CIN', logo: '/logos/nfl/cincinnati-bengals.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-bills', name: 'Buffalo Bills', shortName: 'BUF', logo: '/logos/nfl/buffalo-bills.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-broncos', name: 'Denver Broncos', shortName: 'DEN', logo: '/logos/nfl/denver-broncos.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-browns', name: 'Cleveland Browns', shortName: 'CLE', logo: '/logos/nfl/cleveland-browns.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-buccaneers', name: 'Tampa Bay Buccaneers', shortName: 'TB', logo: '/logos/nfl/tampa-bay-buccaneers.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-cardinals', name: 'Arizona Cardinals', shortName: 'ARI', logo: '/logos/nfl/arizona-cardinals.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-chargers', name: 'Los Angeles Chargers', shortName: 'LAC', logo: '/logos/nfl/los-angeles-chargers.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-chiefs', name: 'Kansas City Chiefs', shortName: 'KC', logo: '/logos/nfl/kansas-city-chiefs.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-colts', name: 'Indianapolis Colts', shortName: 'IND', logo: '/logos/nfl/indianapolis-colts.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-commanders', name: 'Washington Commanders', shortName: 'WAS', logo: '/logos/nfl/washington-commanders.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-cowboys', name: 'Dallas Cowboys', shortName: 'DAL', logo: '/logos/nfl/dallas-cowboys.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-dolphins', name: 'Miami Dolphins', shortName: 'MIA', logo: '/logos/nfl/miami-dolphins.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-eagles', name: 'Philadelphia Eagles', shortName: 'PHI', logo: '/logos/nfl/philadelphia-eagles.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-falcons', name: 'Atlanta Falcons', shortName: 'ATL', logo: '/logos/nfl/atlanta-falcons.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-giants', name: 'New York Giants', shortName: 'NYG', logo: '/logos/nfl/new-york-giants.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-jaguars', name: 'Jacksonville Jaguars', shortName: 'JAX', logo: '/logos/nfl/jacksonville-jaguars.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-jets', name: 'New York Jets', shortName: 'NYJ', logo: '/logos/nfl/new-york-jets.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-lions', name: 'Detroit Lions', shortName: 'DET', logo: '/logos/nfl/detroit-lions.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-packers', name: 'Green Bay Packers', shortName: 'GB', logo: '/logos/nfl/green-bay-packers.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-panthers', name: 'Carolina Panthers', shortName: 'CAR', logo: '/logos/nfl/carolina-panthers.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-patriots', name: 'New England Patriots', shortName: 'NE', logo: '/logos/nfl/new-england-patriots.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-raiders', name: 'Las Vegas Raiders', shortName: 'LV', logo: '/logos/nfl/las-vegas-raiders.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-rams', name: 'Los Angeles Rams', shortName: 'LAR', logo: '/logos/nfl/los-angeles-rams.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-ravens', name: 'Baltimore Ravens', shortName: 'BAL', logo: '/logos/nfl/baltimore-ravens.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-saints', name: 'New Orleans Saints', shortName: 'NO', logo: '/logos/nfl/new-orleans-saints.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-seahawks', name: 'Seattle Seahawks', shortName: 'SEA', logo: '/logos/nfl/seattle-seahawks.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-steelers', name: 'Pittsburgh Steelers', shortName: 'PIT', logo: '/logos/nfl/pittsburgh-steelers.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-texans', name: 'Houston Texans', shortName: 'HOU', logo: '/logos/nfl/houston-texans.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-titans', name: 'Tennessee Titans', shortName: 'TEN', logo: '/logos/nfl/tennessee-titans.svg', record: '', leagueId: 'nfl' },
  { id: 'nfl-vikings', name: 'Minnesota Vikings', shortName: 'MIN', logo: '/logos/nfl/minnesota-vikings.svg', record: '', leagueId: 'nfl' },
  ];
  for (const team of nflTeamsData) {
    try {
      await prisma.team.create({ data: team });
    } catch (e) {
      console.error('Error creating NFL team:', team, e);
    }
  }
  const nflTeamCount = await prisma.team.count({ where: { leagueId: 'nfl' } });
  console.log(`Inserted ${nflTeamCount} NFL teams`);

  // Create NHL Teams
  console.log('Creating NHL teams...');
  const nhlTeamsData = [
  { id: 'nhl-ducks', name: 'Anaheim Ducks', shortName: 'ANA', logo: '/logos/nhl/anaheim-ducks.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-coyotes', name: 'Arizona Coyotes', shortName: 'ARI', logo: '/logos/nhl/arizona-coyotes.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-bruins', name: 'Boston Bruins', shortName: 'BOS', logo: '/logos/nhl/boston-bruins.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-sabres', name: 'Buffalo Sabres', shortName: 'BUF', logo: '/logos/nhl/buffalo-sabres.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-flames', name: 'Calgary Flames', shortName: 'CGY', logo: '/logos/nhl/calgary-flames.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-hurricanes', name: 'Carolina Hurricanes', shortName: 'CAR', logo: '/logos/nhl/carolina-hurricanes.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-blackhawks', name: 'Chicago Blackhawks', shortName: 'CHI', logo: '/logos/nhl/chicago-blackhawks.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-avalanche', name: 'Colorado Avalanche', shortName: 'COL', logo: '/logos/nhl/colorado-avalanche.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-blue-jackets', name: 'Columbus Blue Jackets', shortName: 'CBJ', logo: '/logos/nhl/columbus-blue-jackets.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-stars', name: 'Dallas Stars', shortName: 'DAL', logo: '/logos/nhl/dallas-stars.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-red-wings', name: 'Detroit Red Wings', shortName: 'DET', logo: '/logos/nhl/detroit-red-wings.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-oilers', name: 'Edmonton Oilers', shortName: 'EDM', logo: '/logos/nhl/edmonton-oilers.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-panthers', name: 'Florida Panthers', shortName: 'FLA', logo: '/logos/nhl/florida-panthers.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-kings', name: 'Los Angeles Kings', shortName: 'LAK', logo: '/logos/nhl/los-angeles-kings.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-wild', name: 'Minnesota Wild', shortName: 'MIN', logo: '/logos/nhl/minnesota-wild.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-canadiens', name: 'Montreal Canadiens', shortName: 'MTL', logo: '/logos/nhl/montreal-canadiens.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-predators', name: 'Nashville Predators', shortName: 'NSH', logo: '/logos/nhl/nashville-predators.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-devils', name: 'New Jersey Devils', shortName: 'NJD', logo: '/logos/nhl/new-jersey-devils.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-islanders', name: 'New York Islanders', shortName: 'NYI', logo: '/logos/nhl/new-york-islanders.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-rangers', name: 'New York Rangers', shortName: 'NYR', logo: '/logos/nhl/new-york-rangers.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-senators', name: 'Ottawa Senators', shortName: 'OTT', logo: '/logos/nhl/ottawa-senators.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-flyers', name: 'Philadelphia Flyers', shortName: 'PHI', logo: '/logos/nhl/philadelphia-flyers.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-penguins', name: 'Pittsburgh Penguins', shortName: 'PIT', logo: '/logos/nhl/pittsburgh-penguins.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-sharks', name: 'San Jose Sharks', shortName: 'SJS', logo: '/logos/nhl/san-jose-sharks.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-kraken', name: 'Seattle Kraken', shortName: 'SEA', logo: '/logos/nhl/seattle-kraken.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-blues', name: 'St. Louis Blues', shortName: 'STL', logo: '/logos/nhl/st-louis-blues.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-lightning', name: 'Tampa Bay Lightning', shortName: 'TB', logo: '/logos/nhl/tampa-bay-lightning.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-maple-leafs', name: 'Toronto Maple Leafs', shortName: 'TOR', logo: '/logos/nhl/toronto-maple-leafs.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-canucks', name: 'Vancouver Canucks', shortName: 'VAN', logo: '/logos/nhl/vancouver-canucks.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-golden-knights', name: 'Vegas Golden Knights', shortName: 'VGK', logo: '/logos/nhl/vegas-golden-knights.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-capitals', name: 'Washington Capitals', shortName: 'WSH', logo: '/logos/nhl/washington-capitals.svg', record: '', leagueId: 'nhl' },
  { id: 'nhl-jets', name: 'Winnipeg Jets', shortName: 'WPG', logo: '/logos/nhl/winnipeg-jets.svg', record: '', leagueId: 'nhl' },
  ];
  for (const team of nhlTeamsData) {
    try {
      await prisma.team.create({ data: team });
    } catch (e) {
      console.error('Error creating NHL team:', team, e);
    }
  }
  const nhlTeamCount = await prisma.team.count({ where: { leagueId: 'nhl' } });
  console.log(`Inserted ${nhlTeamCount} NHL teams`);

  const now = new Date();

  // Create NBA Games
  console.log('Creating NBA games...');
  const nbaGames = [
    {
      id: '1',
      leagueId: 'nba',
  homeTeamId: 'nba-lakers',
  awayTeamId: 'nba-warriors',
      startTime: new Date(now.getTime() + 3600000),
      status: 'upcoming',
      odds: [
        { betType: 'spread', selection: 'away', odds: -110, line: 2.5 },
        { betType: 'spread', selection: 'home', odds: -110, line: -2.5 },
        { betType: 'moneyline', selection: 'away', odds: 130 },
        { betType: 'moneyline', selection: 'home', odds: -150 },
        { betType: 'total', selection: 'over', odds: -110, line: 225.5 },
        { betType: 'total', selection: 'under', odds: -110, line: 225.5 },
      ],
    },
    {
      id: '2',
      leagueId: 'nba',
  homeTeamId: 'nba-celtics',
  awayTeamId: 'nba-heat',
      startTime: new Date(now.getTime() + 5400000),
      status: 'upcoming',
      odds: [
        { betType: 'spread', selection: 'away', odds: -110, line: 5.5 },
        { betType: 'spread', selection: 'home', odds: -110, line: -5.5 },
        { betType: 'moneyline', selection: 'away', odds: 190 },
        { betType: 'moneyline', selection: 'home', odds: -225 },
        { betType: 'total', selection: 'over', odds: -110, line: 218.5 },
        { betType: 'total', selection: 'under', odds: -110, line: 218.5 },
      ],
    },
    {
      id: '3',
      leagueId: 'nba',
  homeTeamId: 'nba-nets',
  awayTeamId: 'nba-76ers',
      startTime: new Date(now.getTime() + 7200000),
      status: 'live',
      odds: [
        { betType: 'spread', selection: 'away', odds: -110, line: -3.5 },
        { betType: 'spread', selection: 'home', odds: -110, line: 3.5 },
        { betType: 'moneyline', selection: 'away', odds: -155 },
        { betType: 'moneyline', selection: 'home', odds: 135 },
        { betType: 'total', selection: 'over', odds: -110, line: 220.5 },
        { betType: 'total', selection: 'under', odds: -110, line: 220.5 },
      ],
    },
    {
      id: '4',
      leagueId: 'nba',
  homeTeamId: 'nba-bucks',
  awayTeamId: 'nba-bulls',
      startTime: new Date(now.getTime() + 9000000),
      status: 'live',
      odds: [
        { betType: 'spread', selection: 'away', odds: -110, line: 7.5 },
        { betType: 'spread', selection: 'home', odds: -110, line: -7.5 },
        { betType: 'moneyline', selection: 'away', odds: 270 },
        { betType: 'moneyline', selection: 'home', odds: -330 },
        { betType: 'total', selection: 'over', odds: -110, line: 228.5 },
        { betType: 'total', selection: 'under', odds: -110, line: 228.5 },
      ],
    },
    {
      id: '5',
      leagueId: 'nba',
  homeTeamId: 'nba-mavericks',
  awayTeamId: 'nba-suns',
      startTime: new Date(now.getTime() + 10800000),
      status: 'live',
      odds: [
        { betType: 'spread', selection: 'away', odds: -110, line: 1.5 },
        { betType: 'spread', selection: 'home', odds: -110, line: -1.5 },
        { betType: 'moneyline', selection: 'away', odds: 105 },
        { betType: 'moneyline', selection: 'home', odds: -125 },
        { betType: 'total', selection: 'over', odds: -110, line: 232.5 },
        { betType: 'total', selection: 'under', odds: -110, line: 232.5 },
      ],
    },
  ];
  for (const game of nbaGames) {
    try {
      await prisma.game.create({
        data: {
          id: game.id,
          leagueId: game.leagueId,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          startTime: game.startTime,
          status: game.status,
        },
      });
      await prisma.odds.createMany({
        data: game.odds.map(o => ({ ...o, gameId: game.id })),
      });
    } catch (e) {
      console.error('Error creating NBA game:', game, e);
    }
  }
  const nbaGameCount = await prisma.game.count({ where: { leagueId: 'nba' } });
  console.log(`Inserted ${nbaGameCount} NBA games`);

  // Create NFL Games
  console.log('Creating NFL games...');
  const nflGames = [
    {
      id: 'nfl-1',
      leagueId: 'nfl',
  homeTeamId: 'nfl-chiefs',
  awayTeamId: 'nfl-bills',
      startTime: new Date(now.getTime() + 14400000),
      status: 'live',
      odds: [
        { betType: 'spread', selection: 'away', odds: -110, line: 2.5 },
        { betType: 'spread', selection: 'home', odds: -110, line: -2.5 },
        { betType: 'moneyline', selection: 'away', odds: 125 },
        { betType: 'moneyline', selection: 'home', odds: -145 },
        { betType: 'total', selection: 'over', odds: -110, line: 48.5 },
        { betType: 'total', selection: 'under', odds: -110, line: 48.5 },
      ],
    },
    {
      id: 'nfl-2',
      leagueId: 'nfl',
  homeTeamId: 'nfl-eagles',
  awayTeamId: 'nfl-49ers',
      startTime: new Date(now.getTime() + 18000000),
      status: 'upcoming',
      odds: [
        { betType: 'spread', selection: 'away', odds: -110, line: 3.5 },
        { betType: 'spread', selection: 'home', odds: -110, line: -3.5 },
        { betType: 'moneyline', selection: 'away', odds: 155 },
        { betType: 'moneyline', selection: 'home', odds: -180 },
        { betType: 'total', selection: 'over', odds: -110, line: 45.5 },
        { betType: 'total', selection: 'under', odds: -110, line: 45.5 },
      ],
    },
    {
      id: 'nfl-3',
      leagueId: 'nfl',
  homeTeamId: 'nfl-cowboys',
  awayTeamId: 'nfl-lions',
      startTime: new Date(now.getTime() + 21600000),
      status: 'upcoming',
      odds: [
        { betType: 'spread', selection: 'away', odds: -110, line: -1.5 },
        { betType: 'spread', selection: 'home', odds: -110, line: 1.5 },
        { betType: 'moneyline', selection: 'away', odds: -115 },
        { betType: 'moneyline', selection: 'home', odds: -105 },
        { betType: 'total', selection: 'over', odds: -110, line: 52.5 },
        { betType: 'total', selection: 'under', odds: -110, line: 52.5 },
      ],
    },
  ];
  for (const game of nflGames) {
    try {
      await prisma.game.create({
        data: {
          id: game.id,
          leagueId: game.leagueId,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          startTime: game.startTime,
          status: game.status,
        },
      });
      await prisma.odds.createMany({
        data: game.odds.map(o => ({ ...o, gameId: game.id })),
      });
    } catch (e) {
      console.error('Error creating NFL game:', game, e);
    }
  }
  const nflGameCount = await prisma.game.count({ where: { leagueId: 'nfl' } });
  console.log(`Inserted ${nflGameCount} NFL games`);

  // Create NHL Games
  console.log('Creating NHL games...');
  const nhlGames = [
    {
      id: 'nhl-1',
      leagueId: 'nhl',
  homeTeamId: 'nhl-avalanche',
  awayTeamId: 'nhl-oilers',
      startTime: new Date(now.getTime() + 7200000),
      status: 'live',
      odds: [
        { betType: 'spread', selection: 'away', odds: 180, line: -1.5 },
        { betType: 'spread', selection: 'home', odds: -220, line: 1.5 },
        { betType: 'moneyline', selection: 'away', odds: -135 },
        { betType: 'moneyline', selection: 'home', odds: 115 },
        { betType: 'total', selection: 'over', odds: -110, line: 6.5 },
        { betType: 'total', selection: 'under', odds: -110, line: 6.5 },
      ],
    },
    {
      id: 'nhl-2',
      leagueId: 'nhl',
  homeTeamId: 'nhl-rangers',
  awayTeamId: 'nhl-bruins',
      startTime: new Date(now.getTime() + 10800000),
      status: 'live',
      odds: [
        { betType: 'spread', selection: 'away', odds: 190, line: -1.5 },
        { betType: 'spread', selection: 'home', odds: -230, line: 1.5 },
        { betType: 'moneyline', selection: 'away', odds: -145 },
        { betType: 'moneyline', selection: 'home', odds: 125 },
        { betType: 'total', selection: 'over', odds: -110, line: 5.5 },
        { betType: 'total', selection: 'under', odds: -110, line: 5.5 },
      ],
    },
    {
      id: 'nhl-3',
      leagueId: 'nhl',
  homeTeamId: 'nhl-maple-leafs',
  awayTeamId: 'nhl-lightning',
      startTime: new Date(now.getTime() + 14400000),
      status: 'upcoming',
      odds: [
        { betType: 'spread', selection: 'away', odds: -210, line: 1.5 },
        { betType: 'spread', selection: 'home', odds: 170, line: -1.5 },
        { betType: 'moneyline', selection: 'away', odds: 130 },
        { betType: 'moneyline', selection: 'home', odds: -150 },
        { betType: 'total', selection: 'over', odds: -110, line: 6.5 },
        { betType: 'total', selection: 'under', odds: -110, line: 6.5 },
      ],
    },
  ];
  for (const game of nhlGames) {
    try {
      await prisma.game.create({
        data: {
          id: game.id,
          leagueId: game.leagueId,
          homeTeamId: game.homeTeamId,
          awayTeamId: game.awayTeamId,
          startTime: game.startTime,
          status: game.status,
        },
      });
      await prisma.odds.createMany({
        data: game.odds.map(o => ({ ...o, gameId: game.id })),
      });
    } catch (e) {
      console.error('Error creating NHL game:', game, e);
    }
  }
  const nhlGameCount = await prisma.game.count({ where: { leagueId: 'nhl' } });
  console.log(`Inserted ${nhlGameCount} NHL games`);

  // Seed account for demo user
  console.log('Seeding account for demo-user...');
  try {
    await prisma.account.upsert({
      where: { userId: 'demo-user' },
      update: { balance: 2500.0 },
      create: { userId: 'demo-user', balance: 2500.0 },
    });
  } catch (e) {
    console.error('Error seeding account:', e);
  }

  // Seed mock bet history
  console.log('Seeding mock bet history...');
  const demoBets = [
    {
      userId: 'demo-user',
      gameId: '1', // Lakers vs Warriors
      betType: 'moneyline',
      selection: 'home',
      odds: -150,
      line: null,
      stake: 100,
      potentialPayout: 166.67,
      status: 'won',
      placedAt: new Date(Date.now() - 86400000),
      settledAt: new Date(Date.now() - 43200000),
    },
    {
      userId: 'demo-user',
      gameId: '2', // Celtics vs Heat
      betType: 'spread',
      selection: 'away',
      odds: 120,
      line: 5.5,
      stake: 50,
      potentialPayout: 110,
      status: 'lost',
      placedAt: new Date(Date.now() - 172800000),
      settledAt: new Date(Date.now() - 86400000),
    },
    {
      userId: 'demo-user',
      gameId: '3', // Nets vs 76ers
      betType: 'total',
      selection: 'over',
      odds: -110,
      line: 220.5,
      stake: 75,
      potentialPayout: 145.45,
      status: 'pending',
      placedAt: new Date(Date.now() - 3600000),
      settledAt: null,
    },
  ];
  for (const bet of demoBets) {
    try {
      await prisma.bet.create({ data: bet });
    } catch (e) {
      console.error('Error creating demo bet:', bet, e);
    }
  }
  console.log('Inserted demo bet history for demo-user');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
