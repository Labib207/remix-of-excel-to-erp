import { safeErrorMessage } from '@/lib/errorHandler';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CutPlan {
  id: string;
  order_id: string | null;
  plan_no: string;
  fabric_type: string | null;
  fabric_width: number | null;
  plies: number;
  total_pieces: number;
  status: string;
  planned_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CutPlanInsert {
  order_id?: string;
  plan_no: string;
  fabric_type?: string;
  fabric_width?: number;
  plies?: number;
  total_pieces?: number;
  status?: string;
  planned_date?: string;
  notes?: string;
}

export function useCutPlans(orderId?: string) {
  return useQuery({
    queryKey: ['cut_plans', orderId],
    queryFn: async () => {
      let query = supabase
        .from('cut_plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CutPlan[];
    },
  });
}

export function useCreateCutPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cutPlan: CutPlanInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('cut_plans')
        .insert({ ...cutPlan, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cut_plans'] });
      toast.success('Cut plan created successfully');
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error, 'create cut plan'));
    },
  });
}

export function useUpdateCutPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CutPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('cut_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cut_plans'] });
      toast.success('Cut plan updated successfully');
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error, 'update cut plan'));
    },
  });
}

export function useDeleteCutPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cut_plans')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cut_plans'] });
      toast.success('Cut plan deleted successfully');
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error, 'delete cut plan'));
    },
  });
}
