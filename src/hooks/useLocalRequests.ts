import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocalDb, generateLocalId, nowISO } from '@/lib/localDb';
import { syncEngine } from '@/lib/syncEngine';
import { toast } from 'sonner';

// Re-export types matching the existing cloud hooks
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
      const db = await getLocalDb();
      const all = await db.getAll('requests');
      return all
        .filter(r => r._deleted === 0 && (!orderId || r.order_id === orderId))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as LocalRequestRecord[];
    },
  });
}

export function useLocalRequestItems(requestId?: string) {
  return useQuery({
    queryKey: ['local_request_items', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const db = await getLocalDb();
      const all = await db.getAll('request_items');
      return all
        .filter(r => r._deleted === 0 && r.request_id === requestId)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) as LocalRequestItemRecord[];
    },
    enabled: !!requestId,
  });
}

export function useCreateLocalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: { order_id?: string; request_no: string; request_date?: string; department?: string; requested_by?: string; status?: string; notes?: string }) => {
      const db = await getLocalDb();
      const row = {
        id: generateLocalId(),
        order_id: request.order_id || null,
        request_no: request.request_no,
        request_date: request.request_date || new Date().toISOString().split('T')[0],
        department: request.department || null,
        requested_by: request.requested_by || null,
        status: request.status || 'draft',
        submitted_at: null as string | null,
        notes: request.notes || null,
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: null as string | null,
        _synced: 0,
        _deleted: 0,
      };
      await db.put('requests', row);
      syncEngine.scheduleSyncDebounced();
      return row as LocalRequestRecord;
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
      const db = await getLocalDb();
      const tx = db.transaction('request_items', 'readwrite');

      const rows = items.map((item, idx) => ({
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
        balance_qty: item.requested_qty - (item.issued_qty || 0),
        sort_order: idx,
        notes: item.notes || null,
        created_at: nowISO(),
        updated_at: nowISO(),
        _synced: 0,
        _deleted: 0,
      }));

      for (const row of rows) {
        await tx.store.put(row);
      }
      await tx.done;

      syncEngine.scheduleSyncDebounced();
      return rows as LocalRequestItemRecord[];
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
      const db = await getLocalDb();
      const existing = await db.get('requests', id);
      if (!existing) throw new Error('Request not found');

      const updated = { ...existing, ...updates, updated_at: nowISO(), _synced: 0 };
      await db.put('requests', updated);
      syncEngine.scheduleSyncDebounced();
      return updated as LocalRequestRecord;
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
      const db = await getLocalDb();
      const existing = await db.get('requests', id);
      if (existing) {
        await db.put('requests', { ...existing, _deleted: 1, _synced: 0, updated_at: nowISO() });
      }
      // Also soft-delete related items
      const items = await db.getAll('request_items');
      const tx = db.transaction('request_items', 'readwrite');
      for (const item of items) {
        if (item.request_id === id) {
          await tx.store.put({ ...item, _deleted: 1, _synced: 0 });
        }
      }
      await tx.done;

      syncEngine.scheduleSyncDebounced();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_requests'] });
      queryClient.invalidateQueries({ queryKey: ['local_request_items'] });
      toast.success('Request deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete request: ' + error.message);
    },
  });
}
