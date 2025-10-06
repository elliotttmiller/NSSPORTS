# NSSPORTS Architecture

**Last Updated:** January 2025  
**Architecture:** Next.js 15.5.4 App Router with TypeScript

---

## System Overview

NSSPORTS is a professional sports betting platform built with Next.js 15.5.4 App Router. The application follows enterprise-grade patterns and official Next.js best practices.

### Core Features

- 🎮 Multi-sport support (NFL, NBA, NHL)
- 📊 Live game tracking with real-time odds
- 💰 Comprehensive betting (Spread, Moneyline, Totals)
- 📱 Responsive mobile-first design
- 🎯 Single and parlay bet support
- 📈 Betting history and performance tracking
- ⚡ Fast performance with optimized bundles
- 🔐 Secure authentication with NextAuth.js

---

## Technology Stack

### Core Framework
- **Next.js 15.5.4** - App Router with Server Components
- **React 19.1.0** - UI library
- **TypeScript 5** - Type safety

### State Management
- **Zustand 5.0.8** - Global client state (live data)
- **React Query 5.90.2** - Server state management
- **React Context** - Bet slip and navigation state

### Styling
- **Tailwind CSS 4** - Utility-first CSS
- **CSS Variables** - Theme system
- **Framer Motion 12** - Animations

### Backend
- **PostgreSQL** - Database
- **Prisma 6.16.3** - ORM and migrations
- **NextAuth 5.0** - Authentication
- **The Odds API** - Live sports data

### Development
- **ESLint 9** - Code linting
- **Prettier 3** - Code formatting
- **Jest 30** - Unit testing
- **TypeScript** - Type checking

---

## Project Structure

```
nssports/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (routes)/                  # Application routes
│   │   │   ├── page.tsx              # Homepage (trending + stats)
│   │   │   ├── loading.tsx           # Loading UI
│   │   │   ├── error.tsx             # Error boundary
│   │   │   ├── games/                # Games listing
│   │   │   ├── live/                 # Live games
│   │   │   ├── my-bets/              # Bet history
│   │   │   ├── account/              # User account
│   │   │   └── auth/                 # Login/register
│   │   ├── api/                       # API Routes (BFF Pattern)
│   │   │   ├── account/              # Account management
│   │   │   ├── auth/                 # Authentication
│   │   │   ├── games/                # Game data
│   │   │   ├── matches/              # Live matches
│   │   │   └── my-bets/              # Bet placement/history
│   │   ├── actions/                   # Server Actions
│   │   │   └── bets.ts               # Bet mutations
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Global styles
│   ├── components/                    # React components
│   │   ├── bets/                     # Bet-related components
│   │   ├── features/                 # Feature components
│   │   │   ├── games/                # Game components
│   │   │   ├── mobile/               # Mobile-specific
│   │   │   └── props/                # Prop betting
│   │   ├── layouts/                  # Layout components
│   │   ├── panels/                   # Side panels
│   │   ├── providers/                # Context providers
│   │   ├── ui/                       # UI primitives
│   │   └── ErrorBoundary.tsx         # Global error boundary
│   ├── context/                       # React Context
│   │   ├── BetSlipContext.tsx        # Bet slip state
│   │   ├── BetHistoryContext.tsx     # Bet history
│   │   └── NavigationContext.tsx     # Navigation state
│   ├── hooks/                         # Custom React hooks
│   │   ├── useAccount.ts             # Account data
│   │   ├── useBetHistory.ts          # Bet history
│   │   └── useStableLiveData.ts      # Live data
│   ├── lib/                           # Utility libraries
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── authHelpers.ts            # Auth utilities
│   │   ├── apiResponse.ts            # API response utilities
│   │   ├── logger.ts                 # Structured logging
│   │   ├── prisma.ts                 # Prisma client
│   │   ├── the-odds-api.ts           # Odds API client
│   │   ├── formatters.ts             # Data formatters
│   │   ├── schemas/                  # Zod validation schemas
│   │   └── transformers/             # Data transformers
│   ├── services/                      # API service layer
│   │   └── api.ts                    # Client API wrapper
│   ├── store/                         # Zustand stores
│   │   └── liveDataStore.ts          # Live data store
│   ├── types/                         # TypeScript types
│   │   └── index.ts                  # Type definitions
│   └── middleware.ts                  # Next.js middleware
├── prisma/                            # Database
│   ├── schema.prisma                 # Database schema
│   ├── seed.ts                       # Seed data
│   └── migrations/                   # Database migrations
├── public/                            # Static assets
│   ├── manifest.webmanifest          # PWA manifest
│   └── icons/                        # App icons
├── docs/                              # Documentation
├── next.config.ts                     # Next.js config
├── tsconfig.json                      # TypeScript config
├── eslint.config.mjs                  # ESLint config
├── jest.config.ts                     # Jest config
└── package.json                       # Dependencies
```

