import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sample, useCustomerOrders, useSaveSample, nextNumber, uploadSamplePhotos, useSamplePhotoUrls,
} from '@/hooks/useCustomerSamples';
import {
  SAMPLE_TYPES, SAMPLE_STATUSES, FINAL_ACTIONS, LEAVING_STATUSES, suggestKeepUntil, todayStr, statusLabel,
} from '@/lib/sampleRules';

type Form = {
  ref_no: string; sample_type: string; order_id: string | null; style_name: string; size: string; color: string;
  total_qty: string; status: string; location: string; made_date: string; keep_until: string; final_action: string;
  golden: boolean; photos: string[]; description: string; remarks: string;
};

const blank = (): Form => ({
  ref_no: '', sample_type: '', order_id: null, style_name: '', size: '', color: '', total_qty: '1', status: 'waiting_approval',
  location: '', made_date: todayStr(), keep_until: '', final_action: '', golden: false, photos: [], description: '', remarks: '',
});

export function SampleFormDialog({ open, onOpenChange, sample }: { open: boolean; onOpenChange: (v: boolean) => void; sample: Sample | null }) {
  const { data: orders = [] } = useCustomerOrders();
  const save = useSaveSample();
  const [form, setForm] = useState<Form>(blank());
  const [keepTouched, setKeepTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { data: urls = {} } = useSamplePhotoUrls(form.photos);

  useEffect(() => {
    if (!open) return;
    setKeepTouched(!!sample);
    if (sample) {
      setForm({
        ref_no: sample.ref_no, sample_type: sample.sample_type, order_id: sample.order_id, style_name: sample.style_name,
        size: sample.size ?? '', color: sample.color ?? '', total_qty: String(sample.total_qty), status: sample.status,
        location: sample.location ?? '', made_date: sample.made_date ?? '', keep_until: sample.keep_until ?? '',
        final_action: sample.final_action ?? '', golden: sample.golden, photos: sample.photos ?? [],
        description: sample.description ?? '', remarks: sample.remarks ?? '',
      });
    } else {
      const f = blank();
      setForm(f);
      nextNumber('SMP').then(ref_no => setForm(p => ({ ...p, ref_no })));
    }
  }, [open, sample]);

  // Auto-suggest keep-until from type/status/order until the user edits it
  const update = (patch: Partial<Form>) => setForm(prev => {
    const next = { ...prev, ...patch };
    if (!keepTouched && next.sample_type) {
      next.keep_until = suggestKeepUntil(next.sample_type, next.status, next.made_date, orders.find(o => o.id === next.order_id));
    }
    return next;
  });

  const pickOrder = (id: string) => {
    const o = orders.find(x => x.id === id);
    update({ order_id: o?.id ?? null, style_name: form.style_name || o?.style || '' });
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const paths = await uploadSamplePhotos(Array.from(files));
    setForm(p => ({ ...p, photos: [...p.photos, ...paths] }));
    setUploading(false);
  };

  const submit = async () => {
    if (!form.sample_type) return toast.error('Sample type is required');
    if (!form.ref_no.trim() || !form.style_name.trim()) return toast.error('Sample ID and style name are required');
    await save.mutateAsync({
      id: sample?.id,
      values: {
        ref_no: form.ref_no.trim(), sample_type: form.sample_type, order_id: form.order_id, style_name: form.style_name.trim(),
        size: form.size || null, color: form.color || null, total_qty: parseFloat(form.total_qty) || 0, status: form.status,
        location: form.location || null, made_date: form.made_date || null, keep_until: form.keep_until || null,
        final_action: form.final_action || null, golden: form.golden, photos: form.photos,
        description: form.description || null, remarks: form.remarks || null,
      },
    });
    toast.success('Sample saved');
    onOpenChange(false);
  };

  const locked = LEAVING_STATUSES.includes(form.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-normal">{sample ? `Edit ${sample.ref_no}` : 'Add Sample to Store'}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Sample ID</Label><Input value={form.ref_no} onChange={e => setForm({ ...form, ref_no: e.target.value })} /></div>
            <div><Label>Sample Type *</Label>
              <Select value={form.sample_type} onValueChange={v => update({ sample_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{SAMPLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Linked Customer Order</Label>
              <Select value={form.order_id ?? 'none'} onValueChange={v => (v === 'none' ? update({ order_id: null }) : pickOrder(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {orders.map(o => <SelectItem key={o.id} value={o.id}>{o.order_no} · {o.customer_name}{o.style ? ` · ${o.style}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Style Name *</Label><Input value={form.style_name} onChange={e => setForm({ ...form, style_name: e.target.value })} /></div>
            <div><Label>Size</Label><Input value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} /></div>
            <div><Label>Color</Label><Input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /></div>
            <div><Label>Quantity</Label><Input type="number" step="any" value={form.total_qty} onChange={e => setForm({ ...form, total_qty: e.target.value })} /></div>
            <div><Label>Status</Label>
              {locked ? <Input value={`${statusLabel(form.status)} (set by gate pass)`} disabled /> : (
                <Select value={form.status} onValueChange={v => update({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SAMPLE_STATUSES.filter(s => !LEAVING_STATUSES.includes(s.value)).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div><Label>Location (Rack / Shelf)</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Date Made</Label><Input type="date" value={form.made_date} onChange={e => update({ made_date: e.target.value })} /></div>
            <div><Label>Keep Until</Label>
              <Input type="date" value={form.keep_until} onChange={e => { setKeepTouched(true); setForm({ ...form, keep_until: e.target.value }); }} />
              {!keepTouched && form.sample_type && <p className="text-xs text-muted-foreground mt-1">Suggested from type{form.sample_type === 'approval' && !form.keep_until ? ' — set when order is delivered' : ''}</p>}
            </div>
            <div><Label>Final Action</Label>
              <Select value={form.final_action || 'none'} onValueChange={v => setForm({ ...form, final_action: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Not decided —</SelectItem>
                  {FINAL_ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.golden} onCheckedChange={v => setForm({ ...form, golden: !!v })} />
            Golden sample (approved production reference)
          </label>
          <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>Photos</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {form.photos.map(p => (
                <div key={p} className="relative h-20 w-20 rounded border border-border overflow-hidden bg-muted">
                  {urls[p] && <img src={urls[p]} alt="Sample" className="h-full w-full object-cover" />}
                  <button type="button" className="absolute right-0 top-0 rounded-bl bg-background/80 p-0.5" onClick={() => setForm({ ...form, photos: form.photos.filter(x => x !== p) })}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded border border-dashed border-border text-muted-foreground">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} />
              </label>
            </div>
          </div>
          <div><Label>Remarks</Label><Textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
          <Button onClick={submit} disabled={save.isPending || uploading}>Save Sample</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
