import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Sample, useSaveDispatch, useSaveSample, nextNumber } from '@/hooks/useCustomerSamples';
import { CustomerPicker } from './CustomerPicker';
import { useAuth } from '@/contexts/AuthContext';
import { todayStr } from '@/lib/sampleRules';

export type PassType = 'sent' | 'returned' | 'disposed';

const PASS_LABEL: Record<PassType, string> = { sent: 'Send out (comes back)', returned: 'Return to owner / customer', disposed: 'Dispose' };

export function GatePassDialog({ sample, initialType, onClose }: { sample: Sample | null; initialType: PassType; onClose: () => void }) {
  const { user } = useAuth();
  const saveDispatch = useSaveDispatch();
  const saveSample = useSaveSample();
  const [f, setF] = useState({
    pass_type: initialType as PassType, customer_id: null as string | null, sent_to: '', mobile: '', qty: '1', purpose: 'Approval',
    sent_date: todayStr(), expected_return: '', dispatched_by: '', reason: '',
  });

  useEffect(() => {
    if (!sample) return;
    setF({
      pass_type: initialType, customer_id: null, sent_to: initialType === 'disposed' ? 'Disposal' : '', mobile: '', qty: String(sample.total_qty),
      purpose: 'Approval', sent_date: todayStr(), expected_return: '', dispatched_by: user?.email?.split('@')[0] ?? '', reason: '',
    });
  }, [sample, initialType, user]);

  if (!sample) return null;

  const submit = async () => {
    const qty = parseFloat(f.qty) || 0;
    if (!f.sent_to.trim()) return toast.error('"Sent to" name is required');
    if (qty <= 0) return toast.error('Quantity must be more than zero');
    if (f.pass_type === 'disposed' && !f.reason.trim()) return toast.error('A reason is required to dispose a sample');
    const gate_pass_no = await nextNumber('GP');
    await saveDispatch.mutateAsync({ values: {
      gate_pass_no, sample_id: sample.id, customer_id: f.customer_id, sent_to: f.sent_to.trim(), mobile: f.mobile || null, qty,
      purpose: f.pass_type === 'sent' ? f.purpose : f.pass_type === 'returned' ? 'Return' : 'Disposal',
      sent_date: f.sent_date, expected_return: f.pass_type === 'sent' ? f.expected_return || null : null,
      dispatched_by: f.dispatched_by || null, pass_type: f.pass_type, reason: f.reason || null, prev_status: sample.status,
      status: f.pass_type === 'sent' ? 'out' : 'kept',
    } });
    await saveSample.mutateAsync({ id: sample.id, values: {
      status: f.pass_type, final_action: f.pass_type === 'disposed' ? 'dispose' : f.pass_type === 'sent' ? 'send' : sample.final_action,
    } });
    toast.success(`Gate pass ${gate_pass_no} created`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-normal">Gate Pass — {sample.ref_no} · {sample.style_name}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Gate Pass Type</Label>
            <Select value={f.pass_type} onValueChange={v => setF({ ...f, pass_type: v as PassType, sent_to: v === 'disposed' ? f.sent_to || 'Disposal' : f.sent_to })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(PASS_LABEL) as PassType[]).map(k => <SelectItem key={k} value={k}>{PASS_LABEL[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {f.pass_type !== 'disposed' && <CustomerPicker value={f.customer_id} onPick={c => setF({ ...f, customer_id: c?.id ?? null, sent_to: c?.name ?? f.sent_to, mobile: c?.mobile ?? f.mobile })} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>{f.pass_type === 'disposed' ? 'Disposed To / Method *' : 'Sent To *'}</Label><Input value={f.sent_to} onChange={e => setF({ ...f, sent_to: e.target.value })} /></div>
            <div><Label>Mobile</Label><Input value={f.mobile} onChange={e => setF({ ...f, mobile: e.target.value })} /></div>
            <div><Label>Quantity</Label><Input type="number" step="any" value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} /></div>
            {f.pass_type === 'sent' && <div><Label>Purpose</Label>
              <Select value={f.purpose} onValueChange={v => setF({ ...f, purpose: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Approval', 'Fitting', 'Exhibition', 'Reference', 'Other'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>}
            <div><Label>Date</Label><Input type="date" value={f.sent_date} onChange={e => setF({ ...f, sent_date: e.target.value })} /></div>
            {f.pass_type === 'sent' && <div><Label>Expected Return</Label><Input type="date" value={f.expected_return} onChange={e => setF({ ...f, expected_return: e.target.value })} /></div>}
          </div>
          <div><Label>Dispatched By</Label><Input value={f.dispatched_by} onChange={e => setF({ ...f, dispatched_by: e.target.value })} /></div>
          <div><Label>Reason{f.pass_type === 'disposed' ? ' *' : ''}</Label><Textarea value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></div>
          <Button onClick={submit} disabled={saveDispatch.isPending || saveSample.isPending}>Create Gate Pass</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
