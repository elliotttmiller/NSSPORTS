# Client Admin Dashboard

Complete administration interface for sportsbook operators with separate authentication system.

## 🎯 Overview

The Client Admin Dashboard is a **completely separate system** from the main betting platform, providing comprehensive management capabilities for:

- **Agent Management** - Create, manage, and monitor agent accounts with configurable limits
- **Player Management** - Direct player registration, supervision, and detailed analytics
- **Balance Oversight** - Unlimited balance adjustment capabilities with full audit trail
- **Reports & Analytics** - Financial reports, agent performance metrics, player analytics
- **System Configuration** - Platform-wide settings and operational parameters
- **Security & Audit** - Comprehensive activity logging and security monitoring

## 🔐 Authentication

The admin dashboard uses a **separate authentication system** with dedicated login:

- **Endpoint**: `/admin/login`
- **Isolated Sessions**: Admin sessions are completely separate from player sessions
- **JWT-based**: Secure HTTP-only cookies with 8-hour expiration
- **Activity Logging**: All login attempts and admin actions are logged

## 🏗️ Architecture

### Separate Database Models

The admin system uses dedicated Prisma models:

```prisma
- AdminUser       // Admin accounts (superadmin, admin)
- Agent           // Agent accounts with limits and permissions
- Player          // Player accounts managed by agents
- PlayerBet       // Betting activity tracking
- PlayerTransaction // Balance transactions and history
- AgentBalanceLog // Agent adjustment history
- AdminActivityLog // Complete audit trail
```

### API Routes

All admin endpoints are under `/api/admin/*`:

```
/api/admin/auth/
  - login       POST   // Admin authentication
  - session     GET    // Verify session
  - logout      POST   // End session

/api/admin/dashboard/
  - metrics     GET    // Real-time platform metrics
  - activity    GET    // Recent activity feed

/api/admin/agents/
  - list        GET    // Get all agents
  - create      POST   // Create new agent
  - [id]        GET    // Agent details
  - [id]/update PUT    // Update agent
  - [id]/status PUT    // Suspend/activate

/api/admin/players/
  - list        GET    // Get all players (with filters)
  - create      POST   // Direct player registration
  - [id]        GET    // Player details
  - [id]/update PUT    // Update player
  - [id]/status PUT    // Suspend/activate

/api/admin/balances/
  - adjust      POST   // Adjust player balance (unlimited)
  - summary     GET    // Platform balance overview

/api/admin/reports/
  - financial   GET    // Financial reports
  - agents      GET    // Agent performance
  - players     GET    // Player analytics

/api/admin/config/
  - get         GET    // Get configuration
  - update      PUT    // Update configuration

/api/admin/security/
  - audit-logs  GET    // Audit trail
  - security    GET    // Security dashboard
```

## 📊 Dashboard Features

### 1. Dashboard Overview (`/admin/dashboard`)

Real-time metrics displayed in card format:

**Platform Activity**
- Total Active Players
- Online Players Now (live indicator)
- Active Bets
- Today's GGR

**Agent Performance**
- Total Agents
- Active Agents
- Total Adjustments
- Pending Approvals

**Financial Summary**
- Total Platform Balance
- Today's Revenue
- Today's Payouts
- Net Profit

**System Health**
- System Status
- API Response Time
- Database Status
- Active Sessions

**Recent Activity Feed**
- Real-time activity updates (auto-refresh every 10s)
- Agent actions, player bets, system events
- Color-coded by activity type
- Detailed timestamps

### 2. Agent Management (`/admin/agents`)

**Agent List View**
- Stats cards: Total Agents, Active, Suspended, Total Adjustments
- Search and filter capabilities
- Sortable table with columns:
  - Username
  - Status (active/suspended)
  - Players (count)
  - Last Active
  - Daily Adjustments (used/limit)
  - Actions (view, suspend/activate)

**Create Agent** (`/admin/agents/create`)
- Account information (username, password, display name)
- Password generator tool
- Operational limits configuration:
  - Max Single Adjustment ($1,000 default)
  - Daily Adjustment Limit ($5,000 default)
- Permissions selection
- Advanced settings (require approval, notifications)

### 3. Player Management (`/admin/players`)

