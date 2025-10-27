import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.bet.deleteMany();
  await prisma.gameProp.deleteMany();
  await prisma.playerProp.deleteMany();
  await prisma.player.deleteMany();
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
  // IMPORTANT: IDs match SportsGameOdds SDK league IDs (NBA, NFL, NHL - uppercase)
  console.log('Creating leagues...');
  const leaguesData = [
    { id: 'NBA', name: 'NBA', sportId: 'basketball', logo: '/logos/nba/NBA.svg' },
    { id: 'NFL', name: 'NFL', sportId: 'football', logo: '/logos/nfl/NFL.svg' },
    { id: 'NHL', name: 'NHL', sportId: 'hockey', logo: '/logos/nhl/NHL.svg' },
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
  { id: 'nba-hawks', name: 'Atlanta Hawks', shortName: 'ATL', logo: '/logos/nba/atlanta-hawks.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-celtics', name: 'Boston Celtics', shortName: 'BOS', logo: '/logos/nba/boston-celtics.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-nets', name: 'Brooklyn Nets', shortName: 'BKN', logo: '/logos/nba/brooklyn-nets.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-hornets', name: 'Charlotte Hornets', shortName: 'CHA', logo: '/logos/nba/charlotte-hornets.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-bulls', name: 'Chicago Bulls', shortName: 'CHI', logo: '/logos/nba/chicago-bulls.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-cavaliers', name: 'Cleveland Cavaliers', shortName: 'CLE', logo: '/logos/nba/cleveland-cavaliers.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-mavericks', name: 'Dallas Mavericks', shortName: 'DAL', logo: '/logos/nba/dallas-mavericks.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-nuggets', name: 'Denver Nuggets', shortName: 'DEN', logo: '/logos/nba/denver-nuggets.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-pistons', name: 'Detroit Pistons', shortName: 'DET', logo: '/logos/nba/detroit-pistons.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-warriors', name: 'Golden State Warriors', shortName: 'GSW', logo: '/logos/nba/golden-state-warriors.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-rockets', name: 'Houston Rockets', shortName: 'HOU', logo: '/logos/nba/houston-rockets.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-pacers', name: 'Indiana Pacers', shortName: 'IND', logo: '/logos/nba/indiana-pacers.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-clippers', name: 'Los Angeles Clippers', shortName: 'LAC', logo: '/logos/nba/los-angeles-clippers.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-lakers', name: 'Los Angeles Lakers', shortName: 'LAL', logo: '/logos/nba/los-angeles-lakers.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-grizzlies', name: 'Memphis Grizzlies', shortName: 'MEM', logo: '/logos/nba/memphis-grizzlies.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-heat', name: 'Miami Heat', shortName: 'MIA', logo: '/logos/nba/miami-heat.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-bucks', name: 'Milwaukee Bucks', shortName: 'MIL', logo: '/logos/nba/milwaukee-bucks.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-timberwolves', name: 'Minnesota Timberwolves', shortName: 'MIN', logo: '/logos/nba/minnesota-timberwolves.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-pelicans', name: 'New Orleans Pelicans', shortName: 'NOP', logo: '/logos/nba/new-orleans-pelicans.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-knicks', name: 'New York Knicks', shortName: 'NYK', logo: '/logos/nba/new-york-knicks.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-thunder', name: 'Oklahoma City Thunder', shortName: 'OKC', logo: '/logos/nba/oklahoma-city-thunder.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-magic', name: 'Orlando Magic', shortName: 'ORL', logo: '/logos/nba/orlando-magic.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-76ers', name: 'Philadelphia 76ers', shortName: 'PHI', logo: '/logos/nba/philadelphia-76ers.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-suns', name: 'Phoenix Suns', shortName: 'PHX', logo: '/logos/nba/phoenix-suns.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-blazers', name: 'Portland Trail Blazers', shortName: 'POR', logo: '/logos/nba/portland-trail-blazers.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-kings', name: 'Sacramento Kings', shortName: 'SAC', logo: '/logos/nba/sacramento-kings.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-spurs', name: 'San Antonio Spurs', shortName: 'SAS', logo: '/logos/nba/san-antonio-spurs.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-raptors', name: 'Toronto Raptors', shortName: 'TOR', logo: '/logos/nba/toronto-raptors.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-jazz', name: 'Utah Jazz', shortName: 'UTA', logo: '/logos/nba/utah-jazz.svg', record: '', leagueId: 'NBA' },
  { id: 'nba-wizards', name: 'Washington Wizards', shortName: 'WAS', logo: '/logos/nba/washington-wizards.svg', record: '', leagueId: 'NBA' },
  ];
  for (const team of nbaTeamsData) {
    try {
      await prisma.team.create({ data: team });
    } catch (e) {
      console.error('Error creating NBA team:', team, e);
    }
  }
  const nbaTeamCount = await prisma.team.count({ where: { leagueId: 'NBA' } });
  console.log(`Inserted ${nbaTeamCount} NBA teams`);

  // Create NFL Teams
  console.log('Creating NFL teams...');
  const nflTeamsData = [
  { id: 'nfl-49ers', name: 'San Francisco 49ers', shortName: 'SF', logo: '/logos/nfl/san-francisco-49ers.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-bears', name: 'Chicago Bears', shortName: 'CHI', logo: '/logos/nfl/chicago-bears.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-bengals', name: 'Cincinnati Bengals', shortName: 'CIN', logo: '/logos/nfl/cincinnati-bengals.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-bills', name: 'Buffalo Bills', shortName: 'BUF', logo: '/logos/nfl/buffalo-bills.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-broncos', name: 'Denver Broncos', shortName: 'DEN', logo: '/logos/nfl/denver-broncos.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-browns', name: 'Cleveland Browns', shortName: 'CLE', logo: '/logos/nfl/cleveland-browns.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-buccaneers', name: 'Tampa Bay Buccaneers', shortName: 'TB', logo: '/logos/nfl/tampa-bay-buccaneers.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-cardinals', name: 'Arizona Cardinals', shortName: 'ARI', logo: '/logos/nfl/arizona-cardinals.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-chargers', name: 'Los Angeles Chargers', shortName: 'LAC', logo: '/logos/nfl/los-angeles-chargers.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-chiefs', name: 'Kansas City Chiefs', shortName: 'KC', logo: '/logos/nfl/kansas-city-chiefs.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-colts', name: 'Indianapolis Colts', shortName: 'IND', logo: '/logos/nfl/indianapolis-colts.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-commanders', name: 'Washington Commanders', shortName: 'WAS', logo: '/logos/nfl/washington-commanders.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-cowboys', name: 'Dallas Cowboys', shortName: 'DAL', logo: '/logos/nfl/dallas-cowboys.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-dolphins', name: 'Miami Dolphins', shortName: 'MIA', logo: '/logos/nfl/miami-dolphins.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-eagles', name: 'Philadelphia Eagles', shortName: 'PHI', logo: '/logos/nfl/philadelphia-eagles.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-falcons', name: 'Atlanta Falcons', shortName: 'ATL', logo: '/logos/nfl/atlanta-falcons.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-giants', name: 'New York Giants', shortName: 'NYG', logo: '/logos/nfl/new-york-giants.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-jaguars', name: 'Jacksonville Jaguars', shortName: 'JAX', logo: '/logos/nfl/jacksonville-jaguars.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-jets', name: 'New York Jets', shortName: 'NYJ', logo: '/logos/nfl/new-york-jets.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-lions', name: 'Detroit Lions', shortName: 'DET', logo: '/logos/nfl/detroit-lions.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-packers', name: 'Green Bay Packers', shortName: 'GB', logo: '/logos/nfl/green-bay-packers.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-panthers', name: 'Carolina Panthers', shortName: 'CAR', logo: '/logos/nfl/carolina-panthers.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-patriots', name: 'New England Patriots', shortName: 'NE', logo: '/logos/nfl/new-england-patriots.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-raiders', name: 'Las Vegas Raiders', shortName: 'LV', logo: '/logos/nfl/las-vegas-raiders.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-rams', name: 'Los Angeles Rams', shortName: 'LAR', logo: '/logos/nfl/los-angeles-rams.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-ravens', name: 'Baltimore Ravens', shortName: 'BAL', logo: '/logos/nfl/baltimore-ravens.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-saints', name: 'New Orleans Saints', shortName: 'NO', logo: '/logos/nfl/new-orleans-saints.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-seahawks', name: 'Seattle Seahawks', shortName: 'SEA', logo: '/logos/nfl/seattle-seahawks.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-steelers', name: 'Pittsburgh Steelers', shortName: 'PIT', logo: '/logos/nfl/pittsburgh-steelers.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-texans', name: 'Houston Texans', shortName: 'HOU', logo: '/logos/nfl/houston-texans.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-titans', name: 'Tennessee Titans', shortName: 'TEN', logo: '/logos/nfl/tennessee-titans.svg', record: '', leagueId: 'NFL' },
  { id: 'nfl-vikings', name: 'Minnesota Vikings', shortName: 'MIN', logo: '/logos/nfl/minnesota-vikings.svg', record: '', leagueId: 'NFL' },
  ];
  for (const team of nflTeamsData) {
    try {
      await prisma.team.create({ data: team });
    } catch (e) {
      console.error('Error creating NFL team:', team, e);
    }
  }
  const nflTeamCount = await prisma.team.count({ where: { leagueId: 'NFL' } });
  console.log(`Inserted ${nflTeamCount} NFL teams`);

  // Create NHL Teams
  console.log('Creating NHL teams...');
  const nhlTeamsData = [
  { id: 'nhl-ducks', name: 'Anaheim Ducks', shortName: 'ANA', logo: '/logos/nhl/anaheim-ducks.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-coyotes', name: 'Arizona Coyotes', shortName: 'ARI', logo: '/logos/nhl/arizona-coyotes.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-bruins', name: 'Boston Bruins', shortName: 'BOS', logo: '/logos/nhl/boston-bruins.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-sabres', name: 'Buffalo Sabres', shortName: 'BUF', logo: '/logos/nhl/buffalo-sabres.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-flames', name: 'Calgary Flames', shortName: 'CGY', logo: '/logos/nhl/calgary-flames.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-hurricanes', name: 'Carolina Hurricanes', shortName: 'CAR', logo: '/logos/nhl/carolina-hurricanes.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-blackhawks', name: 'Chicago Blackhawks', shortName: 'CHI', logo: '/logos/nhl/chicago-blackhawks.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-avalanche', name: 'Colorado Avalanche', shortName: 'COL', logo: '/logos/nhl/colorado-avalanche.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-blue-jackets', name: 'Columbus Blue Jackets', shortName: 'CBJ', logo: '/logos/nhl/columbus-blue-jackets.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-stars', name: 'Dallas Stars', shortName: 'DAL', logo: '/logos/nhl/dallas-stars.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-red-wings', name: 'Detroit Red Wings', shortName: 'DET', logo: '/logos/nhl/detroit-red-wings.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-oilers', name: 'Edmonton Oilers', shortName: 'EDM', logo: '/logos/nhl/edmonton-oilers.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-panthers', name: 'Florida Panthers', shortName: 'FLA', logo: '/logos/nhl/florida-panthers.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-kings', name: 'Los Angeles Kings', shortName: 'LAK', logo: '/logos/nhl/los-angeles-kings.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-wild', name: 'Minnesota Wild', shortName: 'MIN', logo: '/logos/nhl/minnesota-wild.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-canadiens', name: 'Montreal Canadiens', shortName: 'MTL', logo: '/logos/nhl/montreal-canadiens.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-predators', name: 'Nashville Predators', shortName: 'NSH', logo: '/logos/nhl/nashville-predators.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-devils', name: 'New Jersey Devils', shortName: 'NJD', logo: '/logos/nhl/new-jersey-devils.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-islanders', name: 'New York Islanders', shortName: 'NYI', logo: '/logos/nhl/new-york-islanders.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-rangers', name: 'New York Rangers', shortName: 'NYR', logo: '/logos/nhl/new-york-rangers.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-senators', name: 'Ottawa Senators', shortName: 'OTT', logo: '/logos/nhl/ottawa-senators.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-flyers', name: 'Philadelphia Flyers', shortName: 'PHI', logo: '/logos/nhl/philadelphia-flyers.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-penguins', name: 'Pittsburgh Penguins', shortName: 'PIT', logo: '/logos/nhl/pittsburgh-penguins.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-sharks', name: 'San Jose Sharks', shortName: 'SJS', logo: '/logos/nhl/san-jose-sharks.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-kraken', name: 'Seattle Kraken', shortName: 'SEA', logo: '/logos/nhl/seattle-kraken.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-blues', name: 'St. Louis Blues', shortName: 'STL', logo: '/logos/nhl/st-louis-blues.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-lightning', name: 'Tampa Bay Lightning', shortName: 'TB', logo: '/logos/nhl/tampa-bay-lightning.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-maple-leafs', name: 'Toronto Maple Leafs', shortName: 'TOR', logo: '/logos/nhl/toronto-maple-leafs.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-canucks', name: 'Vancouver Canucks', shortName: 'VAN', logo: '/logos/nhl/vancouver-canucks.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-golden-knights', name: 'Vegas Golden Knights', shortName: 'VGK', logo: '/logos/nhl/vegas-golden-knights.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-capitals', name: 'Washington Capitals', shortName: 'WSH', logo: '/logos/nhl/washington-capitals.svg', record: '', leagueId: 'NHL' },
  { id: 'nhl-jets', name: 'Winnipeg Jets', shortName: 'WPG', logo: '/logos/nhl/winnipeg-jets.svg', record: '', leagueId: 'NHL' },
  ];
  for (const team of nhlTeamsData) {
    try {
      await prisma.team.create({ data: team });
    } catch (e) {
      console.error('Error creating NHL team:', team, e);
    }
  }
  const nhlTeamCount = await prisma.team.count({ where: { leagueId: 'NHL' } });
  console.log(`Inserted ${nhlTeamCount} NHL teams`);

  const now = new Date();

  // Create NBA Games
  console.log('Creating NBA games...');
  const nbaGames = [
    {
      id: '1',
      leagueId: 'NBA',
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
      leagueId: 'NBA',
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
      leagueId: 'NBA',
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
      leagueId: 'NBA',
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
      leagueId: 'NBA',
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
  const nbaGameCount = await prisma.game.count({ where: { leagueId: 'NBA' } });
  console.log(`Inserted ${nbaGameCount} NBA games`);

  // Create NFL Games
  console.log('Creating NFL games...');
  const nflGames = [
    {
      id: 'nfl-1',
      leagueId: 'NFL',
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
      leagueId: 'NFL',
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
      leagueId: 'NFL',
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
  const nflGameCount = await prisma.game.count({ where: { leagueId: 'NFL' } });
  console.log(`Inserted ${nflGameCount} NFL games`);

  // Create NHL Games
  console.log('Creating NHL games...');
  const nhlGames = [
    {
      id: 'nhl-1',
      leagueId: 'NHL',
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
      leagueId: 'NHL',
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
      leagueId: 'NHL',
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
  const nhlGameCount = await prisma.game.count({ where: { leagueId: 'NHL' } });
  console.log(`Inserted ${nhlGameCount} NHL games`);

  // Create NBA Players
  console.log('Creating NBA players...');
  const nbaPlayers = [
    // Lakers players
    { id: 'player-lebron', name: 'LeBron James', teamId: 'nba-lakers', position: 'F', jerseyNumber: '23' },
    { id: 'player-ad', name: 'Anthony Davis', teamId: 'nba-lakers', position: 'F-C', jerseyNumber: '3' },
    { id: 'player-reaves', name: 'Austin Reaves', teamId: 'nba-lakers', position: 'G', jerseyNumber: '15' },
    // Warriors players
    { id: 'player-curry', name: 'Stephen Curry', teamId: 'nba-warriors', position: 'G', jerseyNumber: '30' },
    { id: 'player-wiggins', name: 'Andrew Wiggins', teamId: 'nba-warriors', position: 'F', jerseyNumber: '22' },
    { id: 'player-green', name: 'Draymond Green', teamId: 'nba-warriors', position: 'F', jerseyNumber: '23' },
    // Celtics players
    { id: 'player-tatum', name: 'Jayson Tatum', teamId: 'nba-celtics', position: 'F', jerseyNumber: '0' },
    { id: 'player-brown', name: 'Jaylen Brown', teamId: 'nba-celtics', position: 'G-F', jerseyNumber: '7' },
    { id: 'player-white', name: 'Derrick White', teamId: 'nba-celtics', position: 'G', jerseyNumber: '9' },
    // Heat players
    { id: 'player-butler', name: 'Jimmy Butler', teamId: 'nba-heat', position: 'F', jerseyNumber: '22' },
    { id: 'player-bam', name: 'Bam Adebayo', teamId: 'nba-heat', position: 'C', jerseyNumber: '13' },
    { id: 'player-herro', name: 'Tyler Herro', teamId: 'nba-heat', position: 'G', jerseyNumber: '14' },
    // 76ers players
    { id: 'player-embiid', name: 'Joel Embiid', teamId: 'nba-76ers', position: 'C', jerseyNumber: '21' },
    { id: 'player-maxey', name: 'Tyrese Maxey', teamId: 'nba-76ers', position: 'G', jerseyNumber: '0' },
    { id: 'player-harris', name: 'Tobias Harris', teamId: 'nba-76ers', position: 'F', jerseyNumber: '12' },
    // Nets players
    { id: 'player-bridges', name: 'Mikal Bridges', teamId: 'nba-nets', position: 'F', jerseyNumber: '1' },
    { id: 'player-cam-johnson', name: 'Cameron Johnson', teamId: 'nba-nets', position: 'F', jerseyNumber: '2' },
    { id: 'player-claxton', name: 'Nic Claxton', teamId: 'nba-nets', position: 'C', jerseyNumber: '33' },
  ];
  
  for (const player of nbaPlayers) {
    try {
      await prisma.player.create({ data: player });
    } catch (e) {
      console.error('Error creating NBA player:', player, e);
    }
  }
  console.log(`Inserted ${nbaPlayers.length} NBA players`);

  // Create Player Props for NBA Game 1 (Lakers vs Warriors)
  console.log('Creating player props for NBA games...');
  const playerPropsGame1 = [
    // LeBron James
    { gameId: '1', playerId: 'player-lebron', statType: 'Points', line: 27.5, overOdds: -115, underOdds: -105, category: 'scoring' },
    { gameId: '1', playerId: 'player-lebron', statType: 'Rebounds', line: 8.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    { gameId: '1', playerId: 'player-lebron', statType: 'Assists', line: 6.5, overOdds: -120, underOdds: 100, category: 'scoring' },
    { gameId: '1', playerId: 'player-lebron', statType: 'Points + Rebounds + Assists', line: 42.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    // Anthony Davis
    { gameId: '1', playerId: 'player-ad', statType: 'Points', line: 24.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    { gameId: '1', playerId: 'player-ad', statType: 'Rebounds', line: 11.5, overOdds: -105, underOdds: -115, category: 'scoring' },
    { gameId: '1', playerId: 'player-ad', statType: 'Blocks', line: 1.5, overOdds: -140, underOdds: 120, category: 'defense' },
    // Stephen Curry
    { gameId: '1', playerId: 'player-curry', statType: 'Points', line: 29.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    { gameId: '1', playerId: 'player-curry', statType: 'Three-Pointers Made', line: 4.5, overOdds: -125, underOdds: 105, category: 'scoring' },
    { gameId: '1', playerId: 'player-curry', statType: 'Assists', line: 5.5, overOdds: -105, underOdds: -115, category: 'scoring' },
    // Andrew Wiggins
    { gameId: '1', playerId: 'player-wiggins', statType: 'Points', line: 17.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    { gameId: '1', playerId: 'player-wiggins', statType: 'Rebounds', line: 4.5, overOdds: -110, underOdds: -110, category: 'scoring' },
  ];

  const playerPropsGame2 = [
    // Jayson Tatum
    { gameId: '2', playerId: 'player-tatum', statType: 'Points', line: 28.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    { gameId: '2', playerId: 'player-tatum', statType: 'Rebounds', line: 8.5, overOdds: -115, underOdds: -105, category: 'scoring' },
    { gameId: '2', playerId: 'player-tatum', statType: 'Assists', line: 4.5, overOdds: -105, underOdds: -115, category: 'scoring' },
    // Jaylen Brown
    { gameId: '2', playerId: 'player-brown', statType: 'Points', line: 23.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    { gameId: '2', playerId: 'player-brown', statType: 'Rebounds', line: 5.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    // Jimmy Butler
    { gameId: '2', playerId: 'player-butler', statType: 'Points', line: 21.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    { gameId: '2', playerId: 'player-butler', statType: 'Rebounds', line: 6.5, overOdds: -105, underOdds: -115, category: 'scoring' },
    { gameId: '2', playerId: 'player-butler', statType: 'Assists', line: 5.5, overOdds: -120, underOdds: 100, category: 'scoring' },
    // Bam Adebayo
    { gameId: '2', playerId: 'player-bam', statType: 'Points', line: 18.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    { gameId: '2', playerId: 'player-bam', statType: 'Rebounds', line: 10.5, overOdds: -110, underOdds: -110, category: 'scoring' },
  ];

  const playerPropsGame3 = [
    // Joel Embiid
    { gameId: '3', playerId: 'player-embiid', statType: 'Points', line: 32.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    { gameId: '3', playerId: 'player-embiid', statType: 'Rebounds', line: 10.5, overOdds: -105, underOdds: -115, category: 'scoring' },
    { gameId: '3', playerId: 'player-embiid', statType: 'Assists', line: 4.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    // Tyrese Maxey
    { gameId: '3', playerId: 'player-maxey', statType: 'Points', line: 26.5, overOdds: -115, underOdds: -105, category: 'scoring' },
    { gameId: '3', playerId: 'player-maxey', statType: 'Assists', line: 6.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    // Mikal Bridges
    { gameId: '3', playerId: 'player-bridges', statType: 'Points', line: 20.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    { gameId: '3', playerId: 'player-bridges', statType: 'Rebounds', line: 4.5, overOdds: -110, underOdds: -110, category: 'scoring' },
    { gameId: '3', playerId: 'player-bridges', statType: 'Steals', line: 1.5, overOdds: -130, underOdds: 110, category: 'defense' },
  ];

  const allPlayerProps = [...playerPropsGame1, ...playerPropsGame2, ...playerPropsGame3];
  for (const prop of allPlayerProps) {
    try {
      await prisma.playerProp.create({ data: prop });
    } catch (e) {
      console.error('Error creating player prop:', prop, e);
    }
  }
  console.log(`Inserted ${allPlayerProps.length} player props`);

  // Create Game Props
  console.log('Creating game props...');
  const gameProps = [
    // Game 1 props
    { gameId: '1', propType: 'first_basket', description: 'First Basket Scorer', selection: 'LeBron James', odds: 650, line: null },
    { gameId: '1', propType: 'first_basket', description: 'First Basket Scorer', selection: 'Stephen Curry', odds: 600, line: null },
    { gameId: '1', propType: 'first_basket', description: 'First Basket Scorer', selection: 'Anthony Davis', odds: 700, line: null },
    { gameId: '1', propType: 'total_threes', description: 'Total Three-Pointers Made', selection: 'over', odds: -110, line: 24.5 },
    { gameId: '1', propType: 'total_threes', description: 'Total Three-Pointers Made', selection: 'under', odds: -110, line: 24.5 },
    { gameId: '1', propType: 'winning_margin', description: 'Winning Margin', selection: '1-5 points', odds: 300, line: null },
    { gameId: '1', propType: 'winning_margin', description: 'Winning Margin', selection: '6-10 points', odds: 350, line: null },
    { gameId: '1', propType: 'winning_margin', description: 'Winning Margin', selection: '11+ points', odds: 400, line: null },
    // Game 2 props
    { gameId: '2', propType: 'first_basket', description: 'First Basket Scorer', selection: 'Jayson Tatum', odds: 550, line: null },
    { gameId: '2', propType: 'first_basket', description: 'First Basket Scorer', selection: 'Jimmy Butler', odds: 600, line: null },
    { gameId: '2', propType: 'double_double', description: 'Player to Record Double-Double', selection: 'Bam Adebayo', odds: 200, line: null },
    { gameId: '2', propType: 'double_double', description: 'Player to Record Double-Double', selection: 'Jayson Tatum', odds: 250, line: null },
    // Game 3 props
    { gameId: '3', propType: 'first_basket', description: 'First Basket Scorer', selection: 'Joel Embiid', odds: 500, line: null },
    { gameId: '3', propType: 'first_basket', description: 'First Basket Scorer', selection: 'Tyrese Maxey', odds: 650, line: null },
    { gameId: '3', propType: 'race_to', description: 'Race to 20 Points', selection: '76ers', odds: -135, line: null },
    { gameId: '3', propType: 'race_to', description: 'Race to 20 Points', selection: 'Nets', odds: 115, line: null },
  ];

  for (const prop of gameProps) {
    try {
      await prisma.gameProp.create({ data: prop });
    } catch (e) {
      console.error('Error creating game prop:', prop, e);
    }
  }
  console.log(`Inserted ${gameProps.length} game props`);

  // Removed legacy demo 'demo-user' seeding block to avoid FK violations.
  // Demo user and associated account/bets are created in the block below using a real user ID.

  // Create demo user and account
  console.log('Creating demo user...');
  const bcrypt = await import('bcryptjs');
  const demoUsername = 'slime';
  const demoPasswordHash = await bcrypt.hash('wells123', 10);
  let demoUser = await prisma.user.findUnique({ where: { username: demoUsername } });
  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        username: demoUsername,
        password: demoPasswordHash,
        name: 'Slime',
      },
    });
    await prisma.account.create({ data: { userId: demoUser.id, balance: 2500 } });
    console.log('Demo user created:', demoUsername);
  } else {
    console.log('Demo user already exists:', demoUsername);
  }

  // Optional: add a couple of demo bets for the user
  try {
    const existingBets = await prisma.bet.count({ where: { userId: demoUser.id } });
    if (existingBets === 0) {
      await prisma.bet.create({
        data: {
          userId: demoUser.id,
          gameId: '3',
          betType: 'moneyline',
          selection: 'away',
          odds: -155,
          line: null,
          stake: 100,
          potentialPayout: 64.52,
          status: 'pending',
          placedAt: new Date(),
        },
      });
      await prisma.bet.create({
        data: {
          userId: demoUser.id,
          betType: 'parlay',
          selection: 'parlay',
          odds: 260,
          line: null,
          stake: 50,
          potentialPayout: 130,
          status: 'pending',
          placedAt: new Date(),
          legs: [
            { gameId: '1', betType: 'spread', selection: 'home', odds: -110, line: -2.5 },
            { gameId: 'nfl-1', betType: 'total', selection: 'over', odds: -110, line: 48.5 },
          ] as any,
        },
      });
      console.log('Demo bets created for demo user');
    }
  } catch (e) {
    console.warn('Skipping demo bets due to error:', e);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

