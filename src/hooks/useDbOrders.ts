import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Order } from '@/types/cutting';
import { dbOrderToApp, appOrderToDb } from '@/lib/dbMappers';

export function useDbOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(dbOrderToApp);
    },
  });
}

export function useDbOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data ? dbOrderToApp(data) : null;
    },
    enabled: !!id,
  });
}

export function useCreateDbOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (order: Order) => {
      const { data: { user } } = await supabase.auth.getUser();
      const dbData = appOrderToDb(order);
      // Remove id if it's a client-generated one (not UUID)
      delete dbData.id;
      const insertData = { ...dbData, created_by: user?.id } as any;
      const { data, error } = await supabase
        .from('orders')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return dbOrderToApp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create order: ' + error.message);
    },
  });
}

export function useUpdateDbOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Order> & { id: string }) => {
      const dbData = appOrderToDb(updates);
      const { data, error } = await supabase
        .from('orders')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return dbOrderToApp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });
}

export function useDeleteDbOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete order: ' + error.message);
    },
  });
}
