import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MaterialRequirement } from '@/store/requirementStore';

function dbToApp(db: any): MaterialRequirement {
  return {
    id: db.id,
    orderId: db.order_id || '',
    itemCode: db.item_code || '',
    description: db.description || '',
    uom: db.unit || 'pcs',
    requiredQty: Number(db.required_qty) || 0,
    requestedQty: Number(db.received_qty) || 0, // mapping received_qty as requestedQty
    pendingQty: Number(db.balance_qty) || (Number(db.required_qty) - Number(db.received_qty)) || 0,
    remarks: db.notes || '',
  };
}

function appToDb(req: Partial<MaterialRequirement>) {
  const result: Record<string, any> = {};
  if (req.orderId !== undefined) result.order_id = req.orderId || null;
  if (req.itemCode !== undefined) result.item_code = req.itemCode;
  if (req.description !== undefined) result.description = req.description;
  if (req.uom !== undefined) result.unit = req.uom;
  if (req.requiredQty !== undefined) result.required_qty = req.requiredQty;
  if (req.requestedQty !== undefined) result.received_qty = req.requestedQty;
  if (req.remarks !== undefined) result.notes = req.remarks;
  return result;
}

export function useDbRequirements(orderId?: string) {
  return useQuery({
    queryKey: ['requirements', orderId],
    queryFn: async () => {
      let query = supabase
        .from('requirements')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(dbToApp);
    },
  });
}

export function useCreateDbRequirement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (req: Omit<MaterialRequirement, 'id' | 'requestedQty' | 'pendingQty'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const dbData = appToDb({ ...req, requestedQty: 0 });
      const insertData = { ...dbData, created_by: user?.id } as any;
      const { data, error } = await supabase
        .from('requirements')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return dbToApp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
    },
    onError: (error) => {
      toast.error('Failed to create requirement: ' + error.message);
    },
  });
}

export function useCreateDbRequirements() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reqs: Omit<MaterialRequirement, 'id' | 'requestedQty' | 'pendingQty'>[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      const dbRows = reqs.map(req => ({
        ...appToDb({ ...req, requestedQty: 0 }),
        created_by: user?.id,
      })) as any[];
      const { data, error } = await supabase
        .from('requirements')
        .insert(dbRows)
        .select();
      
      if (error) throw error;
      return (data || []).map(dbToApp);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
    },
    onError: (error) => {
      toast.error('Failed to create requirements: ' + error.message);
    },
  });
}

export function useUpdateDbRequirement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaterialRequirement> & { id: string }) => {
      const dbData = appToDb(updates);
      // Don't send balance_qty - it may be computed
      delete dbData.balance_qty;
      const { data, error } = await supabase
        .from('requirements')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return dbToApp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
    },
    onError: (error) => {
      toast.error('Failed to update requirement: ' + error.message);
    },
  });
}

export function useDeleteDbRequirement() {
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
      toast.success('Requirement deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete requirement: ' + error.message);
    },
  });
}

export function useUpdateDbRequestedQty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: { id: string; qty: number }[]) => {
      // Fetch current values first, then update
      for (const update of updates) {
        const { data: current } = await supabase
          .from('requirements')
          .select('received_qty')
          .eq('id', update.id)
          .maybeSingle();
        
        const newQty = (Number(current?.received_qty) || 0) + update.qty;
        
        await supabase
          .from('requirements')
          .update({ received_qty: newQty })
          .eq('id', update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
    },
    onError: (error) => {
      toast.error('Failed to update quantities: ' + error.message);
    },
  });
}
