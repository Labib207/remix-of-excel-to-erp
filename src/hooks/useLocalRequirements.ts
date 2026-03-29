import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocalDb, generateLocalId, nowISO } from '@/lib/localDb';
import { syncEngine } from '@/lib/syncEngine';
import { toast } from 'sonner';
import { MaterialRequirement } from '@/store/requirementStore';

function localToApp(row: any): MaterialRequirement {
  return {
    id: row.id,
    orderId: row.order_id || '',
    itemCode: row.item_code || '',
    description: row.description || '',
    uom: row.unit || 'pcs',
    requiredQty: Number(row.required_qty) || 0,
    requestedQty: Number(row.received_qty) || 0,
    pendingQty: Number(row.balance_qty) || (Number(row.required_qty) - Number(row.received_qty)) || 0,
    remarks: row.notes || '',
  };
}

export function useLocalRequirements(orderId?: string) {
  return useQuery({
    queryKey: ['local_requirements', orderId],
    queryFn: async () => {
      const db = await getLocalDb();
      const all = await db.getAll('requirements');
      return all
        .filter(r => r._deleted === 0 && (!orderId || r.order_id === orderId))
        .sort((a, b) => {
          const sa = a.sort_order ?? 999;
          const sb = b.sort_order ?? 999;
          if (sa !== sb) return sa - sb;
          return (a.created_at ?? '').localeCompare(b.created_at ?? '');
        })
        .map(localToApp);
    },
  });
}

export function useCreateLocalRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (req: Omit<MaterialRequirement, 'id' | 'requestedQty' | 'pendingQty'> & { sortOrder?: number }) => {
      const db = await getLocalDb();
      
      // Get next sort order
      let sortOrder = req.sortOrder;
      if (sortOrder === undefined && req.orderId) {
        const all = await db.getAll('requirements');
        const orderReqs = all.filter(r => r.order_id === req.orderId && r._deleted === 0);
        const maxSort = orderReqs.reduce((max, r) => Math.max(max, r.sort_order ?? 0), 0);
        sortOrder = maxSort + 1;
      }

      const row = {
        id: generateLocalId(),
        order_id: req.orderId || null,
        item_code: req.itemCode,
        description: req.description || null,
        color: null as string | null,
        size: null as string | null,
        unit: req.uom || 'pcs',
        required_qty: req.requiredQty,
        received_qty: 0,
        balance_qty: req.requiredQty,
        sort_order: sortOrder ?? null,
        status: 'pending',
        notes: req.remarks || null,
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: null as string | null,
        _synced: 0,
        _deleted: 0,
      };

      await db.put('requirements', row);
      syncEngine.scheduleSyncDebounced();
      return localToApp(row);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_requirements'] });
    },
    onError: (error) => {
      toast.error('Failed to create requirement: ' + error.message);
    },
  });
}

export function useCreateLocalRequirements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reqs: Omit<MaterialRequirement, 'id' | 'requestedQty' | 'pendingQty'>[]) => {
      const db = await getLocalDb();
      const orderId = reqs[0]?.orderId;
      
      let startOrder = 1;
      if (orderId) {
        const all = await db.getAll('requirements');
        const orderReqs = all.filter(r => r.order_id === orderId && r._deleted === 0);
        startOrder = orderReqs.reduce((max, r) => Math.max(max, r.sort_order ?? 0), 0) + 1;
      }

      const rows = reqs.map((req, idx) => ({
        id: generateLocalId(),
        order_id: req.orderId || null,
        item_code: req.itemCode,
        description: req.description || null,
        color: null as string | null,
        size: null as string | null,
        unit: req.uom || 'pcs',
        required_qty: req.requiredQty,
        received_qty: 0,
        balance_qty: req.requiredQty,
        sort_order: startOrder + idx,
        status: 'pending',
        notes: req.remarks || null,
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: null as string | null,
        _synced: 0,
        _deleted: 0,
      }));

      const tx = db.transaction('requirements', 'readwrite');
      for (const row of rows) {
        await tx.store.put(row);
      }
      await tx.done;

      syncEngine.scheduleSyncDebounced();
      return rows.map(localToApp);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_requirements'] });
    },
    onError: (error) => {
      toast.error('Failed to create requirements: ' + error.message);
    },
  });
}

export function useUpdateLocalRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaterialRequirement> & { id: string }) => {
      const db = await getLocalDb();
      const existing = await db.get('requirements', id);
      if (!existing) throw new Error('Requirement not found');

      const updated = {
        ...existing,
        ...(updates.orderId !== undefined && { order_id: updates.orderId }),
        ...(updates.itemCode !== undefined && { item_code: updates.itemCode }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.uom !== undefined && { unit: updates.uom }),
        ...(updates.requiredQty !== undefined && { required_qty: updates.requiredQty }),
        ...(updates.requestedQty !== undefined && { received_qty: updates.requestedQty }),
        ...(updates.remarks !== undefined && { notes: updates.remarks }),
        updated_at: nowISO(),
        _synced: 0,
      };

      // Recalculate balance_qty when required_qty or received_qty changes
      const reqQty = Number(updated.required_qty) || 0;
      const recvQty = Number(updated.received_qty) || 0;
      updated.balance_qty = reqQty - recvQty;

      await db.put('requirements', updated);
      syncEngine.scheduleSyncDebounced();
      return localToApp(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_requirements'] });
    },
    onError: (error) => {
      toast.error('Failed to update requirement: ' + error.message);
    },
  });
}

export function useDeleteLocalRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Track this ID to prevent resurrection during sync pull
      syncEngine.trackDeletedId(id);

      const db = await getLocalDb();
      const existing = await db.get('requirements', id);
      if (existing) {
        await db.put('requirements', { ...existing, _deleted: 1, _synced: 0, updated_at: nowISO() });
      }
      return id;
    },
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['local_requirements'] });

      // Snapshot current data
      const previous = queryClient.getQueriesData({ queryKey: ['local_requirements'] });

      // Optimistically remove the item from all requirement queries
      queryClient.setQueriesData({ queryKey: ['local_requirements'] }, (old: any) => {
        if (Array.isArray(old)) {
          return old.filter((item: any) => item.id !== id);
        }
        return old;
      });

      return { previous };
    },
    onSuccess: async () => {
      // Sync to cloud after optimistic update is already applied
      await syncEngine.syncAll();
      // Re-invalidate after sync to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['local_requirements'] });
    },
    onError: (error, _id, context) => {
      // Rollback optimistic update on error
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to delete requirement: ' + error.message);
    },
  });
}

export function useUpdateLocalRequestedQty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; qty: number }[]) => {
      const db = await getLocalDb();
      const tx = db.transaction('requirements', 'readwrite');

      for (const update of updates) {
        const existing = await tx.store.get(update.id);
        if (existing) {
          const newQty = (Number(existing.received_qty) || 0) + update.qty;
          await tx.store.put({
            ...existing,
            received_qty: newQty,
            updated_at: nowISO(),
            _synced: 0,
          });
        }
      }

      await tx.done;
      syncEngine.scheduleSyncDebounced();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_requirements'] });
    },
    onError: (error) => {
      toast.error('Failed to update quantities: ' + error.message);
    },
  });
}
