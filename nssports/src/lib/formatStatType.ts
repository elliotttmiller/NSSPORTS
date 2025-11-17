/**
 * Stat Type Display Name Formatter
 * 
 * Converts API stat type names to user-friendly display names
 * Handles all sports: NBA, NFL, NHL, etc.
 * 
 * Based on official SportsGameOdds market documentation:
 * https://sportsgameodds.com/docs/data-types/markets
 */

/**
 * Comprehensive stat type display mapping
 * Key = API stat type from SDK (snake_case)
 * Value = User-friendly display name
 * 
 * NOTE: Some stat types are sport-specific (e.g., "points" = Points in NBA, Goals in NHL)
 * Context from sport/league determines the correct interpretation
 */
const STAT_TYPE_DISPLAY_NAMES: Record<string, string> = {
  // ============================================
  // SHARED STATS (context-dependent)
  // ============================================
  'points': 'Points', // NBA: Points scored | NHL: Goals (in oddID format)
  'assists': 'Assists', // Shared across NBA/NHL
  'blocks': 'Blocks', // NBA: Blocked shots | NHL: Blocked shots
  'hits': 'Hits', // MLB: Hits | NHL: Body checks
  'firstToScore': 'First to Score',
  
  // ============================================
  // NBA / BASKETBALL STATS
  // ============================================
  'rebounds': 'Rebounds',
  'threes': 'Three-Pointers Made',
  'threes_made': 'Three-Pointers Made',
  'steals': 'Steals',
  'turnovers': 'Turnovers',
  'fouls': 'Personal Fouls',
  
  // Combo stats (NBA)
  'points+assists': 'Points + Assists',
  'points+rebounds': 'Points + Rebounds',
  'points+rebounds+assists': 'Points + Rebounds + Assists',
  'rebounds+assists': 'Rebounds + Assists',
  'blocks+steals': 'Blocks + Steals',
  'doubles': 'Double-Double',
  'triples': 'Triple-Double',
  
  // ============================================
  // NFL / FOOTBALL STATS - PASSING
  // ============================================
  'passing_yards': 'Passing Yards',
  'passing_touchdowns': 'Passing TDs',
  'passing_completions': 'Pass Completions',
  'passing_attempts': 'Pass Attempts',
  'passing_interceptions': 'Interceptions Thrown',
  'passing_longestCompletion': 'Longest Completion',
  'passing_passerRating': 'Passer Rating',
  
  // NFL / FOOTBALL STATS - RUSHING
  'rushing_yards': 'Rushing Yards',
  'rushing_touchdowns': 'Rushing TDs',
  'rushing_attempts': 'Rush Attempts',
  'rushing_longestRush': 'Longest Rush',
  
  // NFL / FOOTBALL STATS - RECEIVING
  'receiving_yards': 'Receiving Yards',
  'receiving_touchdowns': 'Receiving TDs',
  'receiving_receptions': 'Receptions',
  'receiving_longestReception': 'Longest Reception',
  
  // NFL / FOOTBALL STATS - COMBO
  'rushing+receiving_yards': 'Rush + Rec Yards',
  'passing+rushing_yards': 'Pass + Rush Yards',
  
  // NFL / FOOTBALL STATS - DEFENSE
  'defense_tackles': 'Tackles',
  'defense_sacks': 'Sacks',
  'defense_interceptions': 'Interceptions',
  'defense_combinedTackles': 'Combined Tackles',
  
  // NFL / FOOTBALL STATS - SPECIAL TEAMS
  'kickoffReturn_yards': 'Kickoff Return Yards',
  'puntReturn_yards': 'Punt Return Yards',
  'fieldGoals_made': 'Field Goals Made',
  'extraPoints_kicksMade': 'Extra Points Made',
  'kicking_totalPoints': 'Kicking Points',
  
  // NFL / FOOTBALL STATS - GENERAL
  'touchdowns': 'Touchdowns',
  'firstTouchdown': 'First TD',
  'lastTouchdown': 'Last TD',
  'fantasyScore': 'Fantasy Points',
  'largestLead': 'Largest Lead',
  'minutesInLead': 'Minutes in Lead',
  
  // ============================================
  // NHL / HOCKEY STATS
  // Official stat types from: https://sportsgameodds.com/docs/data-types/markets/hockey
  // ============================================
  'goals': 'Goals',
  'goals+assists': 'Points (Goals + Assists)', // NHL "points" = goals + assists
  'shots': 'Shots',
  'shots_onGoal': 'Shots on Goal',
  'saves': 'Saves',
  'goalie_saves': 'Goalie Saves',
  'goalie_goalsAgainst': 'Goals Against',
  'shutout': 'Shutout',
  'powerPlay_goals+assists': 'Power Play Points',
  'faceOffs_won': 'Faceoffs Won',
  'minutesPlayed': 'Minutes Played',
  'lastToScore': 'Last Goal',
  
  // ============================================
  // MLB / BASEBALL STATS
  // ============================================
  'runs': 'Runs',
  'rbi': 'RBIs',
  'home_runs': 'Home Runs',
  'strikeouts': 'Strikeouts',
  'walks': 'Walks',
  'stolen_bases': 'Stolen Bases',
  'earned_runs': 'Earned Runs',
  'innings_pitched': 'Innings Pitched',
  'pitches_thrown': 'Pitches Thrown',
  
  // ============================================
  // SOCCER STATS - Per https://sportsgameodds.com/docs/data-types/markets/soccer
  // ============================================
  'goals_scored': 'Goals',
  'assists_soccer': 'Assists',
  'shots_onTarget': 'Shots on Target',
  'shots_total': 'Total Shots',
  'corners': 'Corners',
  'cards_yellow': 'Yellow Cards',
  'cards_red': 'Red Cards',
  'fouls_committed': 'Fouls',
  'offsides': 'Offsides',
  'possession': 'Possession %',
  'passes_completed': 'Passes Completed',
  'saves_goalie': 'Saves',
  'tackles': 'Tackles',
  'cleanSheet': 'Clean Sheet',
  'bothTeamsToScore': 'Both Teams to Score',
  'firstGoal': 'First Goal',
  'lastGoal': 'Last Goal',
  'exactScore': 'Exact Score',
  'winToNil': 'Win to Nil',
  'totalTeamGoals': 'Total Team Goals',
  
  // ============================================
  // MMA STATS - Per https://sportsgameodds.com/docs/data-types/markets/mma
  // ============================================
  'methodOfVictory': 'Method of Victory',
  'ko_tko': 'KO/TKO',
  'submission': 'Submission',
  'decision': 'Decision',
  'roundWinner': 'Round Winner',
  'totalRounds': 'Total Rounds',
  'fightGoesDistance': 'Fight Goes Distance',
  'significantStrikes': 'Significant Strikes',
  'totalStrikes': 'Total Strikes',
  'takedowns': 'Takedowns',
  'knockdowns': 'Knockdowns',
  
  // ============================================
  // BOXING STATS
  // ============================================
  'ko': 'Knockout',
  'tko': 'Technical Knockout',
  'decision_boxing': 'Decision',
  'draw': 'Draw',
  'totalRounds_boxing': 'Total Rounds',
  'punchesLanded': 'Punches Landed',
  'punchesThrown': 'Punches Thrown',
  'roundBetting': 'Round Betting',
  
  // ============================================
  // GOLF STATS - Per https://sportsgameodds.com/docs/data-types/leagues
  // ============================================
  'tournamentWinner': 'Tournament Winner',
  'topFinish': 'Top Finish',
  'top5': 'Top 5 Finish',
  'top10': 'Top 10 Finish',
  'top20': 'Top 20 Finish',
  'makeCut': 'Make the Cut',
  'headToHead': 'Head to Head',
  'threeBall': '3-Ball',
  'roundScore': 'Round Score',
  'roundLeader': 'Round Leader',
  'eagles': 'Eagles',
  'birdies': 'Birdies',
  'pars': 'Pars',
  'bogeys': 'Bogeys',
  'holeInOne': 'Hole in One',
  
  // ============================================
  // HORSE RACING STATS
  // ============================================
  'winRace': 'Win',
  'placeRace': 'Place',
  'showRace': 'Show',
  'exacta': 'Exacta',
  'trifecta': 'Trifecta',
  'superfecta': 'Superfecta',
  'dailyDouble': 'Daily Double',
  'pick3': 'Pick 3',
  'pick4': 'Pick 4',
  'pick6': 'Pick 6',
};

