import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocalDb, generateLocalId, nowISO } from '@/lib/localDb';
import { syncEngine } from '@/lib/syncEngine';
import { toast } from 'sonner';
import { MarkerPlan } from '@/types/cutting';
import { dbMarkerPlanToApp } from '@/lib/dbMappers';

function localToApp(row: any): MarkerPlan {
  return dbMarkerPlanToApp(row);
}

export function useLocalMarkerPlans(orderId?: string) {
  return useQuery({
    queryKey: ['local_marker_plans', orderId],
    queryFn: async () => {
      const db = await getLocalDb();
      const all = await db.getAll('marker_plans');
      return all
        .filter(r => r._deleted === 0 && (!orderId || r.order_id === orderId))
        .sort((a, b) => (a.marker_no ?? '').localeCompare(b.marker_no ?? ''))
        .map(localToApp);
    },
  });
}

export function useCreateLocalMarkerPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (marker: MarkerPlan) => {
      const db = await getLocalDb();
      const row = {
        id: generateLocalId(),
        order_id: marker.orderId || null,
        marker_no: String(marker.markerNo),
        marker_length: marker.markerLength,
        marker_width: marker.fabricWidth,
        efficiency: marker.efficiency,
        sizes: marker.sizes || {},
        size_combination: null as string | null,
        pieces_per_marker: null as number | null,
        notes: null as string | null,
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: null as string | null,
        _synced: 0,
        _deleted: 0,
      };
      await db.put('marker_plans', row);
      syncEngine.scheduleSyncDebounced();
      return localToApp(row);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_marker_plans'] });
      toast.success('Marker plan saved');
    },
    onError: (error) => {
      toast.error('Failed to save marker plan: ' + error.message);
    },
  });
}

export function useDeleteLocalMarkerPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      syncEngine.trackDeletedId(id);
      const db = await getLocalDb();
      const existing = await db.get('marker_plans', id);
      if (existing) {
        await db.put('marker_plans', { ...existing, _deleted: 1, _synced: 0, updated_at: nowISO() });
      }
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['local_marker_plans'] });
      const previous = queryClient.getQueriesData({ queryKey: ['local_marker_plans'] });
      queryClient.setQueriesData({ queryKey: ['local_marker_plans'] }, (old: any) => {
        if (Array.isArray(old)) return old.filter((item: any) => item.id !== id);
        return old;
      });
      return { previous };
    },
    onSuccess: async () => {
      await syncEngine.syncAll();
      queryClient.invalidateQueries({ queryKey: ['local_marker_plans'] });
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to delete marker plan: ' + error.message);
    },
  });
}
