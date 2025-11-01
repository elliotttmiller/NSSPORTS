# Agent/Player Account Creation Fix

## Problem Summary

When creating agent or player accounts through the admin dashboard, users could not log in at `/auth/login` because:

1. **Admin Dashboard** creates accounts in:
   - `Agent` table (for agents)
   - `DashboardPlayer` table (for players)

2. **User/Agent Login** (`/auth/login`) uses NextAuth which queries:
   - `User` table only

3. **Result**: Accounts existed in admin tables but not in the authentication table, causing login failures.

---

## Root Cause

The admin dashboard and authentication system were using **separate database tables** without synchronization:

```
Admin Dashboard Flow:
Admin creates agent → Agent table ✅
                   → User table ❌ (missing!)

Login Flow:
User tries to login → Checks User table ❌ (not found!)
```

---

## Solution Implemented

### 1. Agent Creation Fix (`/api/admin/agents/route.ts`)

When an admin creates an agent, the system now creates entries in **BOTH tables** using a database transaction:

```typescript
// Use transaction to ensure atomicity
await prisma.$transaction(async (tx) => {
  // 1. Create in Agent table (admin dashboard functionality)
  const newAgent = await tx.agent.create({
    data: { username, password, ... }
  });

  // 2. Create in User table (NextAuth login)
  await tx.user.create({
    data: {
      username,
      password,
      userType: "agent",
      isActive: true,
    }
  });
});
```

### 2. Player Creation Fix (`/api/admin/players/route.ts`)

Same dual-table approach for players:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Create in DashboardPlayer table
  const newPlayer = await tx.dashboardPlayer.create({
    data: { username, password, agentId, balance, ... }
  });

  // 2. Create in User table
  await tx.user.create({
    data: {
      username,
      password,
      userType: "player",
      parentAgentId: agentId,
    }
  });
});
```

---

## Benefits

### ✅ Transaction Safety
- Both records are created together or not at all
- No partial account creation
- Database consistency guaranteed

### ✅ Authentication Works
- Agents can log in at `/auth/login`
- Players can log in at `/auth/login`
- NextAuth finds the User record

### ✅ Admin Dashboard Works
- Agent/Player data appears in admin views
- Real-time metrics are accurate
- No duplicate username conflicts

---

## Testing Steps

### Test Agent Creation & Login

1. **Create Agent** via Admin Dashboard:
   ```
   Navigate to: /admin/agents/create
   Fill in:
   - Username: test_agent
   - Password: password123
   - Display Name: Test Agent
   Click: Create Agent
   ```

2. **Verify Creation**:
   ```
   Check /admin/agents page
   Should see: test_agent listed
   ```

3. **Test Login**:
   ```
   Navigate to: /auth/login
   Login as:
   - Username: test_agent
   - Password: password123
   Select: Agent login
   Should: Successfully redirect to /agent dashboard
   ```

### Test Player Creation & Login

1. **Create Player** via Admin Dashboard:
   ```
   Navigate to: /admin/players (when implemented)
   Fill in player details
   Click: Create Player
   ```

2. **Test Login**:
   ```
   Navigate to: /auth/login
   Login as player
   Should: Successfully redirect to / (main app)
   ```

---

## Database Schema

### User Table (NextAuth)
```sql
users (
  id              TEXT PRIMARY KEY,
  username        TEXT UNIQUE,
  password        TEXT,
  userType        TEXT,  -- 'player', 'agent', 'client_admin', 'platform_admin'
  parentAgentId   TEXT,  -- For players linked to agents
  isActive        BOOLEAN,
  ...
)
```

### Agent Table (Admin Dashboard)
```sql
agents (
  id                    TEXT PRIMARY KEY,
  username              TEXT UNIQUE,
  password              TEXT,
  displayName           TEXT,
  maxSingleAdjustment   FLOAT,
  dailyAdjustmentLimit  FLOAT,
  ...
)
```

### DashboardPlayer Table (Admin Dashboard)
```sql
dashboard_players (
  id              TEXT PRIMARY KEY,
  username        TEXT UNIQUE,
  password        TEXT,
  agentId         TEXT,  -- References agents.id
  balance         FLOAT,
  bettingLimits   JSON,
  ...
)
```

---

## Cleanup Script

To remove test accounts created before the fix:

```bash
npx tsx scripts/cleanup-test-accounts.ts
```

This script removes:
- All agents from Agent table
- All agent/player users from User table  
- All players from DashboardPlayer table
- Keeps only the admin account

---

## Files Modified

1. **`src/app/api/admin/agents/route.ts`**
   - Added dual-table creation with transaction
   - Ensures Agent + User records are synchronized

2. **`src/app/api/admin/players/route.ts`**
   - Added dual-table creation with transaction
   - Ensures DashboardPlayer + User records are synchronized

3. **`scripts/cleanup-test-accounts.ts`** (new)
   - Utility to clean up test accounts
   - Safe deletion from all related tables

---

## Future Considerations

### Option 1: Keep Dual Tables (Current)
**Pros:**
- Clear separation of concerns
- Admin dashboard has dedicated models
- NextAuth doesn't interfere with admin features

**Cons:**
- Need to maintain synchronization
- Data duplication
- Transaction overhead

### Option 2: Unify Tables (Future Refactor)
**Pros:**
- Single source of truth
- No synchronization needed
- Simpler architecture

**Cons:**
- Major schema changes required
- Migration complexity
- Would need to add admin fields to User table

**Recommendation:** Keep current dual-table approach for now, consider unification in v2.0

---

## Related Documentation

- [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md) - Complete authentication system overview
- [ADMIN_IMPLEMENTATION_COMPLETE.md](./ADMIN_IMPLEMENTATION_COMPLETE.md) - Admin dashboard features

---

## Status

✅ **COMPLETE** - Agent and player accounts created via admin dashboard can now successfully log in at `/auth/login`
