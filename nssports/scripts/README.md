# 🧹 Bet History Management Scripts

Quick scripts to manage user bet history for testing and development.

---

## 📜 Available Scripts

### 1️⃣ **Clear Bet History** (Simple)
```bash
cd nssports
npx tsx ../scripts/clearBetHistory.ts
```

**What it does:**
- ✅ Deletes ALL bets from ALL users
- ✅ Preserves user accounts
- ✅ Preserves user balances  
- ✅ Preserves user credentials
- ✅ Shows before/after statistics
- ✅ Asks for confirmation

**Skip confirmation:**
```bash
npx tsx ../scripts/clearBetHistory.ts --yes
```

---

### 2️⃣ **Clear Bet History** (Detailed Report)
```bash
cd nssports
npx tsx ../scripts/clearBetHistoryDetailed.ts
```

**What it does:**
- ✅ Shows detailed per-user bet statistics
- ✅ Displays pending, won, lost, pushed bets
- ✅ Shows total staked and potential payouts
- ✅ Deletes ALL bets after confirmation
- ✅ Preserves user accounts and balances

**Skip confirmation:**
```bash
npx tsx ../scripts/clearBetHistoryDetailed.ts --yes
```

---

### 3️⃣ **Update User Balance**
```bash
cd nssports
npx tsx ../scripts/updateBalance.ts
```

Manually adjust user account balances for testing.

---

## 🎯 Common Use Cases

### **Fresh Testing Start**
```bash
# Clear all bet history but keep users
cd nssports
npx tsx ../scripts/clearBetHistory.ts --yes

# Result: All users can start betting fresh
```

### **Audit Before Clearing**
```bash
# See detailed breakdown of all bets
cd nssports
npx tsx ../scripts/clearBetHistoryDetailed.ts

# Review the report, then confirm deletion
```

### **Quick Reset During Development**
```bash
cd nssports
npx tsx ../scripts/clearBetHistory.ts -y  # Short flag
```

---

## 📊 Example Output

### Simple Clear:
```
🧹 Starting Bet History Cleanup...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Current Statistics:
  Total Users: 5
  Total Bets: 47
    - Pending: 12
    - Settled: 35
  Total Amount Staked: $2,350.00

⚠️  WARNING: This action cannot be undone!
⚠️  All bet history will be permanently deleted.
✅ User accounts and balances will NOT be affected.

Are you sure you want to delete ALL bet history? (yes/no): yes

🗑️  Deleting all bets...

✅ Successfully deleted 47 bets!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Updated Statistics:
  Total Users: 5 (unchanged ✓)
  Total Bets: 0
  Total Amount Staked: $0.00

📋 Summary:
  ✅ Deleted: 47 bets
  ✅ Preserved: 5 user accounts
  ✅ Preserved: All user balances
  ✅ Preserved: All user credentials

🎯 Your application is ready for fresh testing!
   Users can now place bets with a clean slate.
```

### Detailed Report:
```
📊 DETAILED BET HISTORY REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 Users with Bet History: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 User: john_doe
   Name: John Doe
   User ID: clx1234567890
   Current Balance: $1,250.00
   ────────────────────────────────────────────────────────────────────────────
   📊 Bet Statistics:
      Total Bets: 15
      ├─ Pending: 5
      ├─ Won: 7
      ├─ Lost: 2
      └─ Pushed: 1
   💰 Financial:
      Total Staked: $750.00
      Potential Payout (pending): $425.00

👤 User: jane_smith
   Name: Jane Smith
   User ID: clx0987654321
   Current Balance: $2,100.50
   ────────────────────────────────────────────────────────────────────────────
   📊 Bet Statistics:
      Total Bets: 23
      ├─ Pending: 8
      ├─ Won: 12
      ├─ Lost: 3
      └─ Pushed: 0
   💰 Financial:
      Total Staked: $1,150.00
      Potential Payout (pending): $890.50

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 OVERALL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Bets Across All Users: 38
  ├─ Pending: 13
  ├─ Won: 19
  ├─ Lost: 5
  └─ Pushed: 1

Total Amount Staked: $1,900.00
Total Potential Payout: $1,315.50

⚠️  WARNING: This will permanently delete all bet history!
⚠️  User accounts, balances, and credentials will NOT be affected.

Delete all bet history? (yes/no):
```

---

## ⚠️ Important Notes

### **What Gets Deleted:**
- ✅ All bets (pending, won, lost, pushed)
- ✅ All bet history records
- ✅ All idempotency keys

### **What Gets Preserved:**
- ✅ User accounts (id, username, password)
- ✅ User balances (account table)
- ✅ User credentials (can still login)
- ✅ User profile data (name, image, etc.)
- ✅ Games, odds, props data
- ✅ Teams, leagues, players data

### **When to Use:**
- 🧪 Testing bet placement workflow
- 🧪 Testing bet settlement logic
- 🧪 Debugging bet validation rules
- 🧪 Performance testing with fresh state
- 🧪 Demo/presentation preparation

### **When NOT to Use:**
- ❌ Production environment
- ❌ When you need bet history for analysis
- ❌ When users have real money at stake

---

## 🔒 Safety Features

1. **Confirmation Required** - Must type "yes" to proceed (unless `--yes` flag)
2. **Detailed Statistics** - See exactly what will be deleted
3. **Preserved Data** - User accounts and balances are never touched
4. **Audit Trail** - Terminal output shows before/after stats

---

## 🛠️ Troubleshooting

### **Error: Cannot find module '@prisma/client'**
```bash
cd nssports
npm install
npx prisma generate
```

### **Error: Database connection failed**
```bash
# Check your .env file has DATABASE_URL
cd nssports
cat .env | grep DATABASE_URL
```

### **Script hangs at confirmation**
```bash
# Use --yes flag to skip
npx tsx ../scripts/clearBetHistory.ts --yes
```

---

## 📚 Related Scripts

- **Clear Cache** - `npx tsx clear-cache.ts` (clears games/odds)
- **Update Balance** - `npx tsx ../scripts/updateBalance.ts`
- **Database Seed** - `npm run db:seed`
- **Database Reset** - `npm run db:reset` (⚠️ deletes everything!)

---

**✅ Ready to clear bet history and start fresh testing!**
