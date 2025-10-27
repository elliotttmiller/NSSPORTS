# NorthStar Sports

> A modern, production-ready sports betting platform built with Next.js 15, Prisma, and PostgreSQL.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

NorthStar Sports is a comprehensive sports betting platform that provides real-time game data, live odds, and an intuitive betting interface. Built with modern web technologies and industry-standard practices, it offers a seamless experience across all devices.

### Key Highlights

- **Modern Stack**: Next.js 15 App Router with React 19 and TypeScript
- **Type-Safe Backend**: Prisma ORM with PostgreSQL (Supabase)
- **Responsive Design**: Mobile-first approach with Tailwind CSS v4
- **Production Ready**: Full ESLint, Prettier, and EditorConfig setup
- **API-Driven**: RESTful API endpoints with comprehensive error handling
- **Real-Time Data**: Live game updates and odds tracking

## ✨ Features

### Core Functionality

- 🎮 **Multi-Sport Support**: NFL, NBA, NHL coverage with live odds
- 📊 **Live Game Tracking**: Real-time scores and game status via SportsGameOdds API
- 💰 **Comprehensive Betting**: Spread, Moneyline, Totals, Player Props, and Game Props
- 📱 **Responsive Design**: Mobile-first, optimized for all devices
- 🎯 **Bet Slip Management**: Single and parlay betting with custom stakes
- 📈 **Betting History**: Track wins, losses, and performance metrics
- ⚡ **Fast Performance**: Server Components, optimized bundles, multi-layer caching
- 🔄 **Real-time Updates**: Zustand-powered live data store with automatic syncing

### Technical Features

- ✅ **Next.js 15.5.4 App Router** - Modern server/client component architecture
- ✅ **Secure Authentication** - NextAuth.js with JWT tokens and middleware protection
- ✅ **Type Safety** - Full TypeScript coverage with strict mode
- ✅ **API Routes** - Backend for Frontend (BFF) pattern with CORS protection
- ✅ **Database** - Prisma ORM with PostgreSQL and connection pooling
- ✅ **Validation** - Zod schemas for type-safe API contracts
- ✅ **Error Handling** - Comprehensive error boundaries and logging
- ✅ **Testing** - Jest with 21/21 tests passing
- ✅ **PWA Support** - Progressive Web App with manifest
- ✅ **Production Ready** - Zero TypeScript errors, build succeeds

## 🏗️ Architecture

### Project Structure

```
NSSPORTS/
├── nssports/                   # Main Next.js application (App Router)
│   ├── package.json
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── tsconfig.json
│   ├── prisma/                 # Database schema and seeds
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── public/                 # Static assets (icons, logos)
│   └── src/
│       ├── app/                # App Router routes & pages
│       │   ├── page.tsx        # Homepage (trending + stats)
│       │   ├── live/page.tsx   # Live games list
│       │   ├── games/          # Games index & league routes
│       │   ├── my-bets/        # Active/history bets
│       │   ├── account/        # Account views
│       │   └── globals.css     # Tailwind v4 theme/styles
│       ├── components/
│       │   ├── bets/BetCard.tsx
│       │   ├── features/games/ # ProfessionalGameRow, CompactMobileGameRow
│       │   └── ui/             # Card, Button, Badge, etc.
│       ├── context/            # BetSlip, Navigation, etc.
│       ├── store/              # Zustand stores (liveDataStore)
│       ├── hooks/              # usePaginatedGames, useLiveMatch, queries
│       ├── lib/                # formatters, prisma client, utils, sportsgameodds-sdk
│       ├── services/           # api.ts (client adapters)
│       └── types/              # Game, Bet, User models
├── scripts/                    # Utility scripts
│   ├── clean.py
│   ├── start.py
│   └── README.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md                   # This file
└── SECURITY.md

```

### Technology Stack

**Frontend**
- Next.js 15.5.4 (App Router)
- React 19.1.0
- TypeScript 5.x
- Tailwind CSS v4
- Framer Motion for animations
- Zustand for state management

**Backend**
- Next.js API Routes
- NextAuth.js v5 for authentication
- Prisma ORM 6.x
- PostgreSQL (Supabase)
- Server-side rendering
- SportsGameOdds API integration

**Development Tools**
- ESLint for code quality
- Prettier for code formatting
- EditorConfig for consistency
- Husky for pre-commit hooks
- Vitest for testing

### Data Flow Architecture

NSSPORTS implements a modern Backend for Frontend (BFF) architecture with centralized state management:

```
┌─────────────────────────────────────────────────────────────┐
│                     NSSPORTS Data Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  External Data Sources                                       │
│  ├── SportsGameOdds API (live sports data, odds, props)     │
│  └── PostgreSQL Database (user data, bets)                  │
│                           ▼                                  │
│  Next.js API Routes (BFF Pattern)                           │
│  ├── /api/matches         (cached 60s)                      │
│  ├── /api/games           (cached 30s)                      │
│  ├── /api/my-bets         (authenticated)                   │
│  └── /api/account         (authenticated)                   │
│                           ▼                                  │
│  State Management Layer                                      │
│  ├── React Query          (server state, caching)           │
│  ├── Zustand Store        (global live data)                │
│  └── React Context        (bet slip, navigation)            │
│                           ▼                                  │
│  UI Components                                               │
│  ├── Server Components    (static, SSR)                     │
│  └── Client Components    (interactive)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Architecture Highlights:**
- **BFF Pattern**: All external APIs accessed via Next.js API routes
- **Multi-layer Caching**: Server-side (`unstable_cache`) + Client-side (React Query)
- **Type Safety**: Full TypeScript coverage with Zod validation
- **Security**: Middleware-based authentication and CORS

See [ARCHITECTURE.md](./nssports/docs/ARCHITECTURE.md) for detailed documentation.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **npm**: 10.x or higher
- **PostgreSQL**: Database (or Supabase account)
- **Git**: Version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/elliotttmiller/NSSPORTS.git
   cd NSSPORTS
   ```

