# NSSPORTS Repository Structure

## Directory Layout

```
NSSPORTS/ (Repository Root)
│
├── nssports/                           # Original betting application
│   ├── src/
│   │   ├── app/                       # Next.js app (with betting features)
│   │   ├── components/
│   │   │   ├── ui/                    # UI components
│   │   │   ├── layouts/               # Layouts (with bet slip)
│   │   │   ├── features/              # Feature components
│   │   │   │   ├── games/            # Game rows (with betting)
│   │   │   │   └── mobile/           # Mobile bet slip
│   │   │   └── panels/                # Bet slip panels
│   │   ├── context/                   # Contexts (BetSlip, BetHistory, etc.)
│   │   ├── hooks/                     # All hooks (including betting)
│   │   ├── lib/                       # Libraries & services
│   │   ├── services/                  # API services
│   │   ├── store/                     # Zustand stores
│   │   └── types/                     # All types (including Bet types)
│   ├── prisma/                        # Database schema (users, bets)
│   ├── package.json                   # Full dependencies
│   └── ...config files
│
├── NSSPORTSEV/                         # New EV+/Arbitrage application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # Simplified layout (no betting)
│   │   │   ├── page.tsx              # Dashboard page
│   │   │   └── globals.css           # Same theme & styling ✅
│   │   ├── components/
│   │   │   ├── ui/                   # Same UI components ✅
│   │   │   ├── layouts/              # Simplified layouts (no bet slip)
│   │   │   └── providers/            # Minimal providers
│   │   ├── context/
│   │   │   └── StreamingContext.tsx  # Odds streaming only ✅
│   │   ├── hooks/                    # Odds-related hooks only ✅
│   │   ├── lib/
│   │   │   ├── odds-juice-service.ts # Same odds engine ✅
│   │   │   ├── streaming-service.ts  # Same streaming ✅
│   │   │   └── sportsgameodds-sdk.ts # Same SDK ✅
│   │   ├── services/
│   │   │   └── api.ts                # Same API client ✅
│   │   ├── store/
│   │   │   └── liveDataStore.ts      # Same data store ✅
│   │   └── types/                    # Game types only (no Bet types)
│   ├── package.json                   # Streamlined dependencies
│   ├── README.md                      # NSSPORTSEV specific docs
│   └── ...config files
│
├── NSSPORTSEV_CREATION_SUMMARY.md     # This documentation
└── README.md                           # Repository README

```

## What's Shared

### ✅ Identical UI Design & Styling
- Same Tailwind CSS theme
- Same component library
- Same dark mode OKLCH colors
- Same animations and transitions

### ✅ Identical Live Odds Pipeline
- Same WebSocket streaming
- Same API integration
- Same odds adjustment service
- Same real-time data store

## What's Different

### NSSPORTS (Betting Application)
- ✅ User authentication (NextAuth)
- ✅ User accounts & balances
- ✅ Bet slip UI
- ✅ Bet placement
- ✅ Bet history
- ✅ Settlement system
- ✅ Admin dashboard
- ✅ Database (PostgreSQL + Prisma)
- 📦 Size: ~8.0 MB

### NSSPORTSEV (Odds Tracking & EV+/Arbitrage)
- ❌ No user authentication
- ❌ No user accounts
- ❌ No bet slip
- ❌ No betting functionality
- ❌ No database
- ✅ EV+ calculator (to build)
- ✅ Arbitrage detector (to build)
- ✅ Multi-sportsbook comparison (to build)
- 📦 Size: ~3.7 MB

## Independence

Both applications are **completely independent**:
- Separate directories
- Separate dependencies
- Separate builds
- Can run simultaneously on different ports
- No shared code imports between them

## Deployment

Each application can be deployed independently:

```bash
# NSSPORTS
cd nssports
npm install
npm run build
npm start

# NSSPORTSEV
cd NSSPORTSEV
npm install
npm run build
npm start
```
