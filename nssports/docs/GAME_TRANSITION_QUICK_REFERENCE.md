# Game Transition Quick Reference

## 🎯 At a Glance

```
┌─────────────┐         ┌──────────┐         ┌──────────┐
│  UPCOMING   │────────▶│   LIVE   │────────▶│ FINISHED │
│             │         │          │         │          │
│  /games     │         │  /live   │         │ (hidden) │
│  /games/NBA │         │  homepage│         │  NEVER   │
└─────────────┘         └──────────┘         └──────────┘
```

## 📍 Where Games Appear

| Game Status | `/games` | `/games/[leagueId]` | `/live` | Homepage | Component |
|-------------|----------|---------------------|---------|----------|-----------|
| **upcoming** | ✅ Show  | ✅ Show (filtered)  | ❌ Hide | ❌ Hide  | `ProfessionalGameRow` |
| **live**     | ❌ Hide  | ❌ Hide             | ✅ Show | ✅ Show  | `LiveGameRow` |
| **finished** | ❌ Hide  | ❌ Hide             | ❌ Hide | ❌ Hide  | ❌ NEVER SHOWN |

## 🔄 Automatic Transitions

### Upcoming → Live
```typescript
// When: Game's startTime reached
// Trigger: WebSocket status update
// Action:
✅ Remove from /games
✅ Remove from /games/[leagueId]
✅ Add to /live (with LiveGameRow)
✅ Add to homepage "Trending Live" section
📊 Enable real-time streaming
```

### Live → Finished
```typescript
// When: Game ends
// Trigger: WebSocket status update
// Action:
✅ Remove from /live
✅ Remove from homepage
❌ NEVER display anywhere again
```

## 🛠️ Key Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/store/gameTransitionStore.ts` | Track transitions | `useGameTransitionStore` |
| `src/hooks/useGameTransitions.ts` | Monitor status changes | `useGameTransitions` |
| `src/store/liveDataStore.ts` | WebSocket + transitions | `useLiveDataStore` |
| `src/components/features/games/LiveGameRow.tsx` | Live game UI | `LiveGameRow` |
| `src/components/features/games/ProfessionalGameRow.tsx` | Upcoming game UI | `ProfessionalGameRow` |

## 📝 Usage Examples

### In a Page Component

```tsx
import { useGameTransitions } from '@/hooks/useGameTransitions';

export default function GamesPage() {
  const { data } = useInfiniteGames({ status: undefined });
  const allGames = data?.pages.flatMap(p => p.data ?? []) ?? [];
  
  // ⭐ Monitor transitions
  const { shouldShowInCurrentContext } = useGameTransitions(allGames, 'upcoming');
  
  // Filter games for current context
  const upcomingGames = useMemo(() => {
    return allGames.filter(game => shouldShowInCurrentContext(game, 'upcoming'));
  }, [allGames, shouldShowInCurrentContext]);
  
  return (
    <div>
      {upcomingGames.map(game => (
        <ProfessionalGameRow key={game.id} game={game} />
      ))}
    </div>
  );
}
```

### Enable Streaming

```tsx
import { useLiveDataStore } from '@/store/liveDataStore';

export default function LivePage() {
  const enableStreaming = useLiveDataStore((state) => state.enableStreaming);
  const disableStreaming = useLiveDataStore((state) => state.disableStreaming);
  const streamingEnabled = useLiveDataStore((state) => state.streamingEnabled);
  
  useEffect(() => {
    if (games.length > 0 && !streamingEnabled) {
      enableStreaming(); // GLOBAL: All sports
    }
    return () => {
      if (streamingEnabled) disableStreaming();
    };
  }, [games.length, streamingEnabled]);
}
```

## ⚠️ Critical Rules

### NEVER Show Historical Games
```typescript
// ALWAYS filter finished games:
.filter(g => g.status !== 'finished')

// API level:
await getEvents({ finalized: false })
```

### Use Correct Component
```typescript
// Upcoming games:
<ProfessionalGameRow game={game} />

// Live games:
<LiveGameRow game={game} />
```

### Enable Streaming Everywhere
```typescript
// ALL pages showing games MUST enable streaming:
useEffect(() => {
  if (hasGames && !streamingEnabled) {
    enableStreaming(); // No sport parameter - GLOBAL
  }
  return () => {
    if (streamingEnabled) disableStreaming();
  };
}, [hasGames, streamingEnabled]);
```

## 🧪 Quick Test

```bash
# Test upcoming → live transition:
1. Go to /games
2. Find game starting in <1 min
3. Wait for start time
4. ✅ Game disappears from /games
5. Go to /live
6. ✅ Game appears with live score

# Test live → finished transition:
1. Go to /live
2. Find game in final minute
3. Wait for game to end
4. ✅ Game disappears from /live
5. Go to /games
6. ✅ Game does NOT appear (historical hidden)
```

## 🐛 Common Issues

### Games not migrating?
```bash
# Check console logs:
"[Streaming] Successfully subscribed to channel" ← Must see this
"[useGameTransitions] Status change detected" ← Must see this
"[GameTransition] Game XXX just went LIVE!" ← Must see this
```

### Historical games appearing?
```typescript
// Verify filter exists:
const games = allGames.filter(g => g.status !== 'finished');

// Verify API excludes:
await getEvents({ finalized: false });
```

### Streaming not working?
```bash
# Check environment:
NEXT_PUBLIC_STREAMING_ENABLED=true
SPORTSGAMEODDS_STREAMING_ENABLED=true

# Check plan:
# Requires AllStar or custom plan
```

## 📊 Status Badges

```tsx
// Upcoming games:
<Badge variant="default">UPCOMING</Badge>
<p>Today at 7:30 PM</p>

// Live games:
<Badge variant="destructive">
  🔴 LIVE
</Badge>
<p>2nd • 5:34</p>
<p>LAL 45 - 42 BOS</p>
```

## ✅ Checklist

Before deploying:

- [ ] `gameTransitionStore.ts` exists
- [ ] `useGameTransitions.ts` hook exists
- [ ] `liveDataStore.ts` detects transitions
- [ ] All pages filter `status !== 'finished'`
- [ ] All pages enable streaming
- [ ] `/games` uses `ProfessionalGameRow`
- [ ] `/live` uses `LiveGameRow`
- [ ] API uses `finalized: false`
- [ ] Tested upcoming → live transition
- [ ] Tested live → finished transition
- [ ] Verified no historical games show

---

**🚀 You now have Wall Street-level real-time game migrations!**
