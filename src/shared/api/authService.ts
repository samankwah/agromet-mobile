import type { Account } from '../domain/account';
import { mockDelay } from './mockDelay';

/** Tier B — guest-only this increment. Real integration target is the
 * backend's existing JWT auth (POST /api/v1/auth/login,
 * GET /api/v1/auth/me — backend/app/main.py). */
export async function getCurrentAccount(): Promise<Account> {
  return mockDelay({ mode: 'guest', guestId: 'guest' });
}
