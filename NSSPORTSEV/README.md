# NSSPORTSEV - Sports Betting Analyzer, Calculator & Predictor

## Overview

NSSPORTSEV is a professional sports betting analysis platform focused on identifying positive expected value (EV+) opportunities and arbitrage situations. Unlike traditional sportsbook platforms, NSSPORTSEV does **not** facilitate bet placement. Instead, it provides sophisticated calculators and analytics tools for serious sports bettors who want to make data-driven decisions.

## ✅ Implemented Features

### 📊 EV+ Calculator
- **Industry-standard expected value calculations** using proven mathematical formulas
- **Kelly Criterion integration** for optimal bet sizing recommendations
- **Vig-free probability estimation** to remove bookmaker margins
- **Edge detection** and confidence-based recommendations
- **Closing Line Value (CLV) analysis** to measure bet quality
- **Interactive UI** with real-time calculations

### 🎯 Arbitrage Finder
- **Automatic arbitrage detection** across multiple outcomes
- **Optimal stake distribution** calculations for guaranteed profit
- **Multi-sportsbook comparison** (2-way, 3-way, and N-way markets)
- **Quality assessment** with warning system for execution risks
- **Risk-free profit calculator** with detailed breakdown
- **Interactive UI** supporting unlimited outcomes

## 🔄 Coming Soon

### Live Odds Tracking
- Real-time odds updates from multiple sportsbooks
- Sub-second latency via WebSocket streaming
- Support for NFL, NBA, NHL, and more sports
- Comprehensive market coverage (spreads, moneylines, totals, props)

### Analytics & Insights
- Historical odds movement tracking
- Line shopping recommendations
- Market efficiency analysis
- Automated opportunity alerts

## Technology Stack

This codebase shares the UI design system and live odds infrastructure with NSSPORTS but is built for a different purpose:

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **State Management**: Zustand (real-time data), React Query (async data)
- **Real-time**: WebSocket streaming (Pusher)
- **Styling**: Custom dark theme with oklch color system
- **Type Safety**: TypeScript 5

## Project Structure

```
NSSPORTSEV/
├── src/
│   ├── app/                        # Next.js app directory
│   │   ├── layout.tsx             # Root layout (no auth)
│   │   ├── page.tsx               # Calculator dashboard
│   │   └── globals.css            # Global styles & theme
│   ├── components/
│   │   ├── ui/                    # Base UI components
│   │   ├── layouts/               # Layout components (simplified)
│   │   ├── features/
│   │   │   └── calculators/       # EV+ and Arbitrage calculators
│   │   └── providers/             # Context providers
│   ├── lib/
│   │   ├── calculators/           # Core calculation engines
│   │   │   ├── ev-calculator.ts   # EV+ and Kelly Criterion
│   │   │   └── arbitrage-calculator.ts  # Arbitrage detection
│   │   ├── streaming-service.ts   # WebSocket service (future use)
│   │   └── sportsgameodds-sdk.ts  # API SDK (future use)
│   ├── hooks/                     # React hooks
│   ├── store/                     # Zustand stores
│   └── types/                     # TypeScript types
├── public/                        # Static assets
└── package.json
```

## Design System

The UI design system is shared with NSSPORTS:

### Color System
- Dark theme base: `#0a0a0a`
- Accent color: Muted green `#17804e`
- OKLCH color space for perceptually uniform colors
- Custom semantic color tokens

### Components
- Radix UI primitives for accessibility
- Consistent spacing and typography
- Responsive design system
- Dark-mode optimized

## Algorithms & Mathematics

NSSPORTSEV implements industry-standard algorithms backed by decades of research:

### Expected Value (EV+) Formula
```
EV = (Probability Win × Profit Win) - (Probability Lose × Amount Lost)
```
- **Positive EV** (+EV) indicates a profitable long-term opportunity
- Calculation accounts for true win probability vs implied odds probability
- Edge detection identifies the advantage over bookmaker margins

### Kelly Criterion Formula
```
Kelly Fraction = [(odds × win probability) - 1] / (odds - 1)
```
- **Optimal bet sizing** to maximize long-term bankroll growth
- Fractional Kelly (e.g., 25% Kelly) recommended for risk management
- Prevents overbetting and minimizes risk of ruin