---

## Data Flow Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     NSSPORTS Data Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  External Data Sources                                       │
│  ├── The Odds API (live sports data)                        │
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

### Data Flow Details

1. **External APIs → BFF Layer**
   - The Odds API provides live sports data
   - PostgreSQL stores user data and bet history
   - API routes act as BFF proxy

2. **BFF Layer → State Management**
   - Server-side caching with `unstable_cache`
   - React Query manages client-side server state
   - Zustand manages global client state

3. **State Management → UI**
   - Server Components for static content
   - Client Components for interactive UI
   - Automatic re-renders on state changes

---

## Authentication Flow

### NextAuth Implementation

```
User Login
    ↓
Credentials Provider (username/password)
    ↓
Database Validation (bcrypt)
    ↓
JWT Token Generation (30-day expiration)
    ↓
Session Cookie Set
    ↓
Middleware Protection
    ↓
Authenticated Routes Access
```

### Protected Routes

**Pages:**
- `/` - Homepage (requires auth)
- `/my-bets` - Bet history (requires auth)
- `/account` - Account management (requires auth)

**API Routes:**
- `/api/my-bets` - Bet operations (requires auth)
- `/api/account` - Account operations (requires auth)

**Middleware Configuration:**
```typescript
export const config = {
  matcher: [
    '/api/:path*',
    '/',
    '/my-bets/:path*',
    '/account/:path*',
  ],
};
```

---

## Caching Strategy

### Server-Side Caching

**The Odds API (Live Data):**
```typescript
const getCachedOdds = unstable_cache(
  async (sportKey: string) => {
    return await getOdds(sportKey, options);
  },
  ["odds-api-matches"],
  { revalidate: 60, tags: ["matches"] }
);
```

**Database Queries:**
```typescript
export const revalidate = 30; // Revalidate every 30 seconds
```

### Client-Side Caching

**React Query Configuration:**
```typescript
{
  staleTime: 30 * 1000,        // 30 seconds
  cacheTime: 5 * 60 * 1000,    // 5 minutes
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
}
```

---

## State Management Architecture

### Zustand (Global Live Data)

**Purpose:** Single source of truth for live game data

**Store Structure:**
```typescript
interface LiveDataState {
  liveGames: Game[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number;
  setLiveGames: (games: Game[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
```

### React Query (Server State)

**Purpose:** Manage server state with automatic caching and refetching

**Queries:**
- `useBetHistory` - Fetch bet history
- `useAccount` - Fetch account data
- `useGames` - Fetch games list

### React Context (UI State)

**Contexts:**
- `BetSlipContext` - Bet slip state and operations
- `BetHistoryContext` - Bet history with React Query
- `NavigationContext` - Navigation state

---

## API Architecture

### Backend for Frontend (BFF) Pattern

All API routes follow the BFF pattern:

1. **Proxy External APIs**
   - Hide API keys from client
   - Transform data to internal format
   - Add server-side caching

2. **Consistent Error Handling**
   ```typescript
   export async function GET(request: NextRequest) {
     return withErrorHandling(async () => {
       const data = await fetchData();
       return successResponse(data);
     });
   }
   ```

3. **Authentication Layer**
   - Middleware validates sessions
   - Protected routes return 401 if unauthenticated
   - User ID attached to requests

4. **Response Format**
   ```typescript
   {
     success: true,
     data: { /* response data */ },
     metadata?: { /* pagination, etc */ }
   }
   ```

---

## Security Architecture

### Layers of Security

1. **Middleware** - First line of defense
   - CORS validation
   - Authentication check
   - Request sanitization

