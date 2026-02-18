import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MarkerPlan } from '@/types/cutting';
import { dbMarkerPlanToApp, appMarkerPlanToDb } from '@/lib/dbMappers';

export function useDbMarkerPlans(orderId?: string) {
  return useQuery({
    queryKey: ['marker_plans', orderId],
    queryFn: async () => {
      let query = supabase
        .from('marker_plans')
        .select('*')
        .order('marker_no', { ascending: true });
      
      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(dbMarkerPlanToApp);
    },
  });
}

export function useCreateDbMarkerPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (marker: MarkerPlan) => {
      const { data: { user } } = await supabase.auth.getUser();
      const dbData = appMarkerPlanToDb(marker);
      delete dbData.id;
      const insertData = { ...dbData, created_by: user?.id } as any;
      const { data, error } = await supabase
        .from('marker_plans')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return dbMarkerPlanToApp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marker_plans'] });
      toast.success('Marker plan created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create marker plan: ' + error.message);
    },
  });
}

export function useDeleteDbMarkerPlan() {
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
      toast.error('Failed to delete marker plan: ' + error.message);
    },
  });
}
