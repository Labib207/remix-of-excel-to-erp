import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocalDb, generateLocalId, nowISO } from '@/lib/localDb';
import { syncEngine } from '@/lib/syncEngine';
import { toast } from 'sonner';

export function useLocalDeliveryAcknowledgments(requestId?: string) {
  return useQuery({
    queryKey: ['local_delivery_acknowledgments', requestId],
    queryFn: async () => {
      const db = await getLocalDb();
      const all = await db.getAll('delivery_acknowledgments');
      return all
        .filter(r => r._deleted === 0 && (!requestId || r.request_id === requestId))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });
}

export function useLocalDeliveryItems(acknowledgmentId?: string) {
  return useQuery({
    queryKey: ['local_delivery_items', acknowledgmentId],
    queryFn: async () => {
      if (!acknowledgmentId) return [];
      const db = await getLocalDb();
      const all = await db.getAll('delivery_items');
      return all
        .filter(r => r._deleted === 0 && r.acknowledgment_id === acknowledgmentId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },
    enabled: !!acknowledgmentId,
  });
}

export function useCreateLocalDeliveryAcknowledgment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ack: { request_id?: string; acknowledgment_no: string; delivery_date?: string; received_by?: string; line_supervisor_signature?: string; line_recorder_signature?: string; notes?: string }) => {
      const db = await getLocalDb();
      const row = {
        id: generateLocalId(),
        request_id: ack.request_id || null,
        acknowledgment_no: ack.acknowledgment_no,
        delivery_date: ack.delivery_date || new Date().toISOString().split('T')[0],
        received_by: ack.received_by || null,
        line_supervisor_signature: ack.line_supervisor_signature || null,
        line_recorder_signature: ack.line_recorder_signature || null,
        notes: ack.notes || null,
        created_at: nowISO(),
        updated_at: nowISO(),
        created_by: null as string | null,
        _synced: 0,
        _deleted: 0,
      };
      await db.put('delivery_acknowledgments', row);
      syncEngine.scheduleSyncDebounced();
      return row;
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
      const db = await getLocalDb();
      const tx = db.transaction('delivery_items', 'readwrite');

      const rows = items.map(item => ({
        id: generateLocalId(),
        acknowledgment_id: item.acknowledgment_id || null,
        request_item_id: item.request_item_id || null,
        item_code: item.item_code || null,
        description: item.description || null,
        color: item.color || null,
        size: item.size || null,
        unit: item.unit || 'pcs',
        requirement_qty: item.requirement_qty || 0,
        issued_qty: item.issued_qty || 0,
        balance_qty: (item.requirement_qty || 0) - (item.issued_qty || 0),
        created_at: nowISO(),
        _synced: 0,
        _deleted: 0,
      }));

      for (const row of rows) {
        await tx.store.put(row);
      }
      await tx.done;

      syncEngine.scheduleSyncDebounced();
      return rows;
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
      const db = await getLocalDb();
      const existing = await db.get('delivery_acknowledgments', id);
      if (existing) {
        await db.put('delivery_acknowledgments', { ...existing, _deleted: 1, _synced: 0, updated_at: nowISO() });
      }
      // Soft-delete items
      const items = await db.getAll('delivery_items');
      const tx = db.transaction('delivery_items', 'readwrite');
      for (const item of items) {
        if (item.acknowledgment_id === id) {
          await tx.store.put({ ...item, _deleted: 1, _synced: 0 });
        }
      }
      await tx.done;

      syncEngine.scheduleSyncDebounced();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_delivery_acknowledgments'] });
      queryClient.invalidateQueries({ queryKey: ['local_delivery_items'] });
      toast.success('Delivery acknowledgment deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete delivery acknowledgment: ' + error.message);
    },
  });
}
