/** Guest-only this increment (see shared/state/authStore.ts) — the
 * discriminated union exists now specifically so 'authenticated' slots in
 * later without every consumer needing a reshape. */
export type Account = { mode: 'guest'; guestId: string } | { mode: 'authenticated'; userId: string; displayName?: string; email?: string };
