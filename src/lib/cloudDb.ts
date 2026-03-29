// Cloud-first database access layer
// Reads from Supabase when online, falls back to IndexedDB when offline
// Writes go to both cloud and local cache

import { supabase } from '@/integrations/supabase/client';
import { getLocalDb, nowISO } from './localDb';

type TableName = 'orders' | 'cut_plans' | 'marker_plans' | 'requirements' | 'requests' |
  'request_items' | 'bundles' | 'bundle_guides' | 'lay_sheets' |
  'delivery_acknowledgments' | 'delivery_items' | 'ratios' |
  'fabric_calculations' | 'fabric_rolls' | 'lay_records' | 'material_catalog';

// Generated columns that must be stripped before insert/update
const GENERATED_COLUMNS: Record<string, string[]> = {
  requirements: ['balance_qty'],
  request_items: ['balance_qty'],
  delivery_items: ['balance_qty'],
};

function stripGenerated(table: string, data: any) {
  const cols = GENERATED_COLUMNS[table];
  if (!cols) return data;
  const clean = { ...data };
  for (const col of cols) delete clean[col];
  return clean;
}

function stripLocalFields(data: any) {
  const { _synced, _deleted, ...rest } = data;
  return rest;
}

/**
 * Fetch all rows from a table. Cloud-first with local fallback.
 */
export async function cloudFetch(table: TableName, filters?: Record<string, any>): Promise<any[]> {
  // Try cloud first
  if (navigator.onLine) {
    try {
      let query = supabase.from(table).select('*') as any;
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        }
      }
      const { data, error } = await query;
      if (!error && data) {
        // Cache to IndexedDB in background
        cacheToLocal(table, data).catch(console.error);
        return data;
      }
      console.warn(`[cloudDb] Cloud fetch ${table} error:`, error);
    } catch (e) {
      console.warn(`[cloudDb] Cloud fetch ${table} failed, falling back to local:`, e);
    }
  }

  // Fallback to local
  const db = await getLocalDb();
  const all = await db.getAll(table as any);
  let filtered = all.filter((r: any) => r._deleted !== 1);
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        filtered = filtered.filter((r: any) => r[key] === value);
      }
    }
  }
  return filtered.map(stripLocalFields);
}

/**
 * Insert a row. Cloud-first, then cache locally.
 */
export async function cloudInsert(table: TableName, data: any, userId?: string): Promise<any> {
  const row = { ...data };
  if (userId && !row.created_by) row.created_by = userId;
  const cleanRow = stripGenerated(table, row);

  if (navigator.onLine) {
    const { data: inserted, error } = await supabase
      .from(table)
      .insert(cleanRow)
      .select()
      .single();

    if (error) throw new Error(`Insert ${table} failed: ${error.message}`);

    // Cache locally
    const db = await getLocalDb();
    await db.put(table as any, { ...inserted, _synced: 1, _deleted: 0 } as any);
    return inserted;
  }

  // Offline: save locally with _synced: 0
  const db = await getLocalDb();
  const localRow = { ...cleanRow, _synced: 0, _deleted: 0 };
  await db.put(table as any, localRow as any);
  return cleanRow;
}

/**
 * Update a row by ID. Cloud-first, then cache locally.
 */
export async function cloudUpdate(table: TableName, id: string, updates: any): Promise<any> {
  const cleanUpdates = stripGenerated(table, updates);

  if (navigator.onLine) {
    const { data: updated, error } = await supabase
      .from(table)
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Update ${table} failed: ${error.message}`);

    // Update local cache
    const db = await getLocalDb();
    const existing = await db.get(table as any, id);
    if (existing) {
      await db.put(table as any, { ...existing, ...updated, _synced: 1, _deleted: 0 } as any);
    }
    return updated;
  }

  // Offline: update locally
  const db = await getLocalDb();
  const existing = await db.get(table as any, id);
  if (!existing) throw new Error(`${table} record ${id} not found locally`);
  const localRow = { ...existing, ...cleanUpdates, updated_at: nowISO(), _synced: 0 };
  await db.put(table as any, localRow as any);
  return stripLocalFields(localRow);
}

/**
 * Delete a row by ID. Cloud-first, then remove locally.
 */
export async function cloudDelete(table: TableName, id: string): Promise<void> {
  if (navigator.onLine) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(`Delete ${table} failed: ${error.message}`);

    // Remove from local cache
    const db = await getLocalDb();
    try { await db.delete(table as any, id); } catch {}
    return;
  }

  // Offline: mark as deleted locally
  const db = await getLocalDb();
  const existing = await db.get(table as any, id);
  if (existing) {
    await db.put(table as any, { ...existing, _deleted: 1, _synced: 0, updated_at: nowISO() } as any);
  }
}

/**
 * Upsert a row. Cloud-first.
 */
export async function cloudUpsert(table: TableName, data: any, userId?: string): Promise<any> {
  const row = { ...data };
  if (userId && !row.created_by) row.created_by = userId;
  const cleanRow = stripGenerated(table, row);

  if (navigator.onLine) {
    const { data: result, error } = await supabase
      .from(table)
      .upsert(cleanRow, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(`Upsert ${table} failed: ${error.message}`);

    const db = await getLocalDb();
    await db.put(table as any, { ...result, _synced: 1, _deleted: 0 } as any);
    return result;
  }

  const db = await getLocalDb();
  const localRow = { ...cleanRow, _synced: 0, _deleted: 0 };
  await db.put(table as any, localRow as any);
  return cleanRow;
}

/**
 * Cache cloud data to IndexedDB (background)
 */
async function cacheToLocal(table: TableName, data: any[]) {
  const db = await getLocalDb();
  const tx = db.transaction(table as any, 'readwrite');
  const store = tx.objectStore(table as any);

  for (const row of data) {
    const existing = await store.get(row.id);
    // Don't overwrite unsynced local changes or locally deleted records
    if (existing && (existing._synced === 0 || existing._deleted === 1)) continue;
    await store.put({ ...row, _synced: 1, _deleted: 0 } as any);
  }

  await tx.done;
}
