import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateLocalId, nowISO } from '@/lib/localDb';
import { cloudFetch, cloudInsert, cloudUpdate, cloudDelete } from '@/lib/cloudDb';
import { syncEngine } from '@/lib/syncEngine';
import { toast } from 'sonner';
import { MaterialRequirement } from '@/store/requirementStore';
import { useAuth } from '@/contexts/AuthContext';

function rowToApp(row: any): MaterialRequirement {
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
      const filters = orderId ? { order_id: orderId } : undefined;
      const rows = await cloudFetch('requirements', filters);
      return rows
        .sort((a: any, b: any) => {
          const sa = a.sort_order ?? 999;
          const sb = b.sort_order ?? 999;
          if (sa !== sb) return sa - sb;
          return (a.created_at ?? '').localeCompare(b.created_at ?? '');
        })
        .map(rowToApp);
    },
  });
}

export function useCreateLocalRequirement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (req: Omit<MaterialRequirement, 'id' | 'requestedQty' | 'pendingQty'> & { sortOrder?: number }) => {
      let sortOrder = req.sortOrder;
      if (sortOrder === undefined && req.orderId) {
        const existing = await cloudFetch('requirements', { order_id: req.orderId });
        const maxSort = existing.reduce((max: number, r: any) => Math.max(max, r.sort_order ?? 0), 0);
        sortOrder = maxSort + 1;
      }

      const row = {
        id: generateLocalId(),
        order_id: req.orderId || null,
        item_code: req.itemCode,
        description: req.description || null,
        color: null,
        size: null,
        unit: req.uom || 'pcs',
        required_qty: req.requiredQty,
        received_qty: 0,
        sort_order: sortOrder ?? null,
        status: 'pending',
        notes: req.remarks || null,
        created_at: nowISO(),
        updated_at: nowISO(),
      };

      const result = await cloudInsert('requirements', row, user?.id);
      return rowToApp(result);
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reqs: Omit<MaterialRequirement, 'id' | 'requestedQty' | 'pendingQty'>[]) => {
      const orderId = reqs[0]?.orderId;
      let startOrder = 1;
      if (orderId) {
        const existing = await cloudFetch('requirements', { order_id: orderId });
        startOrder = existing.reduce((max: number, r: any) => Math.max(max, r.sort_order ?? 0), 0) + 1;
      }

      const results = [];
      for (let idx = 0; idx < reqs.length; idx++) {
        const req = reqs[idx];
        const row = {
          id: generateLocalId(),
          order_id: req.orderId || null,
          item_code: req.itemCode,
          description: req.description || null,
          color: null,
          size: null,
          unit: req.uom || 'pcs',
          required_qty: req.requiredQty,
          received_qty: 0,
          sort_order: startOrder + idx,
          status: 'pending',
          notes: req.remarks || null,
          created_at: nowISO(),
          updated_at: nowISO(),
        };
        const result = await cloudInsert('requirements', row, user?.id);
        results.push(rowToApp(result));
      }

      return results;
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
      const cloudUpdates: any = { updated_at: nowISO() };
      if (updates.orderId !== undefined) cloudUpdates.order_id = updates.orderId;
      if (updates.itemCode !== undefined) cloudUpdates.item_code = updates.itemCode;
      if (updates.description !== undefined) cloudUpdates.description = updates.description;
      if (updates.uom !== undefined) cloudUpdates.unit = updates.uom;
      if (updates.requiredQty !== undefined) cloudUpdates.required_qty = updates.requiredQty;
      if (updates.requestedQty !== undefined) cloudUpdates.received_qty = updates.requestedQty;
      if (updates.remarks !== undefined) cloudUpdates.notes = updates.remarks;

      const result = await cloudUpdate('requirements', id, cloudUpdates);
      return rowToApp(result);
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
      syncEngine.trackDeletedId(id);
      await cloudDelete('requirements', id);
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['local_requirements'] });
      const previous = queryClient.getQueriesData({ queryKey: ['local_requirements'] });
      queryClient.setQueriesData({ queryKey: ['local_requirements'] }, (old: any) => {
        if (Array.isArray(old)) return old.filter((item: any) => item.id !== id);
        return old;
      });
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_requirements'] });
    },
    onError: (error, _id, context) => {
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
      for (const update of updates) {
        const rows = await cloudFetch('requirements', { id: update.id });
        if (rows.length > 0) {
          const existing = rows[0];
          const newQty = (Number(existing.received_qty) || 0) + update.qty;
          await cloudUpdate('requirements', update.id, { received_qty: newQty, updated_at: nowISO() });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_requirements'] });
    },
    onError: (error) => {
      toast.error('Failed to update quantities: ' + error.message);
    },
  });
}
