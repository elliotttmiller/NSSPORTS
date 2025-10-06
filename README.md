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

- 🎮 **Multi-Sport Support**: NFL, NBA, NHL coverage
- 📊 **Live Game Tracking**: Real-time scores and game status
- 💰 **Comprehensive Betting**: Spread, Moneyline, and Totals
- 📱 **Responsive Design**: Optimized for mobile, tablet, and desktop
- 🎯 **Bet Slip Management**: Single and parlay betting support
- 📈 **Betting History**: Track wins, losses, and performance
- ⚡ **Fast Performance**: Static generation and optimized bundles

### Technical Features

- Server-side rendering and static generation
- **Secure authentication with NextAuth.js**
- **Protected API routes with session management**
- API route handlers with CORS protection
- Database connection pooling
- Type-safe API contracts with Zod validation
- Environment-based configuration
- Comprehensive error handling
- Pre-commit hooks for code quality

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
│       ├── hooks/              # usePaginatedGames, queries
│       ├── lib/                # formatters, prisma client, utils
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

**Backend**
- Next.js API Routes
- NextAuth.js v5 for authentication
- Prisma ORM 6.x
- PostgreSQL (Supabase)
- Server-side rendering

**Development Tools**
- ESLint for code quality
- Prettier for code formatting
- EditorConfig for consistency
- Husky for pre-commit hooks
- Vitest for testing

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
   - `THE_ODDS_API_KEY`: Your API key from [The Odds API](https://the-odds-api.com/) (required for live odds data)

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

Comprehensive documentation is available in the `/docs` directory:

- **[The Odds API Integration](./nssports/docs/THE_ODDS_API_INTEGRATION.md)** - Live sports odds integration guide
- **[Backend Setup Guide](./docs/BACKEND_SETUP.md)** - Database and API configuration
- **[Environment Variables](./docs/ENVIRONMENT.md)** - Configuration guide
- **[Migration Guide](./docs/MIGRATION_COMPLETE.md)** - Migration documentation
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute
- **[Security Policy](./SECURITY.md)** - Security guidelines

### API Documentation

RESTful API endpoints are available at `/api`:

**Public Endpoints:**
- `GET /api/sports` - Get all sports with leagues
- `GET /api/games` - Get games (paginated)
- `GET /api/games/upcoming` - Get upcoming games
- `GET /api/games/live` - Get live games
- `GET /api/games/league/:leagueId` - Get games by league

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