### Arbitrage Detection Formula
```
Arbitrage % = (1/Odds₁ + 1/Odds₂ + ... + 1/Oddsₙ) × 100
```
- **Guaranteed profit** when Arbitrage % < 100%
- Works for 2-way, 3-way, and N-way markets
- Optimal stake distribution ensures equal payout regardless of outcome

### Research Sources
- [Expected Value Calculator - Bet Hero](https://app.betherosports.com/calculators/expected-value)
- [Kelly Criterion Calculator - ValueBets](https://valuebets.net/tools/kelly-criterion-calculator)
- [Arbitrage Calculator - Dyutam](https://dyutam.com/tools/arbitrage-calculator)
- [Bayesian Probabilities in Sports Betting - R-bloggers](https://www.r-bloggers.com/2026/02/designing-sports-betting-systems-in-r-bayesian-probabilities-expected-value-and-kelly-logic/)

## Getting Started

### Prerequisites
- Node.js >= 18.18.0
- npm >= 10.0.0

### Installation

```bash
cd NSSPORTSEV
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=your_api_url

# Streaming Configuration
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster

# SportsGameOdds API (for live odds streaming)
SPORTSGAMEODDS_API_KEY=your_api_key
NEXT_PUBLIC_STREAMING_ENABLED=true
```

📖 **For detailed streaming API setup with GitHub Actions, see [STREAMING_SETUP.md](./STREAMING_SETUP.md)**

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
npm run build
npm start
```

## Development Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run typecheck` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Key Differences from NSSPORTS

NSSPORTSEV is built from NSSPORTS but with a completely different purpose:

### What Was Removed
- ❌ **Sportsbook features**: Odds juicing/margin management system
- ❌ **Bet placement**: Bet slip, bet history, settlement logic
- ❌ **User accounts**: Authentication, user balances, profiles
- ❌ **Database**: Prisma ORM, PostgreSQL for user/bet data
- ❌ **Backend operations**: Bet processing, payout calculations

### What Was Added
- ✅ **EV+ Calculator**: Industry-standard expected value calculations
- ✅ **Kelly Criterion**: Optimal bet sizing recommendations
- ✅ **Arbitrage Finder**: Guaranteed profit opportunity detection
- ✅ **Multi-outcome support**: 2-way, 3-way, N-way market analysis
- ✅ **Vig removal**: Clean probability calculations
- ✅ **Interactive UI**: Real-time calculators and analysis

## Implementation Status

### ✅ Completed (Phase 1-3)
- [x] Remove all sportsbook and betting features
- [x] Remove database dependencies (Prisma)
- [x] Remove authentication system
- [x] Implement EV+ calculation engine
- [x] Implement Kelly Criterion calculator
- [x] Implement arbitrage detection algorithm
- [x] Build EV+ calculator UI component
- [x] Build arbitrage calculator UI component
- [x] Create interactive dashboard
- [x] Successful production build

### 🔄 In Progress (Phase 4)
- [ ] Connect calculators to live odds streaming
- [ ] Real-time opportunity detection
- [ ] Automated alerts and notifications
- [ ] Performance optimization

### 📋 Planned (Phase 5-6)
- [ ] Live odds dashboard integration
- [ ] Historical odds tracking
- [ ] Multi-sportsbook comparison view
- [ ] CLV (Closing Line Value) tracking
- [ ] Advanced filtering and sorting
- [ ] Export and reporting features

### Phase 3: Arbitrage Detection
- [ ] Multi-sportsbook odds aggregation
- [ ] Arbitrage algorithm implementation
- [ ] Real-time opportunity detection
- [ ] Profitability calculations

### Phase 4: Analytics & Insights
- [ ] Historical odds database
- [ ] Line movement visualization
- [ ] Market efficiency metrics
- [ ] Closing line value tracking

### Phase 5: Advanced Features
- [ ] Machine learning for probability estimation
- [ ] Portfolio management tools
- [ ] Kelly criterion calculator
- [ ] Advanced filtering and search

## Contributing

This is a private project. For questions or suggestions, contact the repository owner.

## License

MIT License - Copyright (c) 2024 Elliott Miller

## Acknowledgments

- Shared UI design system and odds pipeline with NSSPORTS
- Built on the Next.js App Router architecture
- Uses Radix UI for accessible components
- Powered by sports-odds-api for odds data
