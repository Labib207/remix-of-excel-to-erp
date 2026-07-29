/**
 * Generates unique, auto-incrementing document numbers.
 * Format: [PREFIX]-[YEAR]-[4-digit counter]
 * Example: MR-2026-0001, MR-2026-0002
 *
 * Counters live server-side (atomic increment in the database) so numbers can
 * never collide between devices/tabs and are never lost when browser data is
 * cleared. A local fallback is used only if the server call fails.
 */

import { supabase } from '@/integrations/supabase/client';

const STORAGE_PREFIX = 'doc_counter_v2_';

const localFallback = (prefix: string): string => {
  const year = new Date().getFullYear();
  const key = `${STORAGE_PREFIX}${prefix}_${year}`;
  const stored = localStorage.getItem(key);
  const counter = stored ? parseInt(stored, 10) + 1 : 1;
  localStorage.setItem(key, String(counter));
  return `${prefix}-${year}-${String(counter).padStart(4, '0')}`;
};

export const getNextDocNumber = async (prefix: string): Promise<string> => {
  try {
    const { data, error } = await (supabase as any).rpc('next_doc_number', {
      _prefix: prefix,
    });
    if (error || !data) throw error ?? new Error('No document number returned');
    return data as string;
  } catch {
    return localFallback(prefix);
  }
};
