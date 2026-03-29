import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateLocalId, nowISO } from '@/lib/localDb';
import { cloudFetch, cloudInsert, cloudUpdate, cloudDelete } from '@/lib/cloudDb';
import { syncEngine } from '@/lib/syncEngine';
import { toast } from 'sonner';
import { CutPlan } from '@/types/cutting';
import { dbCutPlanToApp } from '@/lib/dbMappers';
import { useAuth } from '@/contexts/AuthContext';

function rowToApp(row: any): CutPlan {
  return dbCutPlanToApp(row);
}

export function useLocalCutPlans(orderId?: string) {
  return useQuery({
    queryKey: ['local_cut_plans', orderId],
    queryFn: async () => {
      const filters = orderId ? { order_id: orderId } : undefined;
      const rows = await cloudFetch('cut_plans', filters);
      return rows
        .sort((a: any, b: any) => (a.cut_no ?? 0) - (b.cut_no ?? 0))
        .map(rowToApp);
    },
  });
}

export function useCreateLocalCutPlan() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (cutPlan: CutPlan) => {
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
        fabric_type: null,
        fabric_width: null,
        date: cutPlan.date || null,
        planned_date: null,
        status: cutPlan.status || 'planned',
        notes: null,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      const result = await cloudInsert('cut_plans', row, user?.id);
      return rowToApp(result);
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
      const cloudUpdates: any = { updated_at: nowISO() };
      if (updates.orderId !== undefined) cloudUpdates.order_id = updates.orderId;
      if (updates.markerId !== undefined) cloudUpdates.marker_id = updates.markerId;
      if (updates.cutNo !== undefined) cloudUpdates.cut_no = updates.cutNo;
      if (updates.shade !== undefined) cloudUpdates.shade = updates.shade;
      if (updates.plies !== undefined) cloudUpdates.plies = updates.plies;
      if (updates.markerLength !== undefined) cloudUpdates.marker_length = updates.markerLength;
      if (updates.layLength !== undefined) cloudUpdates.lay_length = updates.layLength;
      if (updates.sizes !== undefined) cloudUpdates.sizes = updates.sizes;
      if (updates.totalQty !== undefined) cloudUpdates.total_qty = updates.totalQty;
      if (updates.fabricUsed !== undefined) cloudUpdates.fabric_used = updates.fabricUsed;
      if (updates.date !== undefined) cloudUpdates.date = updates.date;
      if (updates.status !== undefined) cloudUpdates.status = updates.status;

      const result = await cloudUpdate('cut_plans', id, cloudUpdates);
      return rowToApp(result);
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
      await cloudDelete('cut_plans', id);
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
    onSuccess: () => {
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