**Player List View**
- Stats cards: Total Players, Active, Suspended, Idle 30+ Days
- Advanced filtering:
  - Status (all/active/suspended/idle)
  - Balance ranges ($100+, $500+, $1000+)
  - Agent assignment
- Sortable table with columns:
  - Username
  - Agent
  - Status
  - Balance
  - Total Bets
  - Last Bet
  - Actions (view, suspend/activate)

**Create Player** (`/admin/players/create`)
- Account information (username, password, display name)
- Agent assignment
- Balance & limits configuration:
  - Starting balance
  - Max bet amount ($10,000 default)
  - Max daily bets (50 default)

### 4. Balance Oversight (`/admin/balances`)

**Balance Overview**
- Summary cards:
  - Total Platform Balance
  - Today's Deposits
  - Today's Withdrawals
  - Net Movement

**Balance Adjustment Interface**
- Player search
- Adjustment type selection (deposit/withdrawal/correction)
- Unlimited amount capability (admin privilege)
- Required reason field for audit trail
- Warning confirmation before execution
- All adjustments logged immediately

**Recent Adjustments Table**
- Adjuster username
- Player affected
- Type (deposit/withdrawal/correction)
- Amount
- Reason
- Timestamp

### 5. Reports & Analytics (`/admin/reports`)

**Report Type Selection**
- Financial Reports (revenue, payouts, profit)
- Agent Performance Reports
- Player Activity Analytics
- System Health Metrics

**Report Parameters**
- Date range selector (from/to)
- Report format (CSV, PDF)
- Generate and export capabilities

**Report Previews**
- Financial: Revenue, payouts, net profit with growth percentages
- Agents: Active count, adjustments, top performers
- Players: Total/active players, bets placed, avg bet amount
- System: Uptime, response time, API calls

### 6. System Configuration (`/admin/config`)

**Agent Defaults**
- Max Single Adjustment ($)
- Daily Adjustment Limit ($)
- Require approval for large adjustments

**Player Settings**
- Minimum bet amount
- Maximum bet amount
- Default starting balance
- Account activation requirements

**System Configuration**
- API rate limit (requests/min)
- Session timeout (hours)
- Maintenance mode toggle
- Registration enabled/disabled

**Security Settings** (Coming Soon)
- Password policies
- 2FA configuration
- IP restrictions

### 7. Security & Audit (`/admin/security`)

**Security Metrics**
- System Status (secure/warning/critical)
- Active Sessions
- Failed Logins (24h)
- Locked Accounts

**Audit Log Filters**
- Search by user, action, or resource
- Filter by status (success/failure/warning)
- Filter by action type (login/balance/config)
- Refresh button for latest logs

**Audit Log Table**
- Timestamp
- User (with role badge)
- Action performed
- Resource affected
- IP Address
- Status (with icon)
- Details

All admin actions are automatically logged:
- Login/logout events
- Balance adjustments
- Agent/player creation/updates
- Configuration changes
- Failed authentication attempts
- Active Agents Today
- New Players (Today)
- Agent Activity Score

**Financial Summary**
- Total Platform Balance
- Today's Deposits
- Today's Withdrawals
- Net Movement (with trend indicator)

**System Health**
- Platform Uptime
- API Response Time
- Active Sessions
- System Load

**Activity Feed**
- Real-time activity stream
- Auto-refresh every 10 seconds
- Filterable by type (agent/player/system)

### 2. Agent Management (`/admin/agents`)

**Agent List Table**
- Sortable columns: Username, Status, Players, Last Active, Daily Adjustments
- Status indicators: Active (green), Idle (yellow), Suspended (red)
- Quick actions: Edit, View Details, Suspend/Activate

**Create New Agent Form**
- Username (unique, required)
- Display Name (optional)
- Temporary Password (auto-generate or custom)
- Operational Limits:
  - Max Single Adjustment (default: $1,000)
  - Daily Adjustment Limit (default: $5,000)
  - Can Suspend Players (checkbox)
  - Commission Rate (optional %)
- Advanced Settings:
  - IP Restriction (optional)
  - Region Assignment (optional)
  - Internal Notes

**Agent Detail View**
- Overview stats (created date, last login, total players)
- Performance metrics (7-day and lifetime)
- Player list (all players under this agent)
- Activity log (recent actions)
- Edit/Reset Password/Suspend actions

