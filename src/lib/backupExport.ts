import { getLocalDb } from './localDb';

const TABLES = [
  'orders', 'cut_plans', 'marker_plans', 'requirements', 'requests',
  'request_items', 'bundles', 'bundle_guides', 'lay_sheets',
  'delivery_acknowledgments', 'delivery_items', 'ratios',
  'fabric_calculations', 'fabric_rolls', 'lay_records', 'material_catalog',
] as const;

export async function exportAllLocalData(): Promise<Record<string, any[]>> {
  const db = await getLocalDb();
  const backup: Record<string, any[]> = {};

  for (const table of TABLES) {
    const all = await db.getAll(table as any);
    backup[table] = all.filter((r: any) => r._deleted !== 1);
  }

  return backup;
}

export async function getLocalDataCounts(): Promise<Record<string, number>> {
  const db = await getLocalDb();
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    const all = await db.getAll(table as any);
    counts[table] = all.filter((r: any) => r._deleted !== 1).length;
  }

  return counts;
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
