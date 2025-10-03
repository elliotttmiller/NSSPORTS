# NorthStar Sports - Backend Setup Guide

## Overview

This application now uses a production-ready backend architecture with:
- **Next.js 15 API Routes** (App Router) for REST API endpoints
- **Prisma ORM** for type-safe database operations
- **Supabase PostgreSQL** for production database
- **TypeScript** for end-to-end type safety

## Architecture

### Database Layer
- **ORM**: Prisma v6
- **Database**: PostgreSQL (Supabase)
- **Schema**: Normalized design with proper relationships and indexes

### API Layer
All API endpoints are located in `src/app/api/`:

- `GET /api/sports` - Fetch all sports and their leagues
- `GET /api/games` - Paginated games with optional filters (leagueId, status)
- `GET /api/games/live` - Get all live games
- `GET /api/games/upcoming` - Get upcoming games
- `GET /api/games/league/[leagueId]` - Get games for a specific league

### Service Layer
- `src/services/api.ts` - Client-side API service with error handling
- `src/lib/prisma.ts` - Prisma client singleton
- `src/lib/apiTypes.ts` - TypeScript types for API operations

## Environment Setup

### 1. Create Environment File

Create a `.env.local` file in the `next_frontend` directory:

```env
# Frontend Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="/api"
NEXT_PUBLIC_APP_NAME="NorthStar Sports"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NEXT_PUBLIC_FEATURE_FLAGS="betting,live-scores"

# Prisma Database Configuration (Supabase)
DATABASE_URL="your_database_url_with_pooler"
DIRECT_URL="your_direct_database_url"

# Development & Debugging
NODE_ENV="development"
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with initial data
npm run db:seed

# (Optional) Open Prisma Studio to view data
npm run db:studio
```

## Database Schema

### Core Models

**Sports & Leagues**
- Sports (NBA, NFL, NHL)
- Leagues (one-to-many with Sports)

**Teams**
- Team information with logos and records
- Linked to specific leagues

**Games**
- Home/Away teams
- Start time, status (upcoming/live/finished)
- Scores and game state

**Odds**
- Multiple odds per game (spread, moneyline, total)
- American odds format
- Includes lines for spreads and totals

**Bets**
- User bet tracking
- Stake and potential payout
- Status tracking (pending/won/lost)

## API Usage

### From Frontend Components

```typescript
import { getSports, getGamesPaginated, getLiveGames } from '@/services/api';

// Get all sports
const sports = await getSports();

// Get paginated games
const { data, pagination } = await getGamesPaginated('nba', 1, 10);

// Get live games
const liveGames = await getLiveGames();
```

### Direct API Calls

```bash
# Get sports
curl http://localhost:3000/api/sports

# Get games (paginated)
curl "http://localhost:3000/api/games?page=1&limit=10"

# Get games by league
curl "http://localhost:3000/api/games?leagueId=nba"

# Get live games
curl http://localhost:3000/api/games/live

# Get games for specific league
curl http://localhost:3000/api/games/league/nba
```

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database operations
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

### Adding New Data

To add more games, teams, or update the seed data:

1. Edit `prisma/seed.ts`
2. Run `npm run db:seed`

## Production Deployment

### Prerequisites

1. Supabase project with PostgreSQL database
2. Environment variables configured
3. Database schema pushed and seeded

### Deployment Steps

```bash
# 1. Set production environment variables
# DATABASE_URL - pooled connection for runtime
# DIRECT_URL - direct connection for migrations

# 2. Generate Prisma client
npm run db:generate

# 3. Push schema (if not already done)
npm run db:push

# 4. Build application
npm run build

# 5. Start production server
npm start
```

### Environment Variables for Production

```env
# Production settings
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXT_PUBLIC_API_BASE_URL="/api"

# Database URLs from Supabase
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

## Type Safety

All API responses and database operations are fully typed:

- Frontend types: `src/types/index.ts`
- API types: `src/lib/apiTypes.ts`
- Prisma generates types automatically from schema

## Performance Optimizations

- Database indexes on frequently queried fields
- Pooled connections via Supabase
- Efficient query patterns with Prisma
- Proper relation loading (include vs select)

## Monitoring & Debugging

### Prisma Studio
Visual database browser:
```bash
npm run db:studio
```

### API Logs
Development mode shows all queries:
```typescript
// In src/lib/prisma.ts
log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
```

## Migration from Mock Data

The following files are **deprecated** and should not be used:

- ❌ `src/lib/data/mockData.ts` - Replaced by database
- ❌ `src/services/mockApi.ts` - Replaced by `src/services/api.ts`

All pages now use real API endpoints via `src/services/api.ts`.

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull
```

### Type Generation Issues
```bash
# Regenerate Prisma client
npm run db:generate
```

### Data Issues
```bash
# Reset and reseed
npm run db:push -- --accept-data-loss
npm run db:seed
```

## Next Steps

1. ✅ Backend infrastructure complete
2. ✅ All frontend pages connected to API
3. ✅ Database seeded with sample data
4. 🔄 Ready for production deployment
5. 🚀 Add real-time updates (WebSocket) - optional enhancement
6. 🚀 Add user authentication - optional enhancement
7. 🚀 Add bet placement API - optional enhancement

## Support

For issues or questions:
1. Check API endpoint logs
2. Verify environment variables
3. Check database connection
4. Review Prisma schema

---

**Built with Next.js 15, Prisma, and Supabase - Production Ready** 🚀
