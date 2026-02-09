import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Requirement {
  id: string;
  order_id: string | null;
  item_code: string;
  description: string | null;
  color: string | null;
  size: string | null;
  unit: string;
  required_qty: number;
  received_qty: number;
  balance_qty: number; // Generated column
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RequirementInsert {
  order_id?: string;
  item_code: string;
  description?: string;
  color?: string;
  size?: string;
  unit?: string;
  required_qty: number;
  received_qty?: number;
  status?: string;
  notes?: string;
}

export function useRequirements(orderId?: string) {
  return useQuery({
    queryKey: ['requirements', orderId],
    queryFn: async () => {
      let query = supabase
        .from('requirements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Requirement[];
    },
  });
}

export function useCreateRequirement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requirement: RequirementInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('requirements')
        .insert({ ...requirement, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      toast.success('Requirement created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create requirement: ' + error.message);
    },
  });
}

export function useCreateRequirements() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requirements: RequirementInsert[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('requirements')
        .insert(requirements.map(r => ({ ...r, created_by: user?.id })))
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      toast.success('Requirements created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create requirements: ' + error.message);
    },
  });
}

export function useUpdateRequirement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Requirement> & { id: string }) => {
      // Don't include balance_qty as it's generated
      const { balance_qty, ...validUpdates } = updates as any;
      const { data, error } = await supabase
        .from('requirements')
        .update(validUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      toast.success('Requirement updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update requirement: ' + error.message);
    },
  });
}

export function useDeleteRequirement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('requirements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      toast.success('Requirement deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete requirement: ' + error.message);
    },
  });
}
