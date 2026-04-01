import { supabase } from '@/integrations/supabase/client';

// Migration order: parent tables first, then child tables with foreign keys
const TABLES = [
  'orders', 'cut_plans', 'marker_plans', 'requirements', 'requests',
  'request_items', 'bundles', 'bundle_guides', 'lay_sheets',
  'delivery_acknowledgments', 'delivery_items', 'ratios',
  'fabric_calculations', 'fabric_rolls', 'lay_records', 'material_catalog',
] as const;

// Columns that must be stripped before upsert (generated or not in cloud schema)
const STRIP_COLUMNS: Record<string, string[]> = {
  orders: ['sort_order'],
  requirements: ['balance_qty'],
  request_items: ['balance_qty'],
  delivery_items: ['balance_qty', 'sort_order'],
  delivery_acknowledgments: ['sort_order'],
  cut_plans: ['sort_order'],
  marker_plans: ['sort_order'],
  bundles: ['sort_order'],
  bundle_guides: ['sort_order'],
  lay_sheets: ['sort_order'],
  requests: ['sort_order'],
  ratios: ['sort_order'],
  fabric_calculations: ['sort_order'],
  fabric_rolls: ['sort_order'],
  lay_records: ['sort_order'],
  material_catalog: ['sort_order'],
};

function stripForCloud(table: string, row: any) {
  const { _synced, _deleted, fabric_type, ...rest } = row;
  const result: any = { ...rest };
  if (fabric_type !== undefined && fabric_type !== null) {
    result.fabric_type = fabric_type;
  }
  const cols = STRIP_COLUMNS[table];
  if (cols) {
    for (const col of cols) delete result[col];
  }
  delete result._synced;
  delete result._deleted;
  return result;
}

/**
 * Export all cloud data as a backup (replaces the old local export).
 */
export async function exportAllCloudData(): Promise<Record<string, any[]>> {
  const backup: Record<string, any[]> = {};

  for (const table of TABLES) {
    const { data, error } = await (supabase.from(table).select('*') as any);
    backup[table] = error ? [] : (data || []);
  }

  return backup;
}

export async function getCloudDataCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    const { count, error } = await (supabase
      .from(table)
      .select('*', { count: 'exact', head: true }) as any);
    counts[table] = error ? -1 : (count ?? 0);
  }

  return counts;
}

export type MigrationProgress = {
  table: string;
  total: number;
  done: number;
  status: 'pending' | 'migrating' | 'done' | 'error';
  error?: string;
};

/**
 * Import a backup JSON file directly into the cloud database using upsert.
 */
export async function importBackupToCloud(
  backupData: Record<string, any[]>,
  onProgress: (progress: MigrationProgress[]) => void
): Promise<{ success: boolean; summary: Record<string, number> }> {
  const summary: Record<string, number> = {};
  const progress: MigrationProgress[] = TABLES.map(t => ({
    table: t, total: 0, done: 0, status: 'pending',
  }));

  for (let i = 0; i < TABLES.length; i++) {
    const table = TABLES[i];
    const rows = backupData[table];
    if (Array.isArray(rows)) {
      progress[i].total = rows.filter((r: any) => r._deleted !== 1).length;
    }
  }
  onProgress([...progress]);

  let validOrderIds: Set<string> | null = null;
  const FK_ORDER_TABLES = ['requirements', 'requests', 'request_items', 'cut_plans',
    'marker_plans', 'bundles', 'lay_sheets', 'ratios', 'fabric_calculations', 'delivery_acknowledgments'];

  for (let i = 0; i < TABLES.length; i++) {
    const table = TABLES[i];
    const rows = backupData[table];
    if (!Array.isArray(rows) || progress[i].total === 0) {
      progress[i].status = 'done';
      onProgress([...progress]);
      continue;
    }

    if (table !== 'orders' && !validOrderIds) {
      const { data: orders } = await (supabase.from('orders').select('id') as any);
      validOrderIds = new Set((orders || []).map((o: any) => o.id));
    }

    progress[i].status = 'migrating';
    onProgress([...progress]);

    const active = rows.filter((r: any) => r._deleted !== 1);
    let cleanRows = active.map(r => stripForCloud(table, r));

    if (validOrderIds && FK_ORDER_TABLES.includes(table)) {
      cleanRows = cleanRows.map(row => {
        if (row.order_id && !validOrderIds!.has(row.order_id)) {
          return { ...row, order_id: null };
        }
        return row;
      });
    }

    const BATCH = 50;
    let migrated = 0;
    try {
      for (let j = 0; j < cleanRows.length; j += BATCH) {
        const batch = cleanRows.slice(j, j + BATCH);
        const { error } = await (supabase
          .from(table)
          .upsert(batch, { onConflict: 'id' }) as any);
        if (error) throw new Error(`${table}: ${error.message}`);
        migrated += batch.length;
        progress[i].done = migrated;
        onProgress([...progress]);
      }
      progress[i].status = 'done';
      summary[table] = migrated;
    } catch (e: any) {
      progress[i].status = 'error';
      progress[i].error = e.message;
      summary[table] = migrated;
    }
    onProgress([...progress]);
  }

  const hasErrors = progress.some(p => p.status === 'error');
  return { success: !hasErrors, summary };
}

export function downloadBackupJson(data: Record<string, any[]>) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ghoush-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