/**
 * Format a stat type from API format to display name
 * 
 * @param statType - Raw stat type from SDK (e.g., "passing_yards", "points+assists")
 * @returns User-friendly display name (e.g., "Passing Yards", "Points + Assists")
 * 
 * @example
 * formatStatType("passing_yards") // "Passing Yards"
 * formatStatType("points+rebounds+assists") // "Points + Rebounds + Assists"
 * formatStatType("threes_made") // "Three-Pointers Made"
 */
export function formatStatType(statType: string): string {
  // Direct lookup first (most efficient)
  const displayName = STAT_TYPE_DISPLAY_NAMES[statType];
  if (displayName) return displayName;
  
  // Fallback: Format as title case with proper separators
  return statType
    .split(/([+-])/) // Split on + or - while keeping separators
    .map(part => {
      if (part === '+') return ' + ';
      if (part === '-') return ' ';
      
      // Replace underscores with spaces and capitalize
      return part
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    })
    .join('')
    .trim();
}

/**
 * Get stat type category for grouping
 * 
 * @param statType - Raw stat type from SDK
 * @returns Category name for grouping (e.g., "Passing", "Rushing", "Receiving")
 */
export function getStatTypeCategory(statType: string): string {
  // NFL categories
  if (statType.startsWith('passing_')) return 'Passing';
  if (statType.startsWith('rushing_')) return 'Rushing';
  if (statType.startsWith('receiving_')) return 'Receiving';
  if (statType.startsWith('defense_')) return 'Defense';
  if (statType.startsWith('kickoffReturn_') || statType.startsWith('puntReturn_')) return 'Returns';
  if (statType.startsWith('fieldGoals_') || statType.startsWith('extraPoints_') || statType.startsWith('kicking_')) return 'Kicking';
  if (statType === 'touchdowns' || statType.includes('Touchdown')) return 'Scoring';
  
  // NBA categories
  if (['points', 'rebounds', 'assists', 'steals', 'blocks'].includes(statType)) return 'Core Stats';
  if (statType.includes('+')) return 'Combo Stats';
  if (statType.includes('threes')) return 'Three-Point';
  
  // NHL categories
  if (['goals', 'assists', 'goals+assists'].includes(statType)) return 'Scoring';
  if (statType.includes('shots')) return 'Shooting';
  if (statType.includes('goalie') || statType.includes('saves') || statType === 'shutout') return 'Goaltending';
  if (['hits', 'blocks', 'faceOffs_won'].includes(statType)) return 'Physical/Faceoffs';
  if (statType.includes('powerPlay')) return 'Special Teams';
  if (statType === 'minutesPlayed') return 'Ice Time';
  if (statType === 'firstToScore' || statType === 'lastToScore') return 'Milestones';
  
  // Soccer categories
  if (['goals_scored', 'assists_soccer', 'firstGoal', 'lastGoal'].includes(statType)) return 'Scoring';
  if (statType.includes('shots') || statType === 'shots_onTarget' || statType === 'shots_total') return 'Shooting';
  if (statType.includes('cards') || statType.includes('fouls') || statType === 'tackles') return 'Discipline';
  if (statType === 'corners' || statType === 'offsides') return 'Set Pieces';
  if (statType === 'possession' || statType.includes('passes')) return 'Possession';
  if (statType === 'saves_goalie' || statType === 'cleanSheet' || statType === 'winToNil') return 'Goalkeeping';
  if (statType === 'bothTeamsToScore' || statType === 'exactScore' || statType === 'totalTeamGoals') return 'Match Props';
  
  // MMA/Boxing categories
  if (['methodOfVictory', 'ko_tko', 'submission', 'decision', 'ko', 'tko', 'decision_boxing'].includes(statType)) return 'Fight Outcome';
  if (statType === 'roundWinner' || statType === 'totalRounds' || statType === 'totalRounds_boxing' || statType === 'roundBetting') return 'Round Props';
  if (statType === 'fightGoesDistance') return 'Distance';
  if (statType.includes('Strikes') || statType.includes('Punches') || statType === 'knockdowns') return 'Striking';
  if (statType === 'takedowns') return 'Grappling';
  
  // Golf categories
  if (statType === 'tournamentWinner') return 'Winner';
  if (statType.includes('top') || statType === 'makeCut') return 'Finish Position';
  if (statType === 'headToHead' || statType === 'threeBall') return 'Matchups';
  if (statType.includes('round')) return 'Round Props';
  if (['eagles', 'birdies', 'pars', 'bogeys', 'holeInOne'].includes(statType)) return 'Scoring';
  
  // Horse Racing categories
  if (['winRace', 'placeRace', 'showRace'].includes(statType)) return 'Win/Place/Show';
  if (['exacta', 'trifecta', 'superfecta'].includes(statType)) return 'Exotic Bets';
  if (statType.includes('pick') || statType === 'dailyDouble') return 'Multi-Race';
  
  // Default
  return 'Other Stats';
}

