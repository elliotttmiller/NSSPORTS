# Frontend Context Integration Guide

This guide explains how to use the new React Contexts and hooks for user profile, betslip history, and bets in your application.

## 1. Providers Setup

Wrap your app with the following providers in `src/main.tsx` or your root component:

```tsx
import { UserProvider } from "@/context/UserContext";
import { BetHistoryProvider } from "@/context/BetHistoryContext";
import { BetsProvider } from "@/context/BetsContext";

<UserProvider>
  <BetHistoryProvider>
    <BetsProvider>{/* ...your app... */}</BetsProvider>
  </BetHistoryProvider>
</UserProvider>;
```

## 2. Using the Contexts

### UserContext

Access user profile, balance, deposit history, and update methods:

```tsx
import { useUserContext } from "@/context/UserContext";

const { user, updateUser, addDeposit, addBetSlipToHistory } = useUserContext();
```

### BetHistoryContext

Access betslip history and add new betslip IDs:

```tsx
import { useBetHistoryContext } from "@/context/BetHistoryContext";

const { betHistory, addBetSlipToHistory } = useBetHistoryContext();
```

### BetsContext

Access and manage bets:

```tsx
import { useBetsContext } from "@/context/BetsContext";

const { bets, addBet, updateBet, deleteBet } = useBetsContext();
```

## 3. API Integration

All context actions are fully wired to the backend API and persist state in Redis Cloud.

## 4. TypeScript Types

All context values and actions are strongly typed for safety and autocompletion.

---

For more details, see the code in `src/context/` and `src/hooks/useApi.ts`.
