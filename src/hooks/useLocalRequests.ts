import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateLocalId, nowISO } from '@/lib/localDb';
import { cloudFetch, cloudInsert, cloudUpdate, cloudDelete } from '@/lib/cloudDb';
import { syncEngine } from '@/lib/syncEngine';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface LocalRequestRecord {
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

export interface LocalRequestItemRecord {
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
  balance_qty: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useLocalRequests(orderId?: string) {
  return useQuery({
    queryKey: ['local_requests', orderId],
    queryFn: async () => {
      const filters = orderId ? { order_id: orderId } : undefined;
      const rows = await cloudFetch('requests', filters);
      return rows
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as LocalRequestRecord[];
    },
  });
}

export function useLocalRequestItems(requestId?: string) {
  return useQuery({
    queryKey: ['local_request_items', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const rows = await cloudFetch('request_items', { request_id: requestId });
      return rows
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) as LocalRequestItemRecord[];
    },
    enabled: !!requestId,
  });
}

export function useCreateLocalRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (request: { order_id?: string; request_no: string; request_date?: string; department?: string; requested_by?: string; status?: string; notes?: string }) => {
      const row = {
        id: generateLocalId(),
        order_id: request.order_id || null,
        request_no: request.request_no,
        request_date: request.request_date || new Date().toISOString().split('T')[0],
        department: request.department || null,
        requested_by: request.requested_by || null,
        status: request.status || 'draft',
        submitted_at: null,
        notes: request.notes || null,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      const result = await cloudInsert('requests', row, user?.id);
      return result as LocalRequestRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_requests'] });
      toast.success('Request created');
    },
    onError: (error) => {
      toast.error('Failed to create request: ' + error.message);
    },
  });
}

export function useCreateLocalRequestItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { request_id: string; requirement_id?: string; item_code?: string; description?: string; color?: string; size?: string; unit?: string; requested_qty: number; issued_qty?: number; notes?: string }[]) => {
      const results = [];
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const row = {
          id: generateLocalId(),
          request_id: item.request_id,
          requirement_id: item.requirement_id || null,
          item_code: item.item_code || null,
          description: item.description || null,
          color: item.color || null,
          size: item.size || null,
          unit: item.unit || 'pcs',
          requested_qty: item.requested_qty,
          issued_qty: item.issued_qty || 0,
          sort_order: idx,
          notes: item.notes || null,
          created_at: nowISO(),
          updated_at: nowISO(),
        };
        const result = await cloudInsert('request_items', row);
        results.push(result);
      }
      return results as LocalRequestItemRecord[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_request_items'] });
    },
    onError: (error) => {
      toast.error('Failed to create request items: ' + error.message);
    },
  });
}

export function useUpdateLocalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LocalRequestRecord> & { id: string }) => {
      const result = await cloudUpdate('requests', id, { ...updates, updated_at: nowISO() });
      return result as LocalRequestRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_requests'] });
      toast.success('Request updated');
    },
    onError: (error) => {
      toast.error('Failed to update request: ' + error.message);
    },
  });
}

export function useDeleteLocalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      syncEngine.trackDeletedId(id);
      // Delete related items first
      const items = await cloudFetch('request_items', { request_id: id });
      for (const item of items) {
        syncEngine.trackDeletedId(item.id);
        await cloudDelete('request_items', item.id);
      }
      await cloudDelete('requests', id);
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['local_requests'] });
      await queryClient.cancelQueries({ queryKey: ['local_request_items'] });
      const prevRequests = queryClient.getQueriesData({ queryKey: ['local_requests'] });
      queryClient.setQueriesData({ queryKey: ['local_requests'] }, (old: any) => {
        if (Array.isArray(old)) return old.filter((item: any) => item.id !== id);
        return old;
      });
      return { prevRequests };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_requests'] });
      queryClient.invalidateQueries({ queryKey: ['local_request_items'] });
    },
    onError: (error, _id, context) => {
      if (context?.prevRequests) {
        for (const [key, data] of context.prevRequests) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to delete request: ' + error.message);
    },
  });
}
