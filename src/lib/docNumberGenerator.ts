/**
 * Generates unique, auto-incrementing document numbers.
 * Format: [PREFIX]-[YEAR]-[4-digit counter]
 * Example: MR-2026-0001, MR-2026-0002
 * 
 * Counter persists in localStorage (keyed per prefix+year) and never repeats,
 * even after deletions.
 */

const STORAGE_PREFIX = 'doc_counter_v2_';

export const getNextDocNumber = (prefix: string): string => {
  const year = new Date().getFullYear();
  const key = `${STORAGE_PREFIX}${prefix}_${year}`;
  const stored = localStorage.getItem(key);

  const counter = stored ? parseInt(stored, 10) + 1 : 1;
  localStorage.setItem(key, String(counter));

  return `${prefix}-${year}-${String(counter).padStart(4, '0')}`;
};
