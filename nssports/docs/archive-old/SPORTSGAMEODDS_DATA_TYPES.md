# SportsGameOdds API Data Types Reference

**Official Documentation**: https://sportsgameodds.com/docs/data-types

This document consolidates the official data types from SportsGameOdds API for use in our codebase.

---

## Table of Contents
1. [Bet Types & Sides](#bet-types--sides)
2. [Odds Format (oddID)](#odds-format-oddid)
3. [Sports](#sports)
4. [Leagues](#leagues)
5. [Bookmakers](#bookmakers)
6. [Implementation Status](#implementation-status)

---

## Bet Types & Sides

**Source**: https://sportsgameodds.com/docs/data-types/types-and-sides

All odds objects include a `betTypeID` and 2 corresponding `sideID`s.

### Moneyline (`ml`)
**Description**: A wager on the winner of an event where a draw results in a push

**Sides**:
- `home` - The home team
- `away` - The away team

### 3-Way Moneyline (`ml3way`)
**Description**: A 3-way wager on the winner where a draw is a separate/non-push outcome

**Sides**:
- `home` - Home team wins
- `away` - Away team wins
- `draw` - Score results in a draw
- `away+draw` - Away wins OR draw (not home)
- `home+draw` - Home wins OR draw (not away)
- `not_draw` - Either home or away wins (not draw)

### Spread (`sp`)
**Description**: A wager on the winner using a specified handicap

**Sides**:
- `home` - The home team
- `away` - The away team

### Over/Under (`ou`)
**Description**: A wager on whether the final value of a stat is over or under the given value

**Sides**:
- `over` - Final value is over the specified value
- `under` - Final value is under the specified value

### Even/Odd (`eo`)
**Description**: A wager on whether the final value of a stat is even or odd

**Sides**:
- `even` - Final value is even
- `odd` - Final value is odd

### Yes/No (`yn`)
**Description**: A wager on a yes or no question

**Sides**:
- `yes` - The answer is yes
- `no` - The answer is no

### Prop Bet (`prop`)
**Description**: A wager on a sports prop

**Sides**:
- `side1` - One side of the prop
- `side2` - The opposing side

---

## Odds Format (oddID)

**Source**: https://sportsgameodds.com/docs/data-types/odds

An `oddID` is a unique identifier for a specific betting option.

### Format
```
{statID}-{statEntityID}-{periodID}-{betTypeID}-{sideID}
```

### Example oddIDs
```typescript
// Game moneyline for home team
"game-ml-home"

// Game spread for away team
"game-ats-away"

// Game over/under for over
"game-ou-over"

// Player points over/under for specific player
"points-PLAYER_12345-game-ou-over"

// Player rebounds over/under with wildcard
"rebounds-PLAYER_ID-game-ou-over"
```

### Key Points
- **PLAYER_ID wildcard**: Use `PLAYER_ID` to fetch all players dynamically
- **oddIDs parameter**: Critical for performance - reduces payload by 50-90%
- **includeOpposingOddIDs**: Set to `true` to get both sides efficiently

---

## Sports

**Source**: https://sportsgameodds.com/docs/data-types/sports

Each `sportID` corresponds to a specific sport. Sports can have multiple leagues.

| Sport | sportID |
|-------|---------|
| Baseball | `BASEBALL` |
| Basketball | `BASKETBALL` |
| Football | `FOOTBALL` |
| Hockey | `HOCKEY` |
| Soccer | `SOCCER` |
| Tennis | `TENNIS` |
| Golf | `GOLF` |
| MMA | `MMA` |
| Cricket | `CRICKET` |
| Rugby | `RUGBY` |
| Handball | `HANDBALL` |
| Volleyball | `VOLLEYBALL` |
| Water Polo | `WATER_POLO` |
| Aussie Rules | `AUSSIE_RULES_FOOTBALL` |
| Boxing | `BOXING` |
| Darts | `DARTS` |
| ESports | `ESPORTS` |
| Floorball | `FLOORBALL` |
| Futsal | `FUTSAL` |
| Horse Racing | `HORSE_RACING` |
| Lacrosse | `LACROSSE` |
| Motorsports | `MOTORSPORTS` |
| Non-Sports | `NON_SPORTS` |
| Bandy | `BANDY` |
| Badminton | `BADMINTON` |
| Beach Volleyball | `BEACH_VOLLEYBALL` |
| Table Tennis | `TABLE_TENNIS` |
| Snooker | `SNOOKER` |

---

## Leagues

**Source**: https://sportsgameodds.com/docs/data-types/leagues

Each `leagueID` corresponds to a specific `sportID`.

### Baseball
| League | leagueID |
|--------|----------|
| MLB | `MLB` |
| MLB Minors | `MLB_MINORS` |
| NPB | `NPB` |
| KBO | `KBO` |
| CPBL | `CPBL` |
| LBPRC | `LBPRC` |
| LIDOM | `LIDOM` |
| LMP | `LMP` |
| LVBP | `LVBP` |
| WBC | `WBC` |

### Basketball
| League | leagueID |
|--------|----------|
| NBA | `NBA` |
| NBA G-League | `NBA_G_LEAGUE` |
| WNBA | `WNBA` |
| College Basketball | `NCAAB` |

### Football
| League | leagueID |
|--------|----------|
| NFL | `NFL` |
| College Football | `NCAAF` |
| CFL | `CFL` |
| XFL | `XFL` |
| USFL | `USFL` |

### Hockey
| League | leagueID |
|--------|----------|
| NHL | `NHL` |
| AHL | `AHL` |
| KHL | `KHL` |
| SHL | `SHL` |

### Soccer
| League | leagueID |
|--------|----------|
| Premier League | `EPL` |
| La Liga | `LA_LIGA` |
| Bundesliga | `BUNDESLIGA` |
| Serie A Italy | `IT_SERIE_A` |
| Ligue 1 | `FR_LIGUE_1` |
| MLS | `MLS` |
| Liga MX | `LIGA_MX` |
| Champions League | `UEFA_CHAMPIONS_LEAGUE` |
| UEFA Europa League | `UEFA_EUROPA_LEAGUE` |
| Brasileiro Série A | `BR_SERIE_A` |
| International Soccer | `INTERNATIONAL_SOCCER` |

### Tennis
| League | leagueID |
|--------|----------|
| ATP | `ATP` |
| Women's Tennis | `WTA` |
| ITF | `ITF` |

### Golf
| League | leagueID |
|--------|----------|
| PGA Men | `PGA_MEN` |
| PGA Women | `PGA_WOMEN` |
| LIV Golf | `LIV_TOUR` |

### MMA
| League | leagueID |
|--------|----------|
| UFC | `UFC` |

### Handball
| League | leagueID |
|--------|----------|
| EHF European League | `EHF_EURO` |
| EHF European Cup | `EHF_EURO_CUP` |
| Liga ASOBAL | `ASOBAL` |
| SEHA Liga | `SEHA` |
| IHF Super Globe | `IHF_SUPER_GLOBE` |

### Non-Sports
| League | leagueID |
|--------|----------|
| Politics | `POLITICS` |
| Events | `EVENTS` |
| TV | `TV` |
| Movies | `MOVIES` |
| Music | `MUSIC` |
| Celebrities | `CELEBRITY` |
| Fun | `FUN` |
| Markets | `MARKETS` |
| Weather | `WEATHER` |

---

## Bookmakers

**Source**: https://sportsgameodds.com/docs/data-types/bookmakers

Each `bookmakerID` corresponds to a sportsbook, daily fantasy site, or betting platform.

### Major US Bookmakers
| Bookmaker | bookmakerID |
|-----------|-------------|
| DraftKings | `draftkings` |
| FanDuel | `fanduel` |
| BetMGM | `betmgm` |
| Caesars | `caesars` |
| PointsBet | `pointsbet` |
| Barstool | `barstool` |
| BetRivers | `betrivers` |
| WynnBet | `wynnbet` |
| Unibet | `unibet` |
| FOX Bet | `foxbet` |
| ESPN BET | `espnbet` |
| Fanatics | `fanatics` |
| Hard Rock Bet | `hardrockbet` |
| BetPARX | `betparx` |
| SugarHouse | `sugarhouse` |
| Circa | `circa` |
| Superbook | `superbook` |
| Bally Bet | `ballybet` |
| Betr Sportsbook | `betrsportsbook` |
| Fliff | `fliff` |
| FourWinds | `fourwinds` |
| HotStreak | `hotstreak` |
| SI Sportsbook | `si` |
| theScore Bet | `thescorebet` |
| Tipico | `tipico` |
| Wind Creek | `windcreek` |

### International Bookmakers
| Bookmaker | bookmakerID |
|-----------|-------------|
| bet365 | `bet365` |
| William Hill | `williamhill` |
| Pinnacle | `pinnacle` |
| Bovada | `bovada` |
| MyBookie | `mybookie` |
| BetOnline | `betonline` |
| SportsBetting.ag | `sportsbetting_ag` |
| BetAnySports | `betanysports` |
| BetUS | `betus` |
| GTbets | `gtbets` |
| Everygame | `everygame` |
| LowVig | `lowvig` |
| 1xBet | `1xbet` |
| 888 Sport | `888sport` |
| BetClic | `betclic` |
| Betfair Exchange | `betfairexchange` |
| Betfair Sportsbook | `betfairsportsbook` |
| Betfred | `betfred` |
| Bet Victor | `betvictor` |
| Betway | `betway` |
| BlueBet | `bluebet` |
| Bodog | `bodog` |
| Bookmaker.eu | `bookmakereu` |
| BoomBet | `boombet` |
| BoyleSports | `boylesports` |
| Casumo | `casumo` |
| Coolbet | `coolbet` |
| Coral | `coral` |
| Grosvenor | `grosvenor` |
| Ladbrokes | `ladbrokes` |
| LeoVegas | `leovegas` |
| LiveScore Bet | `livescorebet` |
| Marathon Bet | `marathonbet` |
| Matchbook | `matchbook` |
| Mr Green | `mrgreen` |
| Neds | `neds` |
| NordicBet | `nordicbet` |
| NorthStar Bets | `northstarbets` |
| Paddy Power | `paddypower` |
| PlayUp | `playup` |
| Sky Bet | `skybet` |
| SportsBet | `sportsbet` |
| Stake | `stake` |
| Suprabets | `suprabets` |
| TAB | `tab` |
| TABtouch | `tabtouch` |
| TopSport | `topsport` |
| Virgin Bet | `virginbet` |
| Betsafe | `betsafe` |
| Betsson | `betsson` |

### DFS & Props Platforms
| Platform | bookmakerID |
|----------|-------------|
| ParlayPlay | `parlayplay` |
| PrizePicks | `prizepicks` |
| Prophet Exchange | `prophetexchange` |
| Sleeper | `sleeper` |
| Sporttrade | `sporttrade` |
| Underdog Fantasy | `underdog` |

### Unknown/Consensus
| Type | bookmakerID |
|------|-------------|
| Unknown | `unknown` |

**Note**: Consensus odds (average across bookmakers) use `bookmakerID: "consensus"`.

---

## Implementation Status

### ✅ Completed
- [x] Type definitions in `src/types/game.ts`
  - BetTypeID enum
  - SideID enum  
  - SportID enum
  - LeagueID enum
  - BookmakerID enum
  - OddID type definition
- [x] Odds filtering patterns in `src/lib/odds-filtering.ts`
  - Sport-specific market patterns (NBA, NFL, NHL)
  - PLAYER_ID wildcard support
  - Preset configurations (MAIN_LINES, POPULAR_PROPS, ALL_PLAYER_PROPS)
  - Bet grading functions
- [x] Rate limiting implementation
  - Token bucket algorithm
  - Request deduplication
  - Hourly limits enforcement

### 🚧 Integration Needed
- [ ] Update `hybrid-cache.ts` to use oddIDs parameter
- [ ] Update API routes to support odds filtering
- [ ] Add bookmaker selection in UI
- [ ] Implement bet type validation using official BetTypeID
- [ ] Add side ID validation for bet placement

### 📋 Future Enhancements
- [ ] Streaming API integration (requires AllStar plan)
- [ ] Markets documentation per sport
- [ ] Stats and Periods data types
- [ ] Stat Entity definitions

---

## Usage Examples

### TypeScript Type Imports
```typescript
import type { 
  BetTypeID, 
  SideID, 
  LeagueID, 
  SportID, 
  BookmakerID,
  OddID 
} from '@/types/game';

// Use in your code
const betType: BetTypeID = 'ml';
const side: SideID = 'home';
const league: LeagueID = 'NBA';
```

### Odds Filtering
```typescript
import { ODDS_PRESETS, buildOddIDsParam } from '@/lib/odds-filtering';

// Get only main game lines (fastest)
const { oddIDs, includeOpposingOddIDs } = buildOddIDsParam('NBA', ODDS_PRESETS.MAIN_LINES);

// Fetch with odds filtering
const events = await getEvents({
  leagueID: 'NBA',
  oddIDs,
  includeOpposingOddIDs,
});
```

### Bet Grading
```typescript
import { gradeOverUnderOdds } from '@/lib/odds-filtering';

const result = gradeOverUnderOdds(
  110.5,  // Line
  112,    // Actual score
  'over'  // Side bet on
);

console.log(result); // 'win', 'loss', or 'push'
```

---

## Official Documentation Links

- **Introduction**: https://sportsgameodds.com/docs/introduction
- **Data Types Overview**: https://sportsgameodds.com/docs/data-types
- **Bet Types & Sides**: https://sportsgameodds.com/docs/data-types/types-and-sides
- **Odds Format**: https://sportsgameodds.com/docs/data-types/odds
- **Sports**: https://sportsgameodds.com/docs/data-types/sports
- **Leagues**: https://sportsgameodds.com/docs/data-types/leagues
- **Bookmakers**: https://sportsgameodds.com/docs/data-types/bookmakers
- **Response Speed Guide**: https://sportsgameodds.com/docs/guides/response-speed
- **Handling Odds Guide**: https://sportsgameodds.com/docs/guides/handling-odds
- **Data Batches**: https://sportsgameodds.com/docs/guides/data-batches
- **Streaming API**: https://sportsgameodds.com/docs/guides/realtime-streaming-api

---

**Last Updated**: Based on official documentation as of 2025
**Maintained By**: NSSPORTS Development Team
