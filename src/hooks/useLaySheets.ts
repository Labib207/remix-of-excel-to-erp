import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LaySheet {
  id: string;
  cut_plan_id: string | null;
  sheet_no: string;
  fabric_type: string | null;
  fabric_width: number | null;
  lay_length: number | null;
  plies: number;
  total_pieces: number;
  wastage_percent: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface LaySheetInsert {
  cut_plan_id?: string;
  sheet_no: string;
  fabric_type?: string;
  fabric_width?: number;
  lay_length?: number;
  plies?: number;
  total_pieces?: number;
  wastage_percent?: number;
  status?: string;
  notes?: string;
}

export function useLaySheets(cutPlanId?: string) {
  return useQuery({
    queryKey: ['lay_sheets', cutPlanId],
    queryFn: async () => {
      let query = supabase
        .from('lay_sheets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (cutPlanId) {
        query = query.eq('cut_plan_id', cutPlanId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as LaySheet[];
    },
  });
}

export function useCreateLaySheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (laySheet: LaySheetInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('lay_sheets')
        .insert({ ...laySheet, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lay_sheets'] });
      toast.success('Lay sheet created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create lay sheet: ' + error.message);
    },
  });
}

export function useUpdateLaySheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LaySheet> & { id: string }) => {
      const { data, error } = await supabase
        .from('lay_sheets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lay_sheets'] });
      toast.success('Lay sheet updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update lay sheet: ' + error.message);
    },
  });
}

export function useDeleteLaySheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lay_sheets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lay_sheets'] });
      toast.success('Lay sheet deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete lay sheet: ' + error.message);
    },
  });
}
