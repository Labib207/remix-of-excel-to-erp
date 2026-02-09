import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Request {
  id: string;
  order_id: string | null;
  request_no: string;
  request_date: string;
  department: string | null;
  requested_by: string | null;
  status: string;
  submitted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RequestItem {
  id: string;
  request_id: string | null;
  requirement_id: string | null;
  item_code: string | null;
  description: string | null;
  color: string | null;
  size: string | null;
  unit: string;
  requested_qty: number;
  issued_qty: number;
  balance_qty: number; // Generated column
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestInsert {
  order_id?: string;
  request_no: string;
  request_date?: string;
  department?: string;
  requested_by?: string;
  status?: string;
  notes?: string;
}

export interface RequestItemInsert {
  request_id: string;
  requirement_id?: string;
  item_code?: string;
  description?: string;
  color?: string;
  size?: string;
  unit?: string;
  requested_qty: number;
  issued_qty?: number;
  notes?: string;
}

export function useRequests(orderId?: string) {
  return useQuery({
    queryKey: ['requests', orderId],
    queryFn: async () => {
      let query = supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Request[];
    },
  });
}

export function useRequestItems(requestId?: string) {
  return useQuery({
    queryKey: ['request_items', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from('request_items')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as RequestItem[];
    },
    enabled: !!requestId,
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: RequestInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('requests')
        .insert({ ...request, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Request created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create request: ' + error.message);
    },
  });
}

export function useCreateRequestItems() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (items: RequestItemInsert[]) => {
      const { data, error } = await supabase
        .from('request_items')
        .insert(items)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request_items'] });
    },
    onError: (error) => {
      toast.error('Failed to create request items: ' + error.message);
    },
  });
}

export function useUpdateRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Request> & { id: string }) => {
      const { data, error } = await supabase
        .from('requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Request updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update request: ' + error.message);
    },
  });
}

export function useDeleteRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Request deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete request: ' + error.message);
    },
  });
}
