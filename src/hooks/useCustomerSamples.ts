import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type T = Database['public']['Tables'];
export type Customer = T['customers']['Row'];
export type CustomerOrder = T['customer_orders']['Row'];
export type Sample = T['samples']['Row'];
export type SampleDispatch = T['sample_dispatches']['Row'];

export const ORDER_STAGES = [
  'Measurement', 'Style Selection', 'Marker Making', 'Cutting', 'Production', 'QC Check', 'Delivered',
] as const;
export const DELIVERED_STAGE = ORDER_STAGES.length - 1;

export interface StageEntry {
  stage: number;
  started_at: string;
  completed_at?: string | null;
  remark?: string | null;
}

type TableName = 'customers' | 'customer_orders' | 'samples' | 'sample_dispatches';

const fail = (e: unknown) => {
  const msg = e instanceof Error ? e.message : 'Something went wrong';
  toast.error(msg.includes('duplicate') ? 'This reference number already exists' : 'Could not save. Please try again.');
};

function useList<R>(table: TableName) {
  return useQuery({
    queryKey: ['cs', table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as R[];
    },
  });
}

function useSave(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, unknown> }) => {
      if (id) {
        const { error } = await supabase.from(table).update(values as never).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(values as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs'] }),
    onError: fail,
  });
}

function useRemove(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    // Optimistic: remove the row instantly, restore on failure
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['cs', table] });
      const prev = qc.getQueryData<{ id: string }[]>(['cs', table]);
      qc.setQueryData<{ id: string }[]>(['cs', table], old => (old ?? []).filter(r => r.id !== id));
      return { prev };
    },
    onError: (e, _id, ctx) => { if (ctx?.prev) qc.setQueryData(['cs', table], ctx.prev); fail(e); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['cs'] }),
  });
}

export const useCustomers = () => useList<Customer>('customers');
export const useSaveCustomer = () => useSave('customers');
export const useDeleteCustomer = () => useRemove('customers');

export const useCustomerOrders = () => useList<CustomerOrder>('customer_orders');
export const useSaveCustomerOrder = () => useSave('customer_orders');
export const useDeleteCustomerOrder = () => useRemove('customer_orders');

export const useSamples = () => useList<Sample>('samples');
export const useSaveSample = () => useSave('samples');
export const useDeleteSample = () => useRemove('samples');

export const useSampleDispatches = () => useList<SampleDispatch>('sample_dispatches');
export const useSaveDispatch = () => useSave('sample_dispatches');
export const useDeleteDispatch = () => useRemove('sample_dispatches');

export async function nextNumber(prefix: string) {
  const { data, error } = await supabase.rpc('next_doc_number', { _prefix: prefix });
  if (error || !data) return `${prefix}-${Date.now().toString().slice(-6)}`;
  return data as string;
}

export const stageHistory = (o: CustomerOrder) => (Array.isArray(o.stage_history) ? (o.stage_history as unknown as StageEntry[]) : []);

export function formatDuration(start?: string | null, end?: string | null) {
  if (!start) return '-';
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  if (ms < 0) return '-';
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

export const fmtDate = (v?: string | null) => (v ? new Date(v.length === 10 ? `${v}T00:00:00` : v).toLocaleDateString('en-US') : '-');
export const fmtDateTime = (v?: string | null) => (v ? new Date(v).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
