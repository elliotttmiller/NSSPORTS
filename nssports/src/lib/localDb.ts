/**
 * Client-side localStorage database for GitHub Pages static deployment
 */

const KEY_PREFIX = 'nssports_v1_';

type UserRecord = {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  userType: 'player' | 'agent' | 'client_admin';
  isActive: boolean;
  createdAt: string;
};

type AccountRecord = {
  userId: string;
  balance: number;
  available: number;
  risk: number;
  freePlay: number;
};

type BetRecord = {
  id: string;
  userId: string;
  betType: string;
  selection: string;
  odds: number;
  line?: number | null;
  stake: number;
  potentialPayout: number;
  status: 'pending' | 'won' | 'lost' | 'push';
  placedAt: string;
  settledAt?: string;
  gameId?: string;
  game?: unknown;
  playerProp?: unknown;
  gameProp?: unknown;
  teaserType?: string;
  teaserMetadata?: unknown;
  legs?: unknown[];
};

function getKey(key: string): string {
  return KEY_PREFIX + key;
}

function getItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(getKey(key));
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getKey(key), JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function initDb(): void {
  if (typeof window === 'undefined') return;
  const initialized = getItem<boolean>('initialized');
  if (initialized) return;

  const demoUser: UserRecord = {
    id: 'demo-user-id',
    username: 'demo',
    passwordHash: 'demo123_hashed',
    name: 'Demo User',
    userType: 'player',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const users = [demoUser];
  setItem('users', users);

  const demoAccount: AccountRecord = {
    userId: 'demo-user-id',
    balance: 1000,
    available: 1000,
    risk: 0,
    freePlay: 0,
  };
  setItem('accounts', [demoAccount]);
  setItem('bets', []);
  setItem('initialized', true);
}

export function getUsers(): UserRecord[] {
  return getItem<UserRecord[]>('users') || [];
}

export function getUser(username: string): UserRecord | null {
  const users = getUsers();
  return users.find(u => u.username === username) || null;
}

export function getUserById(id: string): UserRecord | null {
  const users = getUsers();
  return users.find(u => u.id === id) || null;
}

export function createUser(username: string, password: string, name?: string): UserRecord {
  const users = getUsers();
  const newUser: UserRecord = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username,
    passwordHash: password + '_hashed',
    name: name || username,
    userType: 'player',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  setItem('users', users);

  const accounts = getItem<AccountRecord[]>('accounts') || [];
  accounts.push({
    userId: newUser.id,
    balance: 1000,
    available: 1000,
    risk: 0,
    freePlay: 0,
  });
  setItem('accounts', accounts);

  return newUser;
}

export function authenticate(username: string, password: string): UserRecord | null {
  const user = getUser(username);
  if (!user || !user.isActive) return null;
  if (user.passwordHash === password + '_hashed') return user;
  return null;
}

export function getAccount(userId: string): AccountRecord | null {
  const accounts = getItem<AccountRecord[]>('accounts') || [];
  return accounts.find(a => a.userId === userId) || null;
}

export function updateBalance(userId: string, newBalance: number): void {
  const accounts = getItem<AccountRecord[]>('accounts') || [];
  const idx = accounts.findIndex(a => a.userId === userId);
  if (idx !== -1) {
    accounts[idx].balance = newBalance;
    accounts[idx].available = newBalance;
    setItem('accounts', accounts);
  }
}

export function createBet(bet: Omit<BetRecord, 'id' | 'placedAt'>): BetRecord {
  const bets = getBets();
  const newBet: BetRecord = {
    ...bet,
    id: `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    placedAt: new Date().toISOString(),
  };
  bets.push(newBet);
  setItem('bets', bets);
  return newBet;
}

export function getBets(): BetRecord[] {
  return getItem<BetRecord[]>('bets') || [];
}

export function getUserBets(userId: string): BetRecord[] {
  return getBets().filter(b => b.userId === userId);
}