2. **Install dependencies**
   ```bash
   cd nssports/nssports
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   - `DATABASE_URL`: Your PostgreSQL connection string (from Supabase or other provider)
   - `DIRECT_URL`: Direct database connection (non-pooled)
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for development)
   - `SPORTSGAMEODDS_API_KEY`: Your API key from [SportsGameOdds](https://sportsgameodds.com/) (required for live odds data)
   - `THE_ODDS_API_KEY`: (DEPRECATED - No longer used, can be omitted)

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   Navigate to http://localhost:3000
   ```

### Quick Start Scripts

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:seed          # Seed database with sample data
npm run db:studio        # Open Prisma Studio

# Code Quality
npm run lint             # Run ESLint
npm run test             # Run tests
npm run format           # Format code with Prettier
```

## 🔐 Authentication

The application uses NextAuth.js v5 for secure authentication:

### User Registration & Login

1. **Register**: Navigate to `/auth/register` or click "Register" in the header
   - Create an account with email and password
   - New users receive a $1000 starting balance
   
2. **Login**: Navigate to `/auth/login` or click "Login" in the header
   - Use your email and password credentials
   
3. **Session Management**: 
   - Sessions are managed via JWT tokens
   - Authentication state is available across the app
   - API routes automatically verify user identity

### Protected Features

The following features require authentication:
- Placing bets (`POST /api/my-bets`)
- Viewing bet history (`GET /api/my-bets`)
- Account management (`GET /api/account`)

### API Authentication

API routes use session-based authentication:

```typescript
import { getAuthUser } from "@/lib/authHelpers";

// In your API route
const userId = await getAuthUser(); // Throws if not authenticated
```

## 📚 Documentation

**📖 Complete documentation is available in the `/nssports/docs` directory:**

- **[Absolute Zero Report](./nssports/docs/ABSOLUTE_ZERO_REPORT.md)** - Comprehensive transformation report and compliance verification
- **[Architecture](./nssports/docs/ARCHITECTURE.md)** - Complete system architecture, data flow, and technical decisions
- **[Quick Reference](./nssports/docs/GOLD_STANDARD_QUICK_REFERENCE.md)** - Development quick reference guide
- **[Documentation Index](./nssports/docs/README.md)** - Complete documentation index

### Legacy Documentation

Historical implementation reports are archived in `/nssports/docs/archive/` for reference.

### Additional Resources

- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute to the project
- **[Security Policy](./SECURITY.md)** - Security guidelines and reporting

### API Documentation

RESTful API endpoints are available at `/api`:

**Public Endpoints:**
- `GET /api/sports` - Get all sports with leagues
- `GET /api/games` - Get games (paginated)
- `GET /api/games/upcoming` - Get upcoming games (deprecated, use store)
- `GET /api/games/live` - Get live games (deprecated, use store)
- `GET /api/games/league/:leagueId` - Get games by league
- `GET /api/matches?sport={sportKey}` - Get live matches for a sport (new, powers the store)

**Protected Endpoints (require authentication):**
- `GET /api/account` - Get user account balance and stats
- `GET /api/my-bets` - Get user's bet history
- `POST /api/my-bets` - Place a new bet

**Authentication Endpoints:**
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/[...nextauth]` - NextAuth.js authentication handler

## 💻 Development

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Write meaningful commit messages
   - Test your changes thoroughly

3. **Run quality checks**
   ```bash
   npm run lint           # Check for linting errors
   npm run build          # Verify build succeeds
   ```

4. **Submit a pull request**
   - Provide a clear description
   - Reference any related issues
   - Request review from maintainers

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with 100-char line width
- **Linting**: ESLint with Next.js config
- **Naming Conventions**:
  - Components: PascalCase
  - Files: camelCase or kebab-case
  - Variables/Functions: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Types/Interfaces: PascalCase

### Environment Configuration

Create a `.env.local` file in the `nssports` app directory (`NSSPORTS/nssports`):

```env
# Database (required)
DATABASE_URL="your_supabase_pooler_url"
DIRECT_URL="your_supabase_direct_url"

# Application (optional)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="/api"
NEXT_PUBLIC_APP_NAME="NorthStar Sports"

# CORS (required for external access)
ALLOWED_ORIGINS="http://localhost:3000"
```

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
# Build image
docker build -t nssports ./nssports

# Run container
docker run -p 3000:3000 nssports
```

### Environment Variables for Production

Ensure these are set in your production environment:

- `DATABASE_URL`: PostgreSQL connection string (with pooling)
- `DIRECT_URL`: Direct PostgreSQL connection (for migrations)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins
- `NODE_ENV`: Set to `production`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing.

## 🔒 Security

For security concerns, please refer to our [Security Policy](./SECURITY.md).

**Do not** report security vulnerabilities through public GitHub issues.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database by [Prisma](https://www.prisma.io/)
- Hosted on [Supabase](https://supabase.com/)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/elliotttmiller/NSSPORTS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/elliotttmiller/NSSPORTS/discussions)

---

**Built with ❤️ by the NorthStar Sports Team**

[⬆ Back to top](#northstar-sports)
