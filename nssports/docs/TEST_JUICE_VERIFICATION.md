# Testing Juice Configuration on Game Cards

## ✅ How to Verify Juice is Working

### Method 1: Check Browser Console (Easiest)

1. **Open your app** at `http://localhost:3000/games`
2. **Open Browser DevTools** (F12)
3. **Go to Console tab**
4. **Look for logs** containing `[OddsJuice]` - you'll see:
   ```
   [OddsJuice] Configuration cache invalidated
   [OddsJuice] Applied juice to odds { fairOdds: -110, juicedOdds: -115, margin: 0.045 }
   ```

### Method 2: Compare Odds Before/After Configuration Change

**Step 1: Note Current Odds**
1. Go to `/games` and pick any game
2. Note the spread odds (e.g., `-110 / -110`)

**Step 2: Increase Juice**
1. Go to `/admin/odds-config`
2. Change Spread Margin from `4.5%` to `10%`
3. Click "Save Configuration"
4. You'll see: `✅ Juice configuration saved successfully!`

**Step 3: Verify Change**
1. Go back to `/games`
2. Refresh the page
3. The same game's odds should now be different (e.g., `-120 / -120`)
4. **The difference shows your juice is working!**

### Method 3: API Response Inspection

1. **Open DevTools Network tab**
2. **Go to `/games`**
3. **Find the API call** to `/api/games`
4. **Click on it and view Response**
5. **Look for odds structure** - you should see juiced odds applied

Example response:
```json
{
  "odds": {
    "spread": {
      "home": { "odds": -115, "line": -7.5 },
      "away": { "odds": -115, "line": 7.5 }
    }
  }
}
```

---

## 🧪 Testing Different Margins

### Test 1: Aggressive Juice (High Margins)
```
Spread: 10%
Moneyline: 12%
Total: 10%
```
**Expected**: Most odds move from -110 to -120 or worse

### Test 2: Standard Book (Normal Margins)
```
Spread: 4.5%
Moneyline: 5%
Total: 4.5%
```
**Expected**: Odds around -110 to -115

### Test 3: Player-Friendly (Low Margins)
```
Spread: 2%
Moneyline: 2.5%
Total: 2%
```
**Expected**: Odds very close to -110

### Test 4: Live Game Multiplier
```
Live Game Multiplier: 1.5 (50% increase)
```
1. Go to `/live` page
2. Odds on live games should be worse than pre-game
3. Compare a live game vs upcoming game with same base odds

---

## 🔍 Visual Verification on Game Cards

### What You Should See:

**Before Juice (Fair Odds from API):**
```
LAL -7.5 @ -110
BOS +7.5 @ -110
```

**After 4.5% Juice Applied:**
```
LAL -7.5 @ -115
BOS +7.5 @ -115
```

**After 10% Juice Applied:**
```
LAL -7.5 @ -125
BOS +7.5 @ -125
```

---

## 🎯 Quick Test Steps (2 minutes)

1. **Navigate to Admin Odds Config**
   - Go to `http://localhost:3000/admin/odds-config`

2. **Set Extreme Margins** (to make change obvious)
   - Spread Margin: `15%`
   - Moneyline Margin: `15%`
   - Total Margin: `15%`
   - Click "Save Configuration"

3. **View Games**
   - Go to `http://localhost:3000/games`
   - You should see odds like `-130`, `-135`, `-140` instead of `-110`

4. **Reset to Normal**
   - Go back to `/admin/odds-config`
   - Set margins back to:
     - Spread: `4.5%`
     - Moneyline: `5%`
     - Total: `4.5%`
   - Click "Save Configuration"

5. **Refresh Games**
   - Odds should return to normal around `-110` to `-115`

---

## 📊 Expected Behavior

### Juice Application Flow:
```
API Returns Fair Odds (-110)
         ↓
Juice Service Applies Margin (4.5%)
         ↓
Game Card Displays (-115)
         ↓
User Sees Your Custom Odds
```

### League-Specific Override Example:
```
Global Spread: 4.5%
NBA Override: 6%

NFL Game Spread: -115 (4.5% applied)
NBA Game Spread: -120 (6% applied)
```

---

## ✅ Success Indicators

You know juice is working when:
- ✅ Changing margins in admin immediately affects displayed odds
- ✅ Different leagues can have different odds (if overrides set)
- ✅ Live games have worse odds than pre-game (if multiplier > 1)
- ✅ Console shows `[OddsJuice]` log messages
- ✅ API responses contain modified odds values

---

## 🐛 Troubleshooting

### Odds Not Changing?
1. **Check if system is enabled**
   - Go to `/admin/odds-config`
   - Make sure toggle shows "Enabled"

2. **Clear cache**
   - Hard refresh browser (Ctrl+Shift+R)
   - Restart dev server

3. **Check console for errors**
   - Look for `[OddsJuice] Failed to fetch configuration` errors

### API Not Applying Juice?
```bash
# Check database has config
cd nssports
npx tsx -e "
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();
  prisma.oddsConfiguration.findFirst().then(c => {
    console.log('Config:', c);
    prisma.\$disconnect();
  });
"
```

---

## 💡 Pro Tips

1. **Use extreme margins (15-20%) for initial testing** - makes changes very obvious
2. **Test with upcoming games first** - easier to see consistent odds
3. **Compare same game before/after** - clearest way to verify
4. **Check multiple bet types** - spread, moneyline, totals should all change
5. **Monitor console logs** - shows exactly what margins are being applied

---

## 📈 Revenue Impact Test

To calculate actual profit from juice:

1. **Note a bet amount**: $100
2. **Fair odds payout**: $190.90 (at -110)
3. **Juiced odds payout**: $186.95 (at -115)
4. **House profit**: $3.95 per $100 wagered

With $10,000 daily handle at 4.5% margin = **$450/day profit from juice**
