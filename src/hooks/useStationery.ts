import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/lib/errorHandler';
import { normalizeText } from '@/hooks/useMaterialCatalog';

export interface StationeryItem {
  id: string;
  itemCode: string;
  description: string;
  uom: string;
  openingStock: number;
  minStock: number;
  sortOrder: number | null;
  createdAt: string;
}

export interface StationeryTxn {
  id: string;
  itemId: string;
  type: 'in' | 'out';
  qty: number;
  transDate: string;
  reference: string;
  notes: string;
  createdAt: string;
}

const ITEMS_KEY = ['stationery_items'];
const TXNS_KEY = ['stationery_transactions'];

export function useStationeryItems() {
  return useQuery({
    queryKey: ITEMS_KEY,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StationeryItem[]> => {
      const { data, error } = await supabase
        .from('stationery_items')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        itemCode: r.item_code || '',
        description: r.description || '',
        uom: r.uom || 'pcs',
        openingStock: Number(r.opening_stock || 0),
        minStock: Number(r.min_stock || 0),
        sortOrder: r.sort_order,
        createdAt: r.created_at,
      }));
    },
  });
}

export function useStationeryTransactions() {
  return useQuery({
    queryKey: TXNS_KEY,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StationeryTxn[]> => {
      const { data, error } = await supabase
        .from('stationery_transactions')
        .select('*')
        .order('trans_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        itemId: r.item_id,
        type: r.type as 'in' | 'out',
        qty: Number(r.qty || 0),
        transDate: r.trans_date,
        reference: r.reference || '',
        notes: r.notes || '',
        createdAt: r.created_at,
      }));
    },
  });
}

export interface StationeryItemInput {
  itemCode: string;
  description: string;
  uom: string;
  openingStock: number;
  minStock: number;
}

export function useCreateStationeryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StationeryItemInput) => {
      const description = normalizeText(input.description);
      const itemCode = normalizeText(input.itemCode);
      if (!description) throw new Error('Description is required');

      const { data: existing } = await supabase
        .from('stationery_items')
        .select('id, item_code, description');
      const descLc = description.toLowerCase();
      const codeLc = itemCode.toLowerCase();
      const dup = (existing || []).find(e =>
        normalizeText(e.description || '').toLowerCase() === descLc &&
        normalizeText(e.item_code || '').toLowerCase() === codeLc
      );
      if (dup) throw new Error('This item already exists in stationery stock');

      const { data: userData } = await supabase.auth.getUser();
      const { data: maxRow } = await supabase
        .from('stationery_items')
        .select('sort_order')
        .order('sort_order', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      const { error } = await supabase.from('stationery_items').insert({
        item_code: itemCode || description.slice(0, 20).toUpperCase(),
        description,
        uom: normalizeText(input.uom) || 'pcs',
        opening_stock: input.openingStock || 0,
        min_stock: input.minStock || 0,
        sort_order: (maxRow?.sort_order ?? 0) + 1,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw new Error(safeErrorMessage(error, 'add stationery item'));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ITEMS_KEY });
      toast.success('Stationery item added');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateStationeryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: StationeryItemInput & { id: string }) => {
      const { error } = await supabase
        .from('stationery_items')
        .update({
          item_code: normalizeText(input.itemCode),
          description: normalizeText(input.description),
          uom: normalizeText(input.uom) || 'pcs',
          opening_stock: input.openingStock || 0,
          min_stock: input.minStock || 0,
        })
        .eq('id', id);
      if (error) throw new Error(safeErrorMessage(error, 'update stationery item'));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ITEMS_KEY });
      toast.success('Item updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteStationeryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stationery_items').delete().eq('id', id);
      if (error) throw new Error(safeErrorMessage(error, 'delete stationery item'));
      return id;
    },
    // Optimistic removal so the row disappears instantly
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ITEMS_KEY });
      const prev = qc.getQueryData<StationeryItem[]>(ITEMS_KEY);
      qc.setQueryData<StationeryItem[]>(ITEMS_KEY, (old) => (old || []).filter(i => i.id !== id));
      return { prev };
    },
    onError: (e: any, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(ITEMS_KEY, ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ITEMS_KEY });
      qc.invalidateQueries({ queryKey: TXNS_KEY });
      toast.success('Item deleted');
    },
  });
}

export interface StationeryTxnInput {
  itemId: string;
  type: 'in' | 'out';
  qty: number;
  transDate: string;
  reference?: string;
  notes?: string;
}

export function useAddStationeryTxn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StationeryTxnInput) => {
      if (!input.qty || input.qty <= 0) throw new Error('Quantity must be greater than 0');
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('stationery_transactions').insert({
        item_id: input.itemId,
        type: input.type,
        qty: input.qty,
        trans_date: input.transDate,
        reference: normalizeText(input.reference || '') || null,
        notes: normalizeText(input.notes || '') || null,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw new Error(safeErrorMessage(error, 'save stock entry'));
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: TXNS_KEY });
      toast.success(vars.type === 'in' ? 'Stock in recorded' : 'Stock out recorded');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteStationeryTxn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stationery_transactions').delete().eq('id', id);
      if (error) throw new Error(safeErrorMessage(error, 'delete entry'));
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: TXNS_KEY });
      const prev = qc.getQueryData<StationeryTxn[]>(TXNS_KEY);
      qc.setQueryData<StationeryTxn[]>(TXNS_KEY, (old) => (old || []).filter(t => t.id !== id));
      return { prev };
    },
    onError: (e: any, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(TXNS_KEY, ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TXNS_KEY });
      toast.success('Entry deleted');
    },
  });
}

/** Compute per-item totals from transactions. */
export function computeStock(items: StationeryItem[], txns: StationeryTxn[]) {
  const byItem = new Map<string, { totalIn: number; totalOut: number }>();
  for (const t of txns) {
    const agg = byItem.get(t.itemId) || { totalIn: 0, totalOut: 0 };
    if (t.type === 'in') agg.totalIn += t.qty; else agg.totalOut += t.qty;
    byItem.set(t.itemId, agg);
  }
  return items.map(item => {
    const agg = byItem.get(item.id) || { totalIn: 0, totalOut: 0 };
    const balance = item.openingStock + agg.totalIn - agg.totalOut;
    return {
      ...item,
      totalIn: agg.totalIn,
      totalOut: agg.totalOut,
      balance,
      isLow: item.minStock > 0 && balance <= item.minStock,
    };
  });
}

export type StockRow = ReturnType<typeof computeStock>[number];
