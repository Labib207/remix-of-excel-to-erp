import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateLocalId, nowISO } from '@/lib/localDb';
import { cloudFetch, cloudInsert, cloudUpdate, cloudDelete } from '@/lib/cloudDb';
import { syncEngine } from '@/lib/syncEngine';
import { toast } from 'sonner';
import { Order } from '@/types/cutting';
import { dbOrderToApp } from '@/lib/dbMappers';
import { useAuth } from '@/contexts/AuthContext';

function rowToApp(row: any): Order {
  return dbOrderToApp(row);
}

export function useLocalOrders() {
  return useQuery({
    queryKey: ['local_orders'],
    queryFn: async () => {
      const rows = await cloudFetch('orders');
      return rows
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(rowToApp);
    },
  });
}

export function useLocalOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['local_orders', id],
    queryFn: async () => {
      if (!id) return null;
      const rows = await cloudFetch('orders', { id });
      return rows.length > 0 ? rowToApp(rows[0]) : null;
    },
    enabled: !!id,
  });
}

export function useCreateLocalOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (order: Order) => {
      const row = {
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
      };
      const result = await cloudInsert('orders', row, user?.id);
      return rowToApp(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_orders'] });
      toast.success('Order saved');
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
      const cloudUpdates: any = { updated_at: nowISO() };
      if (updates.orderNumber !== undefined) cloudUpdates.order_no = updates.orderNumber;
      if (updates.customer !== undefined) cloudUpdates.customer = updates.customer;
      if (updates.styleNo !== undefined) cloudUpdates.style_no = updates.styleNo;
      if (updates.styleName !== undefined) cloudUpdates.style_name = updates.styleName;
      if (updates.shade !== undefined) cloudUpdates.shade = updates.shade;
      if (updates.totalQty !== undefined) cloudUpdates.quantity = updates.totalQty;
      if (updates.sizeQuantities !== undefined) cloudUpdates.size_quantities = updates.sizeQuantities;
      if (updates.customSizes !== undefined) cloudUpdates.custom_sizes = updates.customSizes;
      if (updates.fabricWidth !== undefined) cloudUpdates.fabric_width = updates.fabricWidth;
      if (updates.orderDate !== undefined) cloudUpdates.order_date = updates.orderDate;
      if (updates.deliveryDate !== undefined) cloudUpdates.delivery_date = updates.deliveryDate;
      if (updates.status !== undefined) cloudUpdates.status = updates.status;

      const result = await cloudUpdate('orders', id, cloudUpdates);
      return rowToApp(result);
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
      syncEngine.trackDeletedId(id);
      await cloudDelete('orders', id);
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['local_orders'] });
      const previous = queryClient.getQueriesData({ queryKey: ['local_orders'] });
      queryClient.setQueriesData({ queryKey: ['local_orders'] }, (old: any) => {
        if (Array.isArray(old)) return old.filter((item: any) => item.id !== id);
        return old;
      });
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local_orders'] });
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to delete order: ' + error.message);
    },
  });
}