### 3. Player Management (`/admin/players`)

**Advanced Player List**
- Filters:
  - By Agent
  - By Status (Active, Suspended, Idle)
  - By Balance Range
  - By Activity (Active Today, Inactive 7d+)
- Columns: Username, Agent, Status, Balance, Last Bet, Registered Date
- Actions: View Details, Adjust Balance, Suspend/Activate

**Direct Player Registration**
- Account Details (username, password)
- Agent Assignment (dropdown of active agents or "Unassigned")
- Initial Balance (optional)
- Betting Limits (Standard or Custom)
- Status (Active or Pending Verification)

**Player Detail View**
- Account Information (full details)
- Betting Activity Stats
  - Total Bets, Total Wagered, Total Winnings
  - Net Profit/Loss
  - Favorite Sport
- Current Active Bets (live list)
- Transaction History (last 10, with View All option)
- Actions: Adjust Balance, Reset Password, Suspend, View Full History

### 4. Balance Oversight (`/admin/balances`)

**Global Balance Dashboard**
- Total Platform Balance
- Average Player Balance
- Balance Distribution Chart
- Daily Balance Movement Graph

**Recent Adjustments Table**
- All agent and admin adjustments
- Columns: Adjuster, Player, Type, Amount, Reason, Time
- Filterable by adjuster, type, date range

**Direct Balance Adjustment**
- Player Search (autocomplete)
- Current Balance Display
- Adjustment Type: Deposit, Withdrawal, Correction
- Amount (unlimited for admin)
- Reason (required for audit)
- Internal Notes (optional)
- Confirmation with preview of new balance
- Irreversible action warning

### 5. Reports & Analytics (`/admin/reports`)

**Financial Reports**
- Date Range Selector (Today, Yesterday, Last 7 Days, Custom)
- Metrics:
  - Total GGR
  - Total Deposits
  - Total Withdrawals
  - Net Revenue
- Export options: CSV, PDF

**Agent Performance Report**
- Top Agents by Player Registration
- Top Agents by Activity
- Agent Commission Summary
- Agent Efficiency Metrics
- Downloadable reports

**Player Activity Reports**
- Player Acquisition (new players over time)
- Player Retention Rates
- Churn Analysis
- Lifetime Value Calculations
- Betting Analytics:
  - Most Popular Sports
  - Betting Patterns
  - Win/Loss Ratios
  - Peak Activity Times

### 6. System Configuration (`/admin/config`)

**Agent Defaults**
- Default Max Single Adjustment
- Default Daily Adjustment Limit
- Default Commission Rate
- Auto-lock Inactive Agents (days)

**Player Settings**
- Default Betting Limits
- Auto-suspend Inactive Players (days)
- KYC Verification Required (Yes/No)
- Welcome Message Template

**System Parameters**
- Session Timeout (hours)
- Password Policy
- Failed Login Attempts Limit
- Maintenance Mode Toggle

### 7. Security & Audit (`/admin/security`)

**Audit Logs**
- Comprehensive activity log
- Filters:
  - User Type (All, Agents, Players, Admin, System)
  - Action Type (Registration, Balance, Betting, System)
  - Date Range
  - Specific User Search
- Columns: Time, User, Action, Details
- Export audit trail

**Security Dashboard**
- Login Activity (24h)
  - Successful Logins
  - Failed Login Attempts
  - Locked Accounts
  - Suspicious Activity Alerts
- System Security Status
  - Last Security Scan
  - Vulnerabilities Count
  - SSL Certificate Status
  - Firewall Status
- Actions: Run Security Scan, View Security Logs

## 🚀 Setup Instructions

### 1. Run Setup Script

```powershell
# From project root
.\scripts\setup-admin-dashboard.ps1
```

This script will:
1. Generate Prisma client with new models
2. Create database migration
3. Apply migration to database
4. Create initial admin user

### 2. Default Admin Credentials

```
Username: admin
Password: Admin123!
```

**⚠️ IMPORTANT: Change this password immediately after first login!**

### 3. Access Dashboard

Navigate to: `http://localhost:3000/admin/login`

### 4. Environment Variables

Add to your `.env` file:

