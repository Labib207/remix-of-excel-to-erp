import { safeErrorMessage } from '@/lib/errorHandler';
// Cloud-only database access layer
// All reads and writes go directly to Supabase

import { supabase } from '@/integrations/supabase/client';

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

// Utility: generate a UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Utility: current ISO timestamp
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Fetch all rows from a table directly from cloud.
 */
export async function cloudFetch(table: TableName, filters?: Record<string, any>): Promise<any[]> {
  let query = supabase.from(table).select('*') as any;
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }
  }
  const { data, error } = await query;
  if (error) throw new Error(safeErrorMessage(error, `fetch ${table}`));
  return data || [];
}

/**
 * Insert a row into cloud.
 */
export async function cloudInsert(table: TableName, data: any, userId?: string): Promise<any> {
  const row = { ...data };
  if (userId && !row.created_by) row.created_by = userId;
  const cleanRow = stripGenerated(table, row);

  const { data: inserted, error } = await (supabase
    .from(table)
    .insert(cleanRow)
    .select()
    .single() as any);

  if (error) throw new Error(safeErrorMessage(error, `insert ${table}`));
  return inserted;
}

/**
 * Update a row by ID in cloud.
 */
export async function cloudUpdate(table: TableName, id: string, updates: any): Promise<any> {
  const cleanUpdates = stripGenerated(table, updates);

  const { data: updated, error } = await (supabase
    .from(table)
    .update(cleanUpdates)
    .eq('id', id)
    .select()
    .single() as any);

  if (error) throw new Error(safeErrorMessage(error, `update ${table}`));
  return updated;
}

/**
 * Delete a row by ID from cloud.
 */
export async function cloudDelete(table: TableName, id: string): Promise<void> {
  const { error } = await (supabase.from(table).delete().eq('id', id) as any);
  if (error) throw new Error(safeErrorMessage(error, `delete ${table}`));
}

/**
 * Upsert a row in cloud.
 */
export async function cloudUpsert(table: TableName, data: any, userId?: string): Promise<any> {
  const row = { ...data };
  if (userId && !row.created_by) row.created_by = userId;
  const cleanRow = stripGenerated(table, row);

  const { data: result, error } = await (supabase
    .from(table)
    .upsert(cleanRow, { onConflict: 'id' })
    .select()
    .single() as any);

  if (error) throw new Error(safeErrorMessage(error, `upsert ${table}`));
  return result;
}
