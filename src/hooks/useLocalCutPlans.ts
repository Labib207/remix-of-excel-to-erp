import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocalDb, generateLocalId, nowISO } from '@/lib/localDb';
import { syncEngine } from '@/lib/syncEngine';
import { toast } from 'sonner';
import { CutPlan } from '@/types/cutting';
import { dbCutPlanToApp } from '@/lib/dbMappers';

function localToApp(row: any): CutPlan {
  return dbCutPlanToApp(row);
}

export function useLocalCutPlans(orderId?: string) {
  return useQuery({
    queryKey: ['local_cut_plans', orderId],
    queryFn: async () => {
      const db = await getLocalDb();
      const all = await db.getAll('cut_plans');
      return all
        .filter(r => r._deleted === 0 && (!orderId || r.order_id === orderId))
        .sort((a, b) => (a.cut_no ?? 0) - (b.cut_no ?? 0))
        .map(localToApp);
    },
  });
}

export function useCreateLocalCutPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cutPlan: CutPlan) => {
      const db = await getLocalDb();
      const row = {
        id: generateLocalId(),
        order_id: cutPlan.orderId || null,
        marker_id: cutPlan.markerId || null,
        plan_no: `CP-${cutPlan.cutNo}`,
        cut_no: cutPlan.cutNo,
        shade: cutPlan.shade || 'X',
        plies: cutPlan.plies,
        marker_length: cutPlan.markerLength,
        lay_length: cutPlan.layLength,
        sizes: cutPlan.sizes || {},
        total_qty: cutPlan.totalQty,
        fabric_used: cutPlan.fabricUsed,
        fabric_type: null as string | null,
        fabric_width: null as number | null,
        date: cutPlan.date || null,
        planned_date: null as string | null,
        status: cutPlan.status || 'planned',
        notes: null as string | null,
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: null as string | null,
        _synced: 0,
        _deleted: 0,
      };
      await db.put('cut_plans', row);
      syncEngine.scheduleSyncDebounced();
      return localToApp(row);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_cut_plans'] });
      toast.success('Cut plan saved');
    },
    onError: (error) => {
      toast.error('Failed to save cut plan: ' + error.message);
    },
  });
}

export function useUpdateLocalCutPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CutPlan> & { id: string }) => {
      const db = await getLocalDb();
      const existing = await db.get('cut_plans', id);
      if (!existing) throw new Error('Cut plan not found');

      const updated = {
        ...existing,
        ...(updates.orderId !== undefined && { order_id: updates.orderId }),
        ...(updates.markerId !== undefined && { marker_id: updates.markerId }),
        ...(updates.cutNo !== undefined && { cut_no: updates.cutNo }),
        ...(updates.shade !== undefined && { shade: updates.shade }),
        ...(updates.plies !== undefined && { plies: updates.plies }),
        ...(updates.markerLength !== undefined && { marker_length: updates.markerLength }),
        ...(updates.layLength !== undefined && { lay_length: updates.layLength }),
        ...(updates.sizes !== undefined && { sizes: updates.sizes }),
        ...(updates.totalQty !== undefined && { total_qty: updates.totalQty }),
        ...(updates.fabricUsed !== undefined && { fabric_used: updates.fabricUsed }),
        ...(updates.date !== undefined && { date: updates.date }),
        ...(updates.status !== undefined && { status: updates.status }),
        updated_at: nowISO(),
        _synced: 0,
      };

      await db.put('cut_plans', updated);
      syncEngine.scheduleSyncDebounced();
      return localToApp(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_cut_plans'] });
      toast.success('Cut plan updated');
    },
    onError: (error) => {
      toast.error('Failed to update cut plan: ' + error.message);
    },
  });
}

export function useDeleteLocalCutPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      syncEngine.trackDeletedId(id);
      const db = await getLocalDb();
      const existing = await db.get('cut_plans', id);
      if (existing) {
        await db.put('cut_plans', { ...existing, _deleted: 1, _synced: 0, updated_at: nowISO() });
      }
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['local_cut_plans'] });
      const previous = queryClient.getQueriesData({ queryKey: ['local_cut_plans'] });
      queryClient.setQueriesData({ queryKey: ['local_cut_plans'] }, (old: any) => {
        if (Array.isArray(old)) return old.filter((item: any) => item.id !== id);
        return old;
      });
      return { previous };
    },
    onSuccess: async () => {
      await syncEngine.syncAll();
      queryClient.invalidateQueries({ queryKey: ['local_cut_plans'] });
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to delete cut plan: ' + error.message);
    },
  });
}
