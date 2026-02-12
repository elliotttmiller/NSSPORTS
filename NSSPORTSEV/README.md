# NSSPORTSEV - Sports Odds Tracking & EV+/Arbitrage Calculator

## Overview

NSSPORTSEV is a real-time sports betting odds tracking and analysis platform focused on identifying positive expected value (EV+) opportunities and arbitrage situations across multiple sportsbooks. Unlike traditional sports betting platforms, NSSPORTSEV does not facilitate bet placement but instead provides sophisticated analytics and tracking tools for professional sports bettors and analysts.

## Key Features

### 🔴 Live Odds Tracking
- Real-time odds updates from multiple sportsbooks
- Sub-second latency via WebSocket streaming
- Support for NFL, NBA, NHL, and more
- Comprehensive market coverage (spreads, moneylines, totals, props)

### 📊 EV+ Calculator
- Calculate expected value for betting opportunities
- Customizable parameters and assumptions
- Historical win rate analysis
- Edge detection and quantification

### 🎯 Arbitrage Finder
- Automatic detection of arbitrage opportunities
- Multi-sportsbook odds comparison
- Real-time alert system
- Profitability calculations including juice/vig

### 📈 Analytics & Insights
- Historical odds movement tracking
- Line shopping recommendations
- Market efficiency analysis
- Closing line value (CLV) tracking

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
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles & theme
│   ├── components/
│   │   ├── ui/                # Base UI components (cards, buttons, etc.)
│   │   ├── layouts/           # Layout components
│   │   ├── features/          # Feature-specific components
│   │   └── providers/         # Context providers
│   ├── context/               # React contexts (streaming, etc.)
│   ├── lib/                   # Core utilities
│   │   ├── odds-juice-service.ts    # Odds adjustment engine
│   │   ├── streaming-service.ts     # WebSocket service
│   │   └── sportsgameodds-sdk.ts    # API SDK
│   ├── services/              # API clients
│   ├── hooks/                 # React hooks
│   ├── store/                 # Zustand stores
│   └── types/                 # TypeScript types
├── public/                    # Static assets
├── package.json
├── next.config.ts
├── tsconfig.json
└── postcss.config.mjs
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

## Live Odds Pipeline

The odds data pipeline maintains the same architecture as NSSPORTS:

1. **Data Sources**: Integration with sports odds APIs
2. **Streaming**: Real-time WebSocket updates via Pusher
3. **Caching**: Smart caching with dynamic TTL
4. **Processing**: Odds juice adjustment and normalization
5. **Distribution**: Zustand store + React Query for state management

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
```

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

### Removed Features
- ❌ Bet placement functionality
- ❌ User accounts and authentication
- ❌ Bet slip and bet history
- ❌ Settlement and payout logic
- ❌ Database for user data and bets

### New Features
- ✅ EV+ calculation engine
- ✅ Arbitrage detection algorithms
- ✅ Multi-sportsbook odds comparison
- ✅ Advanced analytics dashboard
- ✅ Alert and notification system
- ✅ Historical odds tracking

## Roadmap

### Phase 1: Core Infrastructure (Current)
- [x] Project setup and structure
- [x] UI component library
- [x] Live odds streaming pipeline
- [ ] Basic dashboard layout

### Phase 2: EV+ Calculator
- [ ] Expected value calculation engine
- [ ] Customizable probability inputs
- [ ] Historical data integration
- [ ] EV+ opportunity alerts

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
