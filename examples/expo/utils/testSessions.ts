import type { Encatch } from '@encatch/react-native-sdk';
import { buildIdentifyTraits, type StoredTestUser } from '@/contexts/TestUsersContext';

type SessionSdk = Pick<typeof Encatch, 'resetUser' | 'startSession' | 'identifyUser'>;
let generated = 0;

export function generateTestUser(): StoredTestUser {
  const suffix = `${Date.now().toString(36)}_${(++generated).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const username = `tester_${suffix}`;
  return { username, displayName: `Test User ${suffix.slice(-5).toUpperCase()}`, email: `${username}@example.com` };
}

/** Use the SDK's real anonymous state, with no fabricated user name or identify call. */
export async function startAnonymousSession(sdk: SessionSdk): Promise<void> {
  await sdk.resetUser();
  await sdk.startSession();
}

/** Clear the previous server identity before identifying a different test user. */
export async function identifyTestUser(sdk: SessionSdk, user: StoredTestUser): Promise<void> {
  await sdk.resetUser();
  await sdk.identifyUser(user.username, buildIdentifyTraits(user));
}
