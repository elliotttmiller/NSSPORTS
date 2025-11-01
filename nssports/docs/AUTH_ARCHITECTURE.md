# Authentication Architecture

## Overview
NSSPORTS uses **two separate authentication systems** that are completely isolated from each other:

1. **User/Agent Authentication** - NextAuth v5 with JWT sessions
2. **Admin Authentication** - Custom JWT with HTTP-only cookies

## 🔐 System 1: User/Agent Authentication (NextAuth)

### Technology Stack
- **Framework**: NextAuth v5
- **Strategy**: JWT sessions
- **Database**: Prisma → `User` model
- **Session Duration**: 30 days
- **Cookie Name**: `authjs.session-token`

### Login Flow
```
User visits: / or any protected route
    ↓
Middleware checks NextAuth session
    ↓
No session? → Redirect to /auth/login
    ↓
User submits credentials
    ↓
POST /api/auth/callback/credentials
    ↓
NextAuth validates against User table
    ↓
Creates JWT session cookie
    ↓
Redirect to original page or /
```

### Routes
- **Login Page**: `/auth/login`
- **Register Page**: `/auth/register`
- **API Endpoints**: `/api/auth/*` (NextAuth handlers)
- **Protected Routes**: `/`, `/agent/*`, `/api/*` (except admin)

### User Types
- `player` - Regular betting users
- `agent` - Can manage players
- `client_admin` - Tenant admin
- `platform_admin` - System admin

### Configuration
- File: `src/lib/auth.ts`
- Environment: `AUTH_SECRET` or `NEXTAUTH_SECRET`

---

## 🔐 System 2: Admin Authentication (Custom JWT)

### Technology Stack
- **Framework**: Custom implementation using `jose`
- **Strategy**: JWT in HTTP-only cookies
- **Database**: Prisma → `AdminUser` model
- **Session Duration**: 8 hours
- **Cookie Name**: `admin_token`

### Login Flow
```
Admin visits: /admin or /admin/*
    ↓
Middleware checks admin_token cookie
    ↓
No token? → Redirect to /admin/login
    ↓
Admin submits credentials
    ↓
POST /api/admin/auth/login
    ↓
Validates against AdminUser table
    ↓
Creates JWT and sets admin_token cookie
    ↓
Redirect to /admin/dashboard
```

### Routes
- **Login Page**: `/admin/login`
- **API Endpoints**: `/api/admin/*`
- **Protected Routes**: `/admin/*` (except `/admin/login`)

### Admin Roles
- `admin` - Standard admin access
- `superadmin` - Full system access

### Configuration
- Files:
  - API: `src/app/api/admin/auth/login/route.ts`
  - Context: `src/context/AdminAuthContext.tsx`
  - Layout: `src/components/admin/AdminDashboardLayout.tsx`
- Environment: `ADMIN_JWT_SECRET`

---

## 🛡️ Middleware Protection Logic

### File: `src/middleware.ts`

```typescript
// STEP 1: Bypass static assets
if (static_asset) return next();

// STEP 2: Admin routes → Custom JWT check
if (pathname.startsWith('/admin')) {
  if (public_admin_route) return next();
  if (!admin_token) redirect('/admin/login');
  return next();
}

// STEP 3: User/Agent routes → NextAuth check
if (public_route || public_api) return next();
const session = await auth();
if (!session) redirect('/auth/login');
return next();
```

### Protection Rules

| Route Pattern | Auth System | Public? | Redirect On Fail |
|--------------|-------------|---------|-----------------|
| `/admin/login` | Admin (Custom) | ✅ Yes | N/A |
| `/admin/*` | Admin (Custom) | ❌ No | `/admin/login` |
| `/api/admin/auth/*` | Admin (Custom) | ✅ Yes | N/A |
| `/api/admin/*` | Admin (Custom) | ❌ No | `/admin/login` |
| `/auth/login` | NextAuth | ✅ Yes | N/A |
| `/auth/register` | NextAuth | ✅ Yes | N/A |
| `/api/auth/*` | NextAuth | ✅ Yes | N/A |
| `/` | NextAuth | ❌ No | `/auth/login` |
| `/agent/*` | NextAuth | ❌ No | `/auth/login` |
| `/api/*` | NextAuth | ❌ No | 401 Response |
| `/api/games/*` | None | ✅ Yes | N/A |
| `/api/live/*` | None | ✅ Yes | N/A |

