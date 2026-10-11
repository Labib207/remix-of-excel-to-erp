import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import {
  Sample, SampleDispatch, CustomerOrder, useSampleHistory, useSamplePhotoUrls, fmtDate, fmtDateTime,
} from '@/hooks/useCustomerSamples';
import { typeLabel, statusLabel, actionLabel, reviewReasons } from '@/lib/sampleRules';
import { sampleGatePass } from '@/lib/customerSamplesPdf';

const FIELD_LABELS: Record<string, string> = {
  ref_no: 'Sample ID', sample_type: 'Type', order_id: 'Linked order', style_name: 'Style', size: 'Size', color: 'Color',
  total_qty: 'Quantity', status: 'Status', location: 'Location', made_date: 'Date made', keep_until: 'Keep until',
  final_action: 'Final action', golden: 'Golden', photos: 'Photos', description: 'Description', remarks: 'Remarks', notes: 'Notes',
};

const show = (k: string, v: unknown) => {
  if (v === null || v === undefined || v === '') return '—';
  if (k === 'status') return statusLabel(String(v));
  if (k === 'sample_type') return typeLabel(String(v));
  if (k === 'final_action') return actionLabel(String(v));
  if (k === 'golden') return v ? 'Yes' : 'No';
  if (k === 'photos') return `${(v as unknown[]).length} photo(s)`;
  if (k === 'order_id') return 'changed';
  return String(v);
};

export function SampleDetailDialog({ sample, all, dispatches, order, onClose }: {
  sample: Sample | null; all: Sample[]; dispatches: SampleDispatch[]; order?: CustomerOrder; onClose: () => void;
}) {
  const { data: history = [] } = useSampleHistory(sample?.id);
  const { data: urls = {} } = useSamplePhotoUrls(sample?.photos ?? []);
  if (!sample) return null;
  const passes = dispatches.filter(d => d.sample_id === sample.id);
  const reasons = reviewReasons(sample, all);
  const info: [string, string][] = [
    ['Type', typeLabel(sample.sample_type)], ['Status', statusLabel(sample.status)], ['Style', sample.style_name],
    ['Linked order', order ? `${order.order_no} · ${order.customer_name}` : '-'], ['Size', sample.size || '-'], ['Color', sample.color || '-'],
    ['Quantity', String(sample.total_qty)], ['Location', sample.location || '-'], ['Date made', fmtDate(sample.made_date)],
    ['Keep until', fmtDate(sample.keep_until)], ['Final action', actionLabel(sample.final_action)], ['Golden', sample.golden ? 'Yes' : 'No'],
  ];

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-normal">{sample.ref_no} · {sample.style_name}</DialogTitle></DialogHeader>
        <div className="grid gap-4 text-sm">
          {reasons.length > 0 && <div className="flex flex-wrap gap-1">{reasons.map(r => <Badge key={r} variant="destructive">{r}</Badge>)}</div>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            {info.map(([k, v]) => <div key={k}><p className="text-xs text-muted-foreground">{k}</p><p>{v}</p></div>)}
          </div>
          {(sample.description || sample.remarks) && <div>
            {sample.description && <p><span className="text-muted-foreground">Description: </span>{sample.description}</p>}
            {sample.remarks && <p><span className="text-muted-foreground">Remarks: </span>{sample.remarks}</p>}
          </div>}
          {sample.photos.length > 0 && <div className="flex flex-wrap gap-2">
            {sample.photos.map(p => urls[p] && <a key={p} href={urls[p]} target="_blank" rel="noreferrer"><img src={urls[p]} alt="Sample" className="h-28 w-28 rounded border border-border object-cover" /></a>)}
          </div>}

          <div>
            <h3 className="mb-2">Gate Pass History</h3>
            {passes.length === 0 ? <p className="text-muted-foreground">No gate passes yet</p> : (
              <div className="grid gap-2">
                {passes.map(d => (
                  <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border px-4 py-3">
                    <div>
                      <span className="font-mono">{d.gate_pass_no}</span> · <span className="capitalize">{d.pass_type}</span> · {d.sent_to} · Qty {d.qty} · {fmtDate(d.sent_date)}
                      {d.reason && <p className="text-xs text-muted-foreground">Reason: {d.reason}</p>}
                      {d.pass_type === 'sent' && d.status === 'returned' && <p className="text-xs text-muted-foreground">Back in store {fmtDate(d.return_date)} · {d.return_condition}</p>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => sampleGatePass(d, sample, 'print')}><Printer className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2">Change History</h3>
            {history.length === 0 ? <p className="text-muted-foreground">No changes recorded</p> : (
              <div className="grid gap-2">
                {history.map(h => {
                  const changes = (h.changes ?? {}) as Record<string, { from?: unknown; to?: unknown } | unknown>;
                  return (
                    <div key={h.id} className="rounded border border-border px-4 py-3">
                      <p className="text-xs text-muted-foreground">{fmtDateTime(h.created_at)} · {h.changed_by_email || 'system'} · {h.action}</p>
                      {h.action === 'updated' && Object.entries(changes).map(([k, c]) => {
                        const ch = c as { from?: unknown; to?: unknown };
                        return <p key={k}>{FIELD_LABELS[k] ?? k}: {show(k, ch.from)} → {show(k, ch.to)}</p>;
                      })}
                      {h.action === 'created' && <p>Sample added to store</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
