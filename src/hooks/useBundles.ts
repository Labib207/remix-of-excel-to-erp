import { safeErrorMessage } from '@/lib/errorHandler';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Bundle {
  id: string;
  lay_sheet_id: string | null;
  bundle_no: string;
  size: string | null;
  color: string | null;
  quantity: number;
  status: string;
  scanned_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface BundleInsert {
  lay_sheet_id?: string;
  bundle_no: string;
  size?: string;
  color?: string;
  quantity?: number;
  status?: string;
  notes?: string;
}

export function useBundles(laySheetId?: string) {
  return useQuery({
    queryKey: ['bundles', laySheetId],
    queryFn: async () => {
      let query = supabase
        .from('bundles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (laySheetId) {
        query = query.eq('lay_sheet_id', laySheetId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Bundle[];
    },
  });
}

export function useCreateBundle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bundle: BundleInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('bundles')
        .insert({ ...bundle, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundle created successfully');
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error, 'create bundle'));
    },
  });
}

export function useCreateBundles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bundles: BundleInsert[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('bundles')
        .insert(bundles.map(b => ({ ...b, created_by: user?.id })))
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundles created successfully');
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error, 'create bundles'));
    },
  });
}

export function useUpdateBundle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Bundle> & { id: string }) => {
      const { data, error } = await supabase
        .from('bundles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundle updated successfully');
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error, 'update bundle'));
    },
  });
}

export function useDeleteBundle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bundles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundle deleted successfully');
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error, 'delete bundle'));
    },
  });
}
