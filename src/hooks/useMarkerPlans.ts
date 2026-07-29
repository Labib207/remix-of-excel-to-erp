import { safeErrorMessage } from '@/lib/errorHandler';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MarkerPlan {
  id: string;
  order_id: string | null;
  marker_no: string;
  marker_length: number | null;
  marker_width: number | null;
  efficiency: number;
  size_combination: string | null;
  pieces_per_marker: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MarkerPlanInsert {
  order_id?: string;
  marker_no: string;
  marker_length?: number;
  marker_width?: number;
  efficiency?: number;
  size_combination?: string;
  pieces_per_marker?: number;
  notes?: string;
}

export function useMarkerPlans(orderId?: string) {
  return useQuery({
    queryKey: ['marker_plans', orderId],
    queryFn: async () => {
      let query = supabase
        .from('marker_plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MarkerPlan[];
    },
  });
}

export function useCreateMarkerPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (markerPlan: MarkerPlanInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('marker_plans')
        .insert({ ...markerPlan, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marker_plans'] });
      toast.success('Marker plan created successfully');
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error, 'create marker plan'));
    },
  });
}

export function useUpdateMarkerPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MarkerPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('marker_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marker_plans'] });
      toast.success('Marker plan updated successfully');
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error, 'update marker plan'));
    },
  });
}

export function useDeleteMarkerPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marker_plans')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marker_plans'] });
      toast.success('Marker plan deleted successfully');
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error, 'delete marker plan'));
    },
  });
}