---

## 🔧 Service Worker Configuration

### File: `public/sw.js`

The service worker **bypasses all authentication routes** to prevent redirect conflicts:

```javascript
// Skip these routes to allow middleware to handle auth
if (url.pathname === '/' ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/admin/login') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/admin/auth')) {
  return; // Let request go directly to server
}
```

This prevents the error:
```
"The FetchEvent for URL resulted in a network error response: 
a redirected response was used for a request whose redirect mode is not 'follow'"
```

---

## 🧪 Testing Authentication

### Test User/Agent Login
```bash
# Should redirect to /auth/login
curl http://localhost:3000/

# Should show login page
curl http://localhost:3000/auth/login
```

### Test Admin Login
```bash
# Should redirect to /admin/login
curl http://localhost:3000/admin/dashboard

# Should show admin login page
curl http://localhost:3000/admin/login

# Test admin API login
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 🚫 Common Pitfalls

### ❌ DON'T Mix Auth Systems
```typescript
// WRONG: Using NextAuth for admin routes
if (pathname.startsWith('/admin')) {
  const session = await auth(); // ❌ This checks User table, not AdminUser
}
```

### ✅ DO Keep Them Separate
```typescript
// CORRECT: Admin routes check admin_token cookie
if (pathname.startsWith('/admin')) {
  const adminToken = request.cookies.get('admin_token'); // ✅ Separate system
}
```

### ❌ DON'T Cache Auth Routes in Service Worker
```javascript
// WRONG: Caching can cause stale redirects
if (url.pathname === '/auth/login') {
  return caches.match(request); // ❌ May serve stale cached response
}
```

### ✅ DO Bypass Auth Routes in Service Worker
```javascript
// CORRECT: Let middleware handle auth routes
if (url.pathname.startsWith('/auth/')) {
  return; // ✅ Skip service worker, go to server
}
```

---

## 📝 Environment Variables

```bash
# NextAuth (User/Agent)
AUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Admin Custom JWT
ADMIN_JWT_SECRET="your-admin-secret-key"

# Database
DATABASE_URL="postgresql://..."
```

---

## 🔄 Session Management

### User/Agent Sessions
- **Storage**: JWT in HTTP-only cookie
- **Refresh**: Automatic (NextAuth handles)
- **Logout**: `signOut()` from `next-auth/react`

### Admin Sessions
- **Storage**: JWT in HTTP-only cookie
- **Refresh**: Manual (re-login after 8 hours)
- **Logout**: Clear `admin_token` cookie via `/api/admin/auth/logout`

---

## 📊 Database Schema

### User Table (NextAuth)
```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String
  userType  String   // player, agent, client_admin, platform_admin
  tenantId  String?
  isActive  Boolean  @default(true)
  // ... other fields
}
```

### AdminUser Table (Custom)
```prisma
model AdminUser {
  id       String   @id @default(cuid())
  username String   @unique
  password String
  role     String   // admin, superadmin
  status   String   // active, suspended
  // ... other fields
}
```

---

## 🎯 Best Practices

1. **Never mix authentication systems** - Always check which system applies to the current route
2. **Keep middleware logic separate** - Admin checks happen first, then user checks
3. **Service worker bypasses all auth** - Prevents redirect mode conflicts
4. **Use proper cookie names** - `authjs.session-token` vs `admin_token`
5. **Different JWT secrets** - `AUTH_SECRET` vs `ADMIN_JWT_SECRET`
6. **Clear error messages** - Specify which system failed authentication

---

## 📚 References

- [NextAuth.js v5 Documentation](https://authjs.dev/)
- [Next.js Middleware Guide](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
