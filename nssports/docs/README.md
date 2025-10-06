# NSSPORTS Documentation

Welcome to the NSSPORTS documentation. This directory contains comprehensive technical documentation for the NSSPORTS sports betting platform.

---

## 📚 Documentation Structure

### Core Documentation

- **[ABSOLUTE_ZERO_REPORT.md](./ABSOLUTE_ZERO_REPORT.md)** - Comprehensive transformation report documenting the achievement of Absolute Zero Standard
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture, data flow, and technical decisions
- **[GOLD_STANDARD_QUICK_REFERENCE.md](./GOLD_STANDARD_QUICK_REFERENCE.md)** - Quick reference guide for development

### Legacy Reports (Archive)

The `archive/` directory contains historical implementation reports from previous transformation phases:

- Gold Standard Report
- Platinum Standard Report
- Refactor Summary
- Visual Verification Report
- Custom BetSlip Implementation
- Live Data Store Architecture
- The Odds API Integration
- Technical Implementation Details

These documents are preserved for historical reference but may contain outdated information. Refer to the core documentation above for current architecture and implementation details.

---

## 🚀 Quick Start

1. **New to NSSPORTS?** Start with [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
2. **Development?** Use [GOLD_STANDARD_QUICK_REFERENCE.md](./GOLD_STANDARD_QUICK_REFERENCE.md)
3. **Transformation Details?** Read [ABSOLUTE_ZERO_REPORT.md](./ABSOLUTE_ZERO_REPORT.md)

---

## 📖 Key Topics

### System Architecture
- Next.js 15.5.4 App Router
- Backend for Frontend (BFF) pattern
- State management with Zustand and React Query
- Authentication with NextAuth
- Caching strategies

### Data Flow
- External APIs (The Odds API, PostgreSQL)
- API Routes with server-side caching
- Client-side state management
- Real-time live data updates

### Security
- Middleware-based authentication
- CORS configuration
- Security headers
- Protected routes and API endpoints

### Performance
- Server Components by default
- Client Components for interactivity
- Multi-layer caching
- Optimized bundles

---

## 🛠️ Development

### Prerequisites
- Node.js >= 18.18.0
- npm >= 10.0.0
- PostgreSQL database

### Setup
```bash
# Install dependencies
npm install

# Setup database
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

### Code Quality
```bash
npm run typecheck  # TypeScript validation
npm run lint       # ESLint checks
npm run format     # Prettier formatting
npm test           # Run tests
```

---

## 📊 Current Status

### Build Status
✅ **Production Build:** Success  
✅ **TypeScript:** 0 errors  
✅ **Tests:** 21/21 passing  
✅ **ESLint:** 0 errors  

### Architecture Compliance
✅ **Next.js Best Practices:** Full compliance  
✅ **Type Safety:** Full TypeScript coverage  
✅ **Security:** Enterprise-grade  
✅ **Performance:** Optimized bundles  
✅ **Testing:** Comprehensive coverage  

---

## 📝 Contributing

When contributing to NSSPORTS:

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
2. Follow the established patterns and conventions
3. Maintain type safety with TypeScript
4. Write tests for new functionality
5. Update documentation as needed

---

## 🔗 External References

### Official Next.js Documentation
- [App Router](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-and-client-components)
- [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Authentication](https://nextjs.org/docs/app/guides/authentication)
- [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

### Key Dependencies
- [React Query](https://tanstack.com/query/latest)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [NextAuth.js](https://next-auth.js.org/)
- [Prisma](https://www.prisma.io/docs)
- [The Odds API](https://the-odds-api.com/liveapi/guides/v4/)

---

## 📅 Version History

- **January 2025** - Absolute Zero Standard achieved
- **January 2025** - Platinum Standard implementation
- **January 2025** - Gold Standard transformation
- **2024** - Initial Next.js refactor

---

**Maintained by:** NSSPORTS Development Team  
**Last Updated:** January 2025  
**Version:** 1.0.0
