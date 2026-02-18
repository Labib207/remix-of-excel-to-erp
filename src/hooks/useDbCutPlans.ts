import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CutPlan } from '@/types/cutting';
import { dbCutPlanToApp, appCutPlanToDb } from '@/lib/dbMappers';

export function useDbCutPlans(orderId?: string) {
  return useQuery({
    queryKey: ['cut_plans', orderId],
    queryFn: async () => {
      let query = supabase
        .from('cut_plans')
        .select('*')
        .order('cut_no', { ascending: true });
      
      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(dbCutPlanToApp);
    },
  });
}

export function useCreateDbCutPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cutPlan: CutPlan) => {
      const { data: { user } } = await supabase.auth.getUser();
      const dbData = appCutPlanToDb(cutPlan);
      delete dbData.id;
      // plan_no is required
      dbData.plan_no = `CP-${cutPlan.cutNo}`;
      const insertData = { ...dbData, created_by: user?.id } as any;
      const { data, error } = await supabase
        .from('cut_plans')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return dbCutPlanToApp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cut_plans'] });
      toast.success('Cut plan created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create cut plan: ' + error.message);
    },
  });
}

export function useUpdateDbCutPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CutPlan> & { id: string }) => {
      const dbData = appCutPlanToDb(updates);
      const { data, error } = await supabase
        .from('cut_plans')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return dbCutPlanToApp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cut_plans'] });
      toast.success('Cut plan updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update cut plan: ' + error.message);
    },
  });
}

export function useDeleteDbCutPlan() {
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
      toast.error('Failed to delete cut plan: ' + error.message);
    },
  });
}
