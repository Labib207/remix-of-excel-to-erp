import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DeliveryAcknowledgment {
  id: string;
  request_id: string | null;
  acknowledgment_no: string;
  delivery_date: string;
  received_by: string | null;
  line_supervisor_signature: string | null;
  line_recorder_signature: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface DeliveryItem {
  id: string;
  acknowledgment_id: string | null;
  request_item_id: string | null;
  item_code: string | null;
  description: string | null;
  color: string | null;
  size: string | null;
  unit: string;
  requirement_qty: number;
  issued_qty: number;
  balance_qty: number; // Generated column
  created_at: string;
}

export interface DeliveryAcknowledgmentInsert {
  request_id?: string;
  acknowledgment_no: string;
  delivery_date?: string;
  received_by?: string;
  line_supervisor_signature?: string;
  line_recorder_signature?: string;
  notes?: string;
}

export interface DeliveryItemInsert {
  acknowledgment_id: string;
  request_item_id?: string;
  item_code?: string;
  description?: string;
  color?: string;
  size?: string;
  unit?: string;
  requirement_qty?: number;
  issued_qty?: number;
}

export function useDeliveryAcknowledgments(requestId?: string) {
  return useQuery({
    queryKey: ['delivery_acknowledgments', requestId],
    queryFn: async () => {
      let query = supabase
        .from('delivery_acknowledgments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (requestId) {
        query = query.eq('request_id', requestId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DeliveryAcknowledgment[];
    },
  });
}

export function useDeliveryItems(acknowledgmentId?: string) {
  return useQuery({
    queryKey: ['delivery_items', acknowledgmentId],
    queryFn: async () => {
      if (!acknowledgmentId) return [];
      const { data, error } = await supabase
        .from('delivery_items')
        .select('*')
        .eq('acknowledgment_id', acknowledgmentId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as DeliveryItem[];
    },
    enabled: !!acknowledgmentId,
  });
}

export function useCreateDeliveryAcknowledgment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (acknowledgment: DeliveryAcknowledgmentInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('delivery_acknowledgments')
        .insert({ ...acknowledgment, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_acknowledgments'] });
      toast.success('Delivery acknowledgment created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create delivery acknowledgment: ' + error.message);
    },
  });
}

export function useCreateDeliveryItems() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (items: DeliveryItemInsert[]) => {
      const { data, error } = await supabase
        .from('delivery_items')
        .insert(items)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_items'] });
    },
    onError: (error) => {
      toast.error('Failed to create delivery items: ' + error.message);
    },
  });
}

export function useDeleteDeliveryAcknowledgment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_acknowledgments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_acknowledgments'] });
      toast.success('Delivery acknowledgment deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete delivery acknowledgment: ' + error.message);
    },
  });
}
