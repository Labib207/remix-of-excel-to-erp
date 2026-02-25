import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLocalDb, generateLocalId, nowISO } from '@/lib/localDb';
import { syncEngine } from '@/lib/syncEngine';
import { toast } from 'sonner';
import { Order } from '@/types/cutting';
import { dbOrderToApp } from '@/lib/dbMappers';

// Convert local DB row to app Order
function localToApp(row: any): Order {
  return dbOrderToApp(row);
}

// Convert app Order to local DB row
function appToLocal(order: Partial<Order> & { id?: string }, synced = 0) {
  return {
    id: order.id || generateLocalId(),
    order_no: order.orderNumber || '',
    customer: order.customer || '',
    style_no: order.styleNo || '',
    style_name: order.styleName || null,
    shade: order.shade || 'X',
    quantity: order.totalQty || 0,
    size_quantities: order.sizeQuantities || {},
    custom_sizes: order.customSizes || null,
    fabric_width: order.fabricWidth || 145,
    order_date: order.orderDate || null,
    delivery_date: order.deliveryDate || null,
    status: order.status || 'pending',
    created_at: nowISO(),
    updated_at: nowISO(),
    created_by: null as string | null,
    _synced: synced,
    _deleted: 0,
  };
}

export function useLocalOrders() {
  return useQuery({
    queryKey: ['local_orders'],
    queryFn: async () => {
      const db = await getLocalDb();
      const all = await db.getAll('orders');
      return all
        .filter(r => r._deleted === 0)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(localToApp);
    },
  });
}

export function useLocalOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['local_orders', id],
    queryFn: async () => {
      if (!id) return null;
      const db = await getLocalDb();
      const row = await db.get('orders', id);
      if (!row || row._deleted === 1) return null;
      return localToApp(row);
    },
    enabled: !!id,
  });
}

export function useCreateLocalOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: Order) => {
      const db = await getLocalDb();
      const row = appToLocal(order);
      await db.put('orders', row);
      syncEngine.scheduleSyncDebounced();
      return localToApp(row);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_orders'] });
      toast.success('Order saved locally');
    },
    onError: (error) => {
      toast.error('Failed to save order: ' + error.message);
    },
  });
}

export function useUpdateLocalOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Order> & { id: string }) => {
      const db = await getLocalDb();
      const existing = await db.get('orders', id);
      if (!existing) throw new Error('Order not found');

      const updated = {
        ...existing,
        ...(updates.orderNumber !== undefined && { order_no: updates.orderNumber }),
        ...(updates.customer !== undefined && { customer: updates.customer }),
        ...(updates.styleNo !== undefined && { style_no: updates.styleNo }),
        ...(updates.styleName !== undefined && { style_name: updates.styleName }),
        ...(updates.shade !== undefined && { shade: updates.shade }),
        ...(updates.totalQty !== undefined && { quantity: updates.totalQty }),
        ...(updates.sizeQuantities !== undefined && { size_quantities: updates.sizeQuantities }),
        ...(updates.customSizes !== undefined && { custom_sizes: updates.customSizes }),
        ...(updates.fabricWidth !== undefined && { fabric_width: updates.fabricWidth }),
        ...(updates.orderDate !== undefined && { order_date: updates.orderDate }),
        ...(updates.deliveryDate !== undefined && { delivery_date: updates.deliveryDate }),
        ...(updates.status !== undefined && { status: updates.status }),
        updated_at: nowISO(),
        _synced: 0,
      };

      await db.put('orders', updated);
      syncEngine.scheduleSyncDebounced();
      return localToApp(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_orders'] });
      toast.success('Order updated');
    },
    onError: (error) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });
}

export function useDeleteLocalOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getLocalDb();
      const existing = await db.get('orders', id);
      if (existing) {
        await db.put('orders', { ...existing, _deleted: 1, _synced: 0, updated_at: nowISO() });
      }
      // Sync immediately for deletes (don't debounce)
      await syncEngine.syncAll();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_orders'] });
      toast.success('Order deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete order: ' + error.message);
    },
  });
}
