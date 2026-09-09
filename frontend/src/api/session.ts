import { useSyncExternalStore } from 'react';
import { clearTokens, getRefreshToken, registerRefreshHook, request, setAccessToken, setRefreshToken } from './client';
import type { Tokens, User } from './endpoints';
let user: User | null = null;
let expired = false;
const listeners = new Set<() => void>();
const emit = () => { for (const listener of listeners) listener(); };
export const useSession = () => useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => user);
export const useExpiredSession = () => useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => expired);
export function acceptSession(tokens: Tokens, account: User) { setAccessToken(tokens.access); setRefreshToken(tokens.refresh); user = account; expired = false; emit(); }
export function signOut() { clearTokens(); user = null; expired = false; emit(); }
registerRefreshHook(async () => {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const tokens = await request<Tokens>('/auth/token/refresh', { method: 'POST', anonymous: true, body: { refresh }, retry: false });
  setRefreshToken(tokens.refresh); setAccessToken(tokens.access); return tokens.access;
}, () => { expired = true; emit(); });
export async function restoreSession() {
  if (!getRefreshToken()) return;
  try { user = await request<User>('/auth/me'); emit(); } catch { signOut(); }
}
export async function signIn(email: string, password: string) {
  const tokens = await request<Tokens>('/auth/token', { method: 'POST', anonymous: true, body: { email, password } });
  setAccessToken(tokens.access);
  const account = await request<User>('/auth/me'); acceptSession(tokens, account);
}