2. **API Routes** - Business logic security
   - Input validation with Zod
   - Authorization checks
   - Rate limiting ready

3. **Database** - Data layer security
   - Prepared statements (Prisma)
   - User isolation
   - Connection pooling

### Security Headers

Configured in `next.config.ts`:
```typescript
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'origin-when-cross-origin',
}
```

---

## Performance Optimizations

### Build Optimizations

- **Turbopack** - Fast dev and build
- **Code Splitting** - Automatic by Next.js
- **Tree Shaking** - Remove unused code
- **Minification** - Smaller bundles

### Runtime Optimizations

- **Server Components** - Reduce client JS
- **Caching** - Minimize API calls
- **React Query** - Smart refetching
- **Font Optimization** - next/font

### Bundle Analysis

```
First Load JS shared by all      260 kB
├ chunks/150316a471952cee.js    59.2 kB
├ chunks/3a20fa05e6c0b5f3.js    28.8 kB
├ chunks/3e23a394b5ecb929.js    12.6 kB
└ ...
```

---

## Testing Architecture

### Test Structure

```
src/
├── __tests__/                  # Integration tests
├── context/
│   └── BetSlipContext.test.tsx
├── lib/
│   ├── the-odds-api.test.ts
│   └── transformers/
│       ├── game.test.ts
│       └── odds-api.test.ts
```

### Testing Tools

- **Jest 30** - Test runner
- **Testing Library** - React component testing
- **TypeScript** - Type-safe tests

### Coverage

- ✅ Context hooks
- ✅ Data transformers
- ✅ API integrations
- ✅ Utility functions

---

## Deployment Architecture

### Production Configuration

**Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Authentication
NEXTAUTH_URL=https://...
NEXTAUTH_SECRET=...

# External APIs
THE_ODDS_API_KEY=...

# CORS
ALLOWED_ORIGINS=https://...
```

**Build Command:**
```bash
npm run build
```

**Start Command:**
```bash
npm start
```

### Recommended Platforms

- **Vercel** - Optimal for Next.js
- **Railway** - Easy PostgreSQL hosting
- **Fly.io** - Global edge deployment

---

## Monitoring & Logging

### Structured Logging

**Logger Configuration:**
```typescript
export const logger = {
  info: (message: string, data?: any) => void,
  warn: (message: string, data?: any) => void,
  error: (message: string, error?: any) => void,
};
```

**Production Logging:**
- JSON structured logs
- Environment-aware levels
- Request tracking helpers
- Performance monitoring

### Error Tracking

**Error Boundaries:**
- Global error boundary in layout
- Route-level error boundaries
- API error handling

**Recommended Tools:**
- Sentry for production errors
- Vercel Analytics for performance
- PostgreSQL logs for database issues

---

## Scalability Considerations

### Current Architecture Supports

- **Horizontal Scaling** - Stateless API routes
- **Database Pooling** - Prisma connection management
- **CDN Delivery** - Static assets
- **Edge Functions** - Middleware runs on edge

### Future Enhancements

1. **Redis Caching** - Faster data access
2. **WebSocket** - Real-time updates
3. **Queue System** - Background jobs
4. **Microservices** - Service separation

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Setup database
npm run db:push
npm run db:seed

# Start dev server
npm run dev
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Formatting
npm run format

# Testing
npm test
```

### Git Workflow

1. Feature branch from `main`
2. Implement changes
3. Run tests and linting
4. Commit with conventional commits
5. Open pull request
6. Code review
7. Merge to `main`

---

## Conclusion

The NSSPORTS architecture represents a modern, scalable, and maintainable Next.js application following industry best practices and official Next.js patterns.

**Key Architectural Decisions:**

✅ **App Router** - Modern Next.js architecture  
✅ **Server Components** - Reduced client JS  
✅ **BFF Pattern** - Secure API proxy  
✅ **Type Safety** - Full TypeScript coverage  
✅ **State Management** - Zustand + React Query  
✅ **Authentication** - NextAuth with middleware  
✅ **Caching** - Multi-layer caching strategy  
✅ **Testing** - Comprehensive test coverage  

---

**Last Updated:** January 2025  
**Maintained by:** NSSPORTS Development Team
