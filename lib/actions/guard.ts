import 'server-only';
import { getCurrentUser } from '@/lib/auth/session';
import { USE_DB } from '@/lib/repositories/config';

// Shared result shape for mutating server actions.
export interface MutationResult {
  ok: boolean;
  message?: string;
}

// Gate for authenticated DB mutations. Returns a degrade result when there's no DB (so the demo
// keeps working), throws on missing auth (middleware only checks cookie existence — the real
// gate is here), or returns null when the caller may proceed. NOT a 'use server' module, so it
// can export this non-action helper for the actions to import.
export async function guardMutation(): Promise<MutationResult | null> {
  if (!USE_DB) return { ok: false, message: 'This action needs the database (set USE_DB=true).' };
  if (!(await getCurrentUser())) throw new Error('Unauthorized');
  return null;
}