/**
 * Sort stat types by importance/popularity
 * 
 * @param statTypes - Array of stat types to sort
 * @returns Sorted array with most popular stats first
 */
export function sortStatTypesByImportance(statTypes: string[]): string[] {
  // Priority order (higher = more important)
  const priorities: Record<string, number> = {
    // NFL priorities (most popular props)
    'passing_yards': 100,
    'passing_touchdowns': 99,
    'rushing_yards': 98,
    'rushing_touchdowns': 97,
    'receiving_yards': 96,
    'receiving_receptions': 95,
    'receiving_touchdowns': 94,
    'touchdowns': 93,
    'rushing+receiving_yards': 92,
    
    // NBA priorities
    'points': 91,
    'assists': 90,
    'rebounds': 89,
    'threes': 88,
    'threes_made': 87,
    'points+rebounds+assists': 86,
    'points+assists': 85,
    'points+rebounds': 84,
    
    // NHL priorities (most popular props)
    'goals': 83,
    'goals+assists': 82, // NHL "points"
    'shots_onGoal': 81,
    'shots': 80,
    'goalie_saves': 79,
    'powerPlay_goals+assists': 77,
    'faceOffs_won': 76,
    'hits': 75,
    'blocks': 74,
    'goalie_goalsAgainst': 73,
    
    // Soccer priorities
    'goals_scored': 72,
    'assists_soccer': 71,
    'shots_onTarget': 70,
    'shots_total': 69,
    'bothTeamsToScore': 68,
    'totalTeamGoals': 67,
    'corners': 66,
    'cards_yellow': 65,
    'firstGoal': 64,
    'cleanSheet': 63,
    
    // MMA priorities
    'methodOfVictory': 62,
    'totalRounds': 61,
    'fightGoesDistance': 60,
    'ko_tko': 59,
    'submission': 58,
    'decision': 57,
    
    // Boxing priorities
    'ko': 56,
    'tko': 55,
    'decision_boxing': 54,
    'totalRounds_boxing': 53,
    
    // Golf priorities
    'tournamentWinner': 52,
    'top5': 51,
    'top10': 50,
    'makeCut': 49,
    'headToHead': 48,
    'threeBall': 47,
    
    // Horse Racing priorities
    'winRace': 46,
    'placeRace': 45,
    'showRace': 44,
    'exacta': 43,
    'trifecta': 42,
  };
  
  return [...statTypes].sort((a, b) => {
    const priorityA = priorities[a] || 0;
    const priorityB = priorities[b] || 0;
    
    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }
    
    // Same priority: alphabetical
    return formatStatType(a).localeCompare(formatStatType(b));
  });
}