```env
# Admin Dashboard JWT Secret (change in production!)
ADMIN_JWT_SECRET=your-secure-admin-jwt-secret-key-here
```

## 🔒 Security Features

### Authentication
- Separate JWT tokens for admin sessions
- HTTP-only cookies (not accessible via JavaScript)
- 8-hour session expiration
- Automatic logout on token expiration
- Failed login attempt tracking

### Authorization
- Role-based access (superadmin vs admin)
- Per-route authorization checks
- Agent permission enforcement (can't exceed limits)
- Admin has unlimited permissions

### Audit Trail
- Every action is logged in `AdminActivityLog`
- Includes: who, what, when, where (IP), details
- Immutable log entries
- Searchable and exportable

### Data Protection
- Passwords hashed with bcrypt
- No plain-text sensitive data storage
- Secure session management
- HTTPS enforcement in production

## 🎨 UI/UX Design

### Design System
- Follows global application styling and theme
- Consistent with main platform design language
- Dark mode support
- Responsive design (mobile, tablet, desktop)
- Accessible (WCAG 2.1 AA compliant)

### Component Library
- Uses existing UI components from `/components/ui/`
- Custom admin-specific components in `/components/admin/`
- Lucide icons for consistency
- Shadcn/ui base components

### Layout
- Collapsible sidebar navigation (desktop)
- Mobile hamburger menu
- Persistent header with user info
- Breadcrumb navigation
- Quick action buttons

## 📱 Mobile Support

The dashboard is fully responsive with mobile-optimized views:

- Touch-friendly interface
- Mobile navigation menu
- Swipe gestures for tables
- Optimized metric cards for small screens
- Bottom navigation for key actions

## 🔄 Real-time Updates

### Auto-refresh Intervals
- Dashboard Metrics: 30 seconds
- Activity Feed: 10 seconds
- Agent/Player Lists: 60 seconds
- Reports: Manual refresh only

### WebSocket Events (Optional Future Enhancement)
```javascript
- platform.metrics.update
- agent.activity.new
- player.registration.new
- balance.adjustment.completed
- bet.placed.settlement
- system.alert.triggered
```

## 🧪 Testing

### Test Accounts

After setup, you can create test agents and players through the dashboard.

### API Testing

```bash
# Login as admin
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'

# Get dashboard metrics
curl http://localhost:3000/api/admin/dashboard/metrics \
  --cookie "admin_token=YOUR_TOKEN"
```

## 📝 Development Notes

### Adding New Admin Features

1. Create API route in `/app/api/admin/[feature]/`
2. Add authentication check using `verifyAdmin()` helper
3. Create UI component in `/components/admin/`
4. Add navigation item to `AdminDashboardLayout`
5. Update audit logging for new actions

### Database Migrations

When modifying admin models:

```bash
cd nssports
npx prisma migrate dev --name describe_your_change
npx prisma generate
```

### Debugging

- Check admin session: Visit `/api/admin/auth/session`
- View audit logs: Dashboard → Security & Audit
- Check Prisma Studio: `npx prisma studio`

## 🚨 Production Checklist

Before deploying to production:

- [ ] Change default admin password
- [ ] Update `ADMIN_JWT_SECRET` environment variable
- [ ] Enable HTTPS
- [ ] Configure CORS appropriately
- [ ] Set up database backups
- [ ] Enable rate limiting on auth routes
- [ ] Configure session timeout appropriately
- [ ] Review and test all permissions
- [ ] Set up monitoring and alerts
- [ ] Document operational procedures

## 📞 Support

For issues or questions regarding the admin dashboard:

1. Check the audit logs for error details
2. Review API responses in browser DevTools
3. Check Prisma query logs
4. Consult the main platform documentation

## 🎯 Future Enhancements

Planned features for future releases:

- [ ] Two-factor authentication for admin accounts
- [ ] Real-time WebSocket updates
- [ ] Advanced reporting with charts and graphs
- [ ] Email notifications for critical events
- [ ] Bulk operations for players and agents
- [ ] Custom dashboard widgets
- [ ] API key management for third-party integrations
- [ ] White-label customization options
- [ ] Multi-tenant support with tenant isolation
- [ ] Advanced fraud detection and alerts

---

© 2024 NorthStar Sports. All rights reserved.
