import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateId, nowISO, cloudFetch, cloudInsert, cloudDelete } from '@/lib/cloudDb';
import { toast } from 'sonner';
import { MarkerPlan } from '@/types/cutting';
import { dbMarkerPlanToApp } from '@/lib/dbMappers';
import { useAuth } from '@/contexts/AuthContext';

function rowToApp(row: any): MarkerPlan {
  return dbMarkerPlanToApp(row);
}

export function useLocalMarkerPlans(orderId?: string) {
  return useQuery({
    queryKey: ['local_marker_plans', orderId],
    queryFn: async () => {
      const filters = orderId ? { order_id: orderId } : undefined;
      const rows = await cloudFetch('marker_plans', filters);
      return rows
        .sort((a: any, b: any) => (a.marker_no ?? '').localeCompare(b.marker_no ?? ''))
        .map(rowToApp);
    },
  });
}

export function useCreateLocalMarkerPlan() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (marker: MarkerPlan) => {
      const row = {
        id: generateId(),
        order_id: marker.orderId || null,
        marker_no: String(marker.markerNo),
        marker_length: marker.markerLength,
        marker_width: marker.fabricWidth,
        efficiency: marker.efficiency,
        sizes: marker.sizes || {},
        size_combination: null,
        pieces_per_marker: null,
        notes: null,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      const result = await cloudInsert('marker_plans', row, user?.id);
      return rowToApp(result);
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
      await cloudDelete('marker_plans', id);
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
    onSuccess: () => {
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
