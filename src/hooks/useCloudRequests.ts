import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/lib/errorHandler';

export type ApprovalStatus = 'approved' | 'not_approved' | 'hold';

export interface CloudRequest {
  id: string;
  request_no: string;
  request_date: string;
  order_id: string | null;
  department: string | null;
  requested_by: string | null;
  status: string;
  approval_status: ApprovalStatus;
  submitted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
  created_by: string | null;
  // Joined data
  order_no?: string;
  items?: CloudRequestItem[];
}

export interface CloudRequestItem {
  id: string;
  request_id: string | null;
  item_code: string | null;
  description: string | null;
  color: string | null;
  size: string | null;
  unit: string | null;
  requested_qty: number;
  issued_qty: number;
  balance_qty: number | null;
  notes: string | null;
  sort_order: number | null;
}

// Derive type from request_no prefix
export function getRequestType(requestNo: string): 'raw-material' | 'general-supplies' | 'material-return' {
  if (requestNo?.startsWith('RMR') || requestNo?.startsWith('RM')) return 'raw-material';
  if (requestNo?.startsWith('GSR') || requestNo?.startsWith('GS')) return 'general-supplies';
  if (requestNo?.startsWith('MRS') || requestNo?.startsWith('MR')) return 'material-return';
  return 'raw-material';
}

export function useCloudRequests() {
  return useQuery({
    queryKey: ['cloud-requests'],
    queryFn: async () => {
      // Fetch requests
      const { data: requests, error: reqError } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });

      if (reqError) throw reqError;
      if (!requests || requests.length === 0) return [];

      // Fetch all items for these requests
      const requestIds = requests.map(r => r.id);
      const { data: items, error: itemsError } = await supabase
        .from('request_items')
        .select('*')
        .in('request_id', requestIds)
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch order names
      const orderIds = [...new Set(requests.map(r => r.order_id).filter(Boolean))];
      let ordersMap: Record<string, string> = {};
      if (orderIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, order_no')
          .in('id', orderIds);
        (ordersData || []).forEach(o => { ordersMap[o.id] = o.order_no; });
      }

      // Map items to requests
      const itemsByRequest = new Map<string, CloudRequestItem[]>();
      (items || []).forEach(item => {
        const list = itemsByRequest.get(item.request_id || '') || [];
        list.push(item as CloudRequestItem);
        itemsByRequest.set(item.request_id || '', list);
      });

      return requests.map(r => ({
        ...r,
        order_no: r.order_id ? ordersMap[r.order_id] : undefined,
        items: itemsByRequest.get(r.id) || [],
      })) as CloudRequest[];
    },
  });
}

export function useSubmitCloudRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestNo,
      requestDate,
      orderId,
      department,
      requestedBy,
      notes,
      items,
    }: {
      requestNo: string;
      requestDate: string;
      orderId?: string;
      department?: string;
      requestedBy?: string;
      notes?: string;
      items: {
        item_code?: string;
        description?: string;
        color?: string;
        size?: string;
        unit?: string;
        requested_qty: number;
        issued_qty?: number;
        notes?: string;
        sort_order?: number;
        requirement_id?: string;
      }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Insert request
      const { data: request, error: reqError } = await supabase
        .from('requests')
        .insert({
          request_no: requestNo,
          request_date: requestDate,
          order_id: orderId || null,
          department: department || null,
          requested_by: requestedBy || null,
          notes: notes || null,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // Insert items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, idx) => ({
          request_id: request.id,
          item_code: item.item_code || null,
          description: item.description || null,
          color: item.color || null,
          size: item.size || null,
          unit: item.unit || 'pcs',
          requested_qty: item.requested_qty,
          issued_qty: item.issued_qty || 0,
          notes: item.notes || null,
          sort_order: item.sort_order ?? idx + 1,
          requirement_id: item.requirement_id || null,
        }));

        const { error: itemsError } = await supabase
          .from('request_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud-requests'] });
    },
    onError: (error) => {
      console.error('Failed to save request to cloud:', error);
    },
  });
}

export function useUpdateCloudRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      requestNo,
      requestDate,
      orderId,
      department,
      requestedBy,
      notes,
      items,
    }: {
      requestId: string;
      requestNo: string;
      requestDate: string;
      orderId?: string;
      department?: string;
      requestedBy?: string;
      notes?: string;
      items: {
        item_code?: string;
        description?: string;
        color?: string;
        size?: string;
        unit?: string;
        requested_qty: number;
        issued_qty?: number;
        notes?: string;
        sort_order?: number;
        requirement_id?: string;
      }[];
    }) => {
      // Update request row
      const { error: updErr } = await supabase
        .from('requests')
        .update({
          request_no: requestNo,
          request_date: requestDate,
          order_id: orderId || null,
          department: department || null,
          requested_by: requestedBy || null,
          notes: notes || null,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      if (updErr) throw updErr;

      // Replace items
      const { error: delErr } = await supabase
        .from('request_items')
        .delete()
        .eq('request_id', requestId);
      if (delErr) throw delErr;

      if (items.length > 0) {
        const itemsToInsert = items.map((item, idx) => ({
          request_id: requestId,
          item_code: item.item_code || null,
          description: item.description || null,
          color: item.color || null,
          size: item.size || null,
          unit: item.unit || 'pcs',
          requested_qty: item.requested_qty,
          issued_qty: item.issued_qty || 0,
          notes: item.notes || null,
          sort_order: item.sort_order ?? idx + 1,
          requirement_id: item.requirement_id || null,
        }));
        const { error: insErr } = await supabase
          .from('request_items')
          .insert(itemsToInsert);
        if (insErr) throw insErr;
      }

      return { id: requestId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud-requests'] });
    },
    onError: (error) => {
      console.error('Failed to update request in cloud:', error);
    },
  });
}

export function useDeleteCloudRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      // Delete items first
      await supabase.from('request_items').delete().eq('request_id', requestId);
      // Delete request
      const { error } = await supabase.from('requests').delete().eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud-requests'] });
    },
  });
}

export function useUpdateApprovalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, approvalStatus }: { requestId: string; approvalStatus: ApprovalStatus }) => {
      const { error } = await supabase
        .from('requests')
        .update({ approval_status: approvalStatus } as any)
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud-requests'] });
    },
  });
}
