import { getLocalDb, nowISO } from './localDb';
import { supabase } from '@/integrations/supabase/client';

// Table names that map to both IndexedDB and Supabase
const SYNC_TABLES = [
  'orders',
  'cut_plans',
  'marker_plans',
  'requirements',
  'requests',
  'request_items',
  'bundles',
  'bundle_guides',
  'lay_sheets',
  'delivery_acknowledgments',
  'delivery_items',
  'ratios',
  'fabric_calculations',
  'fabric_rolls',
  'lay_records',
  'material_catalog',
] as const;

type SyncTable = typeof SYNC_TABLES[number];

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
type SyncListener = (status: SyncStatus) => void;

class SyncEngine {
  private static instance: SyncEngine;
  private listeners: SyncListener[] = [];
  private status: SyncStatus = 'idle';
  private isSyncing = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => {
        this.setStatus('offline');
      });
    }
  }

  // Subscribe to status changes
  onStatusChange(listener: SyncListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  private setStatus(status: SyncStatus) {
    this.status = status;
    this.listeners.forEach(l => l(status));
  }

  private async handleOnline() {
    console.log('[SyncEngine] Back online, starting sync...');
    await this.syncAll();
  }

  // Schedule a debounced sync
  scheduleSyncDebounced() {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncAll();
    }, 3000); // 3 second debounce
  }

  // Pull all data from cloud into IndexedDB
  async pullFromCloud(): Promise<void> {
    if (!navigator.onLine) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const db = await getLocalDb();
    this.setStatus('syncing');

    try {
      for (const table of SYNC_TABLES) {
        const { data, error } = await supabase
          .from(table)
          .select('*');

        if (error) {
          console.error(`[SyncEngine] Error pulling ${table}:`, error);
          continue;
        }

        // Build a set of cloud IDs for this table
        const cloudIds = new Set((data || []).map((row: any) => row.id));

        // Only clean up local records deleted from cloud if:
        // 1. Cloud returned some data (not empty = could be a network issue)
        // 2. Not hitting the 1000 row limit (which means we might have partial data)
        if (data && data.length > 0 && data.length < 1000) {
          const tx1 = db.transaction(table as any, 'readwrite');
          const store1 = tx1.objectStore(table as any);
          const allLocal = await store1.getAll();
          for (const local of allLocal) {
            const loc = local as any;
            // Only remove if it was already synced to cloud AND cloud confirmed it's gone
            // Never remove unsynced local records (they haven't been pushed yet)
            if (loc._synced === 1 && loc._deleted === 0 && !cloudIds.has(loc.id)) {
              console.log(`[SyncEngine] Removing locally cached ${table} record ${loc.id} (deleted from cloud)`);
              await store1.delete(loc.id);
            }
          }
          await tx1.done;
        }

        // Then: upsert cloud data into local
        if (data && data.length > 0) {
          const tx2 = db.transaction(table as any, 'readwrite');
          const store2 = tx2.objectStore(table as any);

          for (const row of data) {
            const existing = await store2.get(row.id);
            // If locally deleted (pending cloud delete), don't restore from cloud
            if (existing && existing._deleted === 1) {
              continue;
            }
            // Only overwrite if not locally modified (or if no local record exists)
            if (!existing || existing._synced === 1) {
              await store2.put({ ...row, _synced: 1, _deleted: 0 } as any);
            }
          }

          await tx2.done;
        }
      }

      // Update sync meta
      await db.put('sync_meta', {
        id: 'last_pull',
        timestamp: nowISO(),
        status: 'idle',
      });

      this.setStatus('synced');
      console.log('[SyncEngine] Pull from cloud complete');
    } catch (error) {
      console.error('[SyncEngine] Pull error:', error);
      this.setStatus('error');
    }
  }

  // Push unsynced local changes to cloud
  async pushToCloud(): Promise<void> {
    if (!navigator.onLine) {
      this.setStatus('offline');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const db = await getLocalDb();
    this.setStatus('syncing');

    try {
      for (const table of SYNC_TABLES) {
        // Get unsynced records
        const allRecords = await db.getAllFromIndex(table as any, 'by-synced', 0);

        if (allRecords.length === 0) continue;

        // Separate into upserts and deletes
        const toUpsert = allRecords.filter((r: any) => r._deleted === 0);
        const toDelete = allRecords.filter((r: any) => r._deleted === 1);

        // Upsert records
        if (toUpsert.length > 0) {
          for (const record of toUpsert) {
            const { _synced, _deleted, ...cloudData } = record as any;
            
            // Add created_by if not set
            if (!cloudData.created_by) {
              cloudData.created_by = user.id;
            }

            // Remove generated columns that can't be inserted
            if (table === 'requirements' || table === 'request_items' || table === 'delivery_items') {
              delete cloudData.balance_qty;
            }

            const { error } = await supabase
              .from(table)
              .upsert(cloudData, { onConflict: 'id' });

            if (error) {
              console.error(`[SyncEngine] Upsert error for ${table}:`, error);
              continue;
            }

            // Mark as synced in local DB
            const tx = db.transaction(table as any, 'readwrite');
            await tx.objectStore(table as any).put({ ...record, _synced: 1 } as any);
            await tx.done;
          }
        }

        // Delete records
        if (toDelete.length > 0) {
          for (const record of toDelete) {
            const { error } = await supabase
              .from(table)
              .delete()
              .eq('id', (record as any).id);

            if (error) {
              console.error(`[SyncEngine] Delete error for ${table}:`, error);
              continue;
            }

            // Remove from local DB
            const tx = db.transaction(table as any, 'readwrite');
            await tx.objectStore(table as any).delete((record as any).id);
            await tx.done;
          }
        }
      }

      // Update sync meta
      await db.put('sync_meta', {
        id: 'last_push',
        timestamp: nowISO(),
        status: 'idle',
      });

      this.setStatus('synced');
      console.log('[SyncEngine] Push to cloud complete');
    } catch (error) {
      console.error('[SyncEngine] Push error:', error);
      this.setStatus('error');
    }
  }

  // Full bi-directional sync
  async syncAll(): Promise<void> {
    if (this.isSyncing) return;
    if (!navigator.onLine) {
      this.setStatus('offline');
      return;
    }

    this.isSyncing = true;

    try {
      // Push local changes first, then pull cloud updates
      await this.pushToCloud();
      await this.pullFromCloud();
    } catch (error) {
      console.error('[SyncEngine] Sync error:', error);
      this.setStatus('error');
    } finally {
      this.isSyncing = false;
    }
  }

  // Check if there are any pending changes
  async hasPendingChanges(): Promise<boolean> {
    const db = await getLocalDb();
    for (const table of SYNC_TABLES) {
      const unsynced = await db.getAllFromIndex(table as any, 'by-synced', 0);
      if (unsynced.length > 0) return true;
    }
    return false;
  }
}

export const syncEngine = SyncEngine.getInstance();
