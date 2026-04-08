/**
 * Client-side authentication for GitHub Pages static deployment
 * Replaces next-auth with localStorage-based JWT-like sessions
 */
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, createElement } from 'react';
import { initDb, authenticate, createUser, getUserById } from './localDb';

export type ClientSession = {
  user: {
    id: string;
    username: string;
    name: string;
    image?: string;
    userType: string;
    isAgent: boolean;
    isAdmin: boolean;
    tenantId?: string;
  };
  expires: string;
};

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

type SessionContextType = {
  data: ClientSession | null;
  status: SessionStatus;
  update: () => Promise<ClientSession | null>;
};

const SESSION_KEY = 'nssports_v1_session';

export function saveSession(session: ClientSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): ClientSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as ClientSession;
    if (new Date(session.expires) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export function createSession(userId: string): ClientSession | null {
  const user = getUserById(userId);
  if (!user) return null;
  const session: ClientSession = {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      userType: user.userType,
      isAgent: user.userType === 'agent',
      isAdmin: ['client_admin', 'platform_admin'].includes(user.userType),
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  saveSession(session);
  return session;
}

export async function signIn(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  initDb();
  const user = authenticate(username, password);
  if (!user) {
    return { success: false, error: 'Invalid username or password' };
  }
  createSession(user.id);
  return { success: true };
}

export async function signOut(): Promise<void> {
  clearSession();
}

export async function register(username: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> {
  initDb();
  const { getUser } = await import('./localDb');
  const existing = getUser(username);
  if (existing) {
    return { success: false, error: 'Username already taken' };
  }
  const user = createUser(username, password, name);
  createSession(user.id);
  return { success: true };
}

const SessionContext = createContext<SessionContextType>({
  data: null,
  status: 'loading',
  update: async () => null,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    initDb();
    const sess = loadSession();
    setSession(sess);
    setStatus(sess ? 'authenticated' : 'unauthenticated');
  }, []);

  const update = async (): Promise<ClientSession | null> => {
    const sess = loadSession();
    setSession(sess);
    setStatus(sess ? 'authenticated' : 'unauthenticated');
    return sess;
  };

  return createElement(
    SessionContext.Provider,
    { value: { data: session, status, update } },
    children
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export async function getClientSession(): Promise<ClientSession | null> {
  return loadSession();
}
