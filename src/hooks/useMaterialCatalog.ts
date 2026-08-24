import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CatalogItem {
  id: string;
  itemCode: string;
  description: string;
  uom: string;
}

export const normalizeText = (s: string) => (s || '').trim().replace(/\s+/g, ' ');

const KEY = ['material_catalog'];

export function useMaterialCatalog() {
  return useQuery({
    queryKey: KEY,
    // Catalog changes rarely; cache for the whole session. Mutations invalidate explicitly.
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<CatalogItem[]> => {
      const { data, error } = await supabase
        .from('material_catalog')
        .select('id, item_code, description, uom')
        .order('description', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        itemCode: r.item_code || '',
        description: r.description || '',
        uom: r.uom || 'pcs',
      }));
    },
  });
}

export function useCreateCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<CatalogItem, 'id'>) => {
      const description = normalizeText(item.description);
      const itemCode = normalizeText(item.itemCode);
      const uom = normalizeText(item.uom) || 'pcs';
      if (!description) throw new Error('Description is required');

      // Check for duplicate: full description AND item code must both match (case-insensitive, normalized)
      const { data: existing } = await supabase
        .from('material_catalog')
        .select('id, description, item_code');
      const descLc = description.toLowerCase();
      const codeLc = itemCode.toLowerCase();
      const dup = (existing || []).find(e => {
        const eDesc = normalizeText(e.description || '').toLowerCase();
        const eCode = normalizeText(e.item_code || '').toLowerCase();
        return eDesc === descLc && eCode === codeLc;
      });
      if (dup) {
        throw new Error('An item with the same description and item code already exists');
      }

      const { data, error } = await supabase
        .from('material_catalog')
        .insert({ item_code: itemCode || description.slice(0, 20).toUpperCase(), description, uom })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Item added to catalog');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: CatalogItem) => {
      const description = normalizeText(item.description);
      const itemCode = normalizeText(item.itemCode);
      const uom = normalizeText(item.uom) || 'pcs';
      if (!description) throw new Error('Description is required');
      const { error } = await supabase
        .from('material_catalog')
        .update({ item_code: itemCode, description, uom })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Item updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('material_catalog').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Item deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
