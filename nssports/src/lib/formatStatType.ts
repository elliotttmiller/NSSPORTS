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
