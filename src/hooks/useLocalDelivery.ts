import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateId, nowISO, cloudFetch, cloudInsert, cloudDelete } from '@/lib/cloudDb';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useLocalDeliveryAcknowledgments(requestId?: string) {
  return useQuery({
    queryKey: ['local_delivery_acknowledgments', requestId],
    queryFn: async () => {
      const filters = requestId ? { request_id: requestId } : undefined;
      const rows = await cloudFetch('delivery_acknowledgments', filters);
      return rows.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });
}

export function useLocalDeliveryItems(acknowledgmentId?: string) {
  return useQuery({
    queryKey: ['local_delivery_items', acknowledgmentId],
    queryFn: async () => {
      if (!acknowledgmentId) return [];
      const rows = await cloudFetch('delivery_items', { acknowledgment_id: acknowledgmentId });
      return rows.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },
    enabled: !!acknowledgmentId,
  });
}

export function useCreateLocalDeliveryAcknowledgment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ack: { request_id?: string; acknowledgment_no: string; delivery_date?: string; received_by?: string; line_supervisor_signature?: string; line_recorder_signature?: string; notes?: string }) => {
      const row = {
        id: generateId(),
        request_id: ack.request_id || null,
        acknowledgment_no: ack.acknowledgment_no,
        delivery_date: ack.delivery_date || new Date().toISOString().split('T')[0],
        received_by: ack.received_by || null,
        line_supervisor_signature: ack.line_supervisor_signature || null,
        line_recorder_signature: ack.line_recorder_signature || null,
        notes: ack.notes || null,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      const result = await cloudInsert('delivery_acknowledgments', row, user?.id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_delivery_acknowledgments'] });
      toast.success('Delivery acknowledgment saved');
    },
    onError: (error) => {
      toast.error('Failed to save delivery acknowledgment: ' + error.message);
    },
  });
}

export function useCreateLocalDeliveryItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { acknowledgment_id: string; request_item_id?: string; item_code?: string; description?: string; color?: string; size?: string; unit?: string; requirement_qty?: number; issued_qty?: number }[]) => {
      const results = [];
      for (const item of items) {
        const row = {
          id: generateId(),
          acknowledgment_id: item.acknowledgment_id || null,
          request_item_id: item.request_item_id || null,
          item_code: item.item_code || null,
          description: item.description || null,
          color: item.color || null,
          size: item.size || null,
          unit: item.unit || 'pcs',
          requirement_qty: item.requirement_qty || 0,
          issued_qty: item.issued_qty || 0,
          created_at: nowISO(),
        };
        const result = await cloudInsert('delivery_items', row);
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_delivery_items'] });
    },
    onError: (error) => {
      toast.error('Failed to save delivery items: ' + error.message);
    },
  });
}

export function useDeleteLocalDeliveryAcknowledgment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete related items first
      const items = await cloudFetch('delivery_items', { acknowledgment_id: id });
      for (const item of items) {
        await cloudDelete('delivery_items', item.id);
      }
      await cloudDelete('delivery_acknowledgments', id);
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['local_delivery_acknowledgments'] });
      await queryClient.cancelQueries({ queryKey: ['local_delivery_items'] });
      const previous = queryClient.getQueriesData({ queryKey: ['local_delivery_acknowledgments'] });
      queryClient.setQueriesData({ queryKey: ['local_delivery_acknowledgments'] }, (old: any) => {
        if (Array.isArray(old)) return old.filter((item: any) => item.id !== id);
        return old;
      });
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_delivery_acknowledgments'] });
      queryClient.invalidateQueries({ queryKey: ['local_delivery_items'] });
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to delete delivery acknowledgment: ' + error.message);
    },
  });
}
