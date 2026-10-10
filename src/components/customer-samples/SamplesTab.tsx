import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, Send, Undo2, Printer, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sample, SampleDispatch, useSamples, useSaveSample, useDeleteSample, useSampleDispatches, useSaveDispatch,
  useDeleteDispatch, nextNumber, fmtDate,
} from '@/hooks/useCustomerSamples';
import { CustomerPicker } from './CustomerPicker';
import { sampleGatePass } from '@/lib/customerSamplesPdf';
import { useAuth } from '@/contexts/AuthContext';

const today = () => new Date().toISOString().slice(0, 10);
const matches = (t: string, q: string) => q.trim().toLowerCase().split(/\s+/).filter(Boolean).every(w => t.toLowerCase().includes(w));
const emptySample = { ref_no: '', style_name: '', description: '', location: '', total_qty: '1', notes: '' };

export function SamplesTab() {
  const { user } = useAuth();
  const { data: samples = [] } = useSamples();
  const { data: dispatches = [] } = useSampleDispatches();
  const saveSample = useSaveSample();
  const delSample = useDeleteSample();
  const saveDispatch = useSaveDispatch();
  const delDispatch = useDeleteDispatch();

  const [q, setQ] = useState('');
  const [logFilter, setLogFilter] = useState<'out' | 'all'>('out');
  const [sampleOpen, setSampleOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [sForm, setSForm] = useState(emptySample);
  const [dispatchOf, setDispatchOf] = useState<Sample | null>(null);
  const [dForm, setDForm] = useState({ customer_id: null as string | null, sent_to: '', mobile: '', qty: '1', purpose: 'Approval', sent_date: today(), expected_return: '', dispatched_by: '' });
  const [returnOf, setReturnOf] = useState<SampleDispatch | null>(null);
  const [rForm, setRForm] = useState({ status: 'returned', return_date: today(), returned_by: '', return_condition: 'Good', return_remarks: '' });

  // One pass over gate passes instead of re-scanning per sample row
  const qtyMaps = useMemo(() => {
    const out = new Map<string, number>(); const kept = new Map<string, number>();
    for (const d of dispatches) {
      const m = d.status === 'out' ? out : d.status === 'kept' ? kept : null;
      if (m) m.set(d.sample_id, (m.get(d.sample_id) ?? 0) + Number(d.qty));
    }
    return { out, kept };
  }, [dispatches]);
  const outQty = (id: string) => qtyMaps.out.get(id) ?? 0;
  const keptQty = (id: string) => qtyMaps.kept.get(id) ?? 0;
  const available = (s: Sample) => Number(s.total_qty) - outQty(s.id) - keptQty(s.id);
  const sampleById = useMemo(() => new Map(samples.map(s => [s.id, s])), [samples]);

  const sampleRows = samples.filter(s => matches(`${s.ref_no} ${s.style_name} ${s.description ?? ''} ${s.location ?? ''}`, q));
  const logRows = dispatches.filter(d => (logFilter === 'all' || d.status === 'out') &&
    matches(`${d.gate_pass_no} ${d.sent_to} ${sampleById.get(d.sample_id)?.ref_no ?? ''} ${sampleById.get(d.sample_id)?.style_name ?? ''}`, q));

  const openSample = async (s?: Sample) => {
    setEditId(s?.id);
    setSForm(s ? { ref_no: s.ref_no, style_name: s.style_name, description: s.description ?? '', location: s.location ?? '', total_qty: String(s.total_qty), notes: s.notes ?? '' }
      : { ...emptySample, ref_no: await nextNumber('SMP') });
    setSampleOpen(true);
  };

  const submitSample = async () => {
    if (!sForm.ref_no.trim() || !sForm.style_name.trim()) return toast.error('Reference number and style name are required');
    await saveSample.mutateAsync({ id: editId, values: { ...sForm, ref_no: sForm.ref_no.trim(), style_name: sForm.style_name.trim(), total_qty: parseFloat(sForm.total_qty) || 0 } });
    toast.success('Sample saved'); setSampleOpen(false);
  };

  const openDispatch = (s: Sample) => {
    setDispatchOf(s);
    setDForm({ customer_id: null, sent_to: '', mobile: '', qty: '1', purpose: 'Approval', sent_date: today(), expected_return: '', dispatched_by: user?.email?.split('@')[0] ?? '' });
  };

  const submitDispatch = async () => {
    if (!dispatchOf) return;
    const qty = parseFloat(dForm.qty) || 0;
    if (!dForm.sent_to.trim()) return toast.error('Recipient name is required');
    if (qty <= 0 || qty > available(dispatchOf)) return toast.error(`Only ${available(dispatchOf)} available in store`);
    const gate_pass_no = await nextNumber('GP');
    await saveDispatch.mutateAsync({ values: {
      gate_pass_no, sample_id: dispatchOf.id, customer_id: dForm.customer_id, sent_to: dForm.sent_to.trim(), mobile: dForm.mobile || null,
      qty, purpose: dForm.purpose || null, sent_date: dForm.sent_date, expected_return: dForm.expected_return || null, dispatched_by: dForm.dispatched_by || null,
    } });
    toast.success(`Gate pass ${gate_pass_no} created`);
    setDispatchOf(null);
  };

  const submitReturn = async () => {
    if (!returnOf) return;
    await saveDispatch.mutateAsync({ id: returnOf.id, values: { ...rForm, returned_by: rForm.returned_by || null, return_remarks: rForm.return_remarks || null } });
    toast.success(rForm.status === 'returned' ? 'Sample returned to store' : 'Marked as kept by client');
    setReturnOf(null);
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-normal">Sample Store ({samples.length})</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 w-56" placeholder="Search samples / gate pass" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <Button onClick={() => openSample()}><Plus className="h-4 w-4 mr-1" />Add Sample</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Ref No</TableHead><TableHead>Style Name</TableHead><TableHead>Description</TableHead><TableHead>Location</TableHead>
              <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Outside</TableHead><TableHead className="text-right">In Store</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {sampleRows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No samples yet</TableCell></TableRow>}
              {sampleRows.map(s => {
                const avail = available(s); const out = outQty(s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="px-4 py-3 font-mono text-sm">{s.ref_no}</TableCell>
                    <TableCell className="px-4 py-3">{s.style_name}</TableCell>
                    <TableCell className="px-4 py-3 max-w-[200px] truncate">{s.description || '-'}</TableCell>
                    <TableCell className="px-4 py-3">{s.location || '-'}</TableCell>
                    <TableCell className="px-4 py-3 text-right">{s.total_qty}</TableCell>
                    <TableCell className="px-4 py-3 text-right">{out ? <Badge variant="destructive">{out}</Badge> : 0}</TableCell>
                    <TableCell className="px-4 py-3 text-right">{avail}</TableCell>
                    <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" disabled={avail <= 0} onClick={() => openDispatch(s)}><Send className="h-4 w-4 mr-1" />Send Out</Button>
                      <Button size="icon" variant="ghost" onClick={() => openSample(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm(`Delete sample ${s.ref_no} and its gate pass history?`) && delSample.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-normal">Gate Pass & Returns</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={logFilter === 'out' ? 'default' : 'outline'} onClick={() => setLogFilter('out')}>Currently Outside</Button>
            <Button size="sm" variant={logFilter === 'all' ? 'default' : 'outline'} onClick={() => setLogFilter('all')}>All History</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Gate Pass</TableHead><TableHead>Sample</TableHead><TableHead>Sent To</TableHead><TableHead className="text-right">Qty</TableHead>
              <TableHead>Purpose</TableHead><TableHead>Sent</TableHead><TableHead>Return</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {logRows.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nothing here</TableCell></TableRow>}
              {logRows.map(d => {
                const s = sampleById.get(d.sample_id);
                const late = d.status === 'out' && d.expected_return && d.expected_return < today();
                return (
                  <TableRow key={d.id}>
                    <TableCell className="px-4 py-3 font-mono text-sm">{d.gate_pass_no}</TableCell>
                    <TableCell className="px-4 py-3">{s ? `${s.ref_no} · ${s.style_name}` : '-'}</TableCell>
                    <TableCell className="px-4 py-3">{d.sent_to}{d.mobile && <div className="text-xs text-muted-foreground">{d.mobile}</div>}</TableCell>
                    <TableCell className="px-4 py-3 text-right">{d.qty}</TableCell>
                    <TableCell className="px-4 py-3">{d.purpose || '-'}</TableCell>
                    <TableCell className="px-4 py-3">{fmtDate(d.sent_date)}<div className="text-xs text-muted-foreground">by {d.dispatched_by || '-'}</div></TableCell>
                    <TableCell className="px-4 py-3">
                      {d.status === 'out' ? <span className={late ? 'text-destructive' : ''}>Exp. {fmtDate(d.expected_return)}</span>
                        : <>{fmtDate(d.return_date)}<div className="text-xs text-muted-foreground">{d.returned_by || '-'} · {d.return_condition || '-'}</div></>}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {d.status === 'out' ? <Badge variant="destructive">Outside</Badge> : d.status === 'returned' ? <Badge variant="secondary">Returned</Badge> : <Badge variant="outline">Kept by client</Badge>}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                      {d.status === 'out' && <Button size="sm" variant="outline" onClick={() => { setReturnOf(d); setRForm({ status: 'returned', return_date: today(), returned_by: d.sent_to, return_condition: 'Good', return_remarks: '' }); }}><Undo2 className="h-4 w-4 mr-1" />Return</Button>}
                      <Button size="icon" variant="ghost" onClick={() => sampleGatePass(d, s, 'print')}><Printer className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => sampleGatePass(d, s, 'download')}><FileDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm(`Delete gate pass ${d.gate_pass_no}?`) && delDispatch.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-normal">{editId ? 'Edit Sample' : 'Add Sample to Store'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Reference No *</Label><Input value={sForm.ref_no} onChange={e => setSForm({ ...sForm, ref_no: e.target.value })} /></div>
              <div><Label>Style Name *</Label><Input value={sForm.style_name} onChange={e => setSForm({ ...sForm, style_name: e.target.value })} /></div>
              <div><Label>Location (Rack / Shelf)</Label><Input value={sForm.location} onChange={e => setSForm({ ...sForm, location: e.target.value })} /></div>
              <div><Label>Quantity in Store</Label><Input type="number" step="any" value={sForm.total_qty} onChange={e => setSForm({ ...sForm, total_qty: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Input value={sForm.description} onChange={e => setSForm({ ...sForm, description: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={sForm.notes} onChange={e => setSForm({ ...sForm, notes: e.target.value })} /></div>
            <Button onClick={submitSample} disabled={saveSample.isPending}>Save Sample</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dispatchOf} onOpenChange={v => !v && setDispatchOf(null)}>
        <DialogContent className="max-w-lg">
          {dispatchOf && <>
            <DialogHeader><DialogTitle className="font-normal">Send Out {dispatchOf.ref_no} · {dispatchOf.style_name}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">Available in store: {available(dispatchOf)} · Location {dispatchOf.location || '-'}</p>
              <CustomerPicker value={dForm.customer_id} onPick={c => setDForm({ ...dForm, customer_id: c?.id ?? null, sent_to: c?.name ?? dForm.sent_to, mobile: c?.mobile ?? dForm.mobile })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Sent To *</Label><Input value={dForm.sent_to} onChange={e => setDForm({ ...dForm, sent_to: e.target.value })} /></div>
                <div><Label>Mobile</Label><Input value={dForm.mobile} onChange={e => setDForm({ ...dForm, mobile: e.target.value })} /></div>
                <div><Label>Quantity</Label><Input type="number" step="any" value={dForm.qty} onChange={e => setDForm({ ...dForm, qty: e.target.value })} /></div>
                <div><Label>Purpose</Label>
                  <Select value={dForm.purpose} onValueChange={v => setDForm({ ...dForm, purpose: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Approval', 'Fitting', 'Exhibition', 'Reference', 'Other'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date Sent</Label><Input type="date" value={dForm.sent_date} onChange={e => setDForm({ ...dForm, sent_date: e.target.value })} /></div>
                <div><Label>Expected Return</Label><Input type="date" value={dForm.expected_return} onChange={e => setDForm({ ...dForm, expected_return: e.target.value })} /></div>
              </div>
              <div><Label>Dispatched By</Label><Input value={dForm.dispatched_by} onChange={e => setDForm({ ...dForm, dispatched_by: e.target.value })} /></div>
              <Button onClick={submitDispatch} disabled={saveDispatch.isPending}>Create Gate Pass</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnOf} onOpenChange={v => !v && setReturnOf(null)}>
        <DialogContent>
          {returnOf && <>
            <DialogHeader><DialogTitle className="font-normal">Return — {returnOf.gate_pass_no}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Result</Label>
                <Select value={rForm.status} onValueChange={v => setRForm({ ...rForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="returned">Returned to store</SelectItem><SelectItem value="kept">Kept by client</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Return Date</Label><Input type="date" value={rForm.return_date} onChange={e => setRForm({ ...rForm, return_date: e.target.value })} /></div>
                <div><Label>Returned By (Name)</Label><Input value={rForm.returned_by} onChange={e => setRForm({ ...rForm, returned_by: e.target.value })} /></div>
              </div>
              <div><Label>Condition</Label>
                <Select value={rForm.return_condition} onValueChange={v => setRForm({ ...rForm, return_condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Good', 'Altered', 'Damaged'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Remarks</Label><Textarea value={rForm.return_remarks} onChange={e => setRForm({ ...rForm, return_remarks: e.target.value })} /></div>
              <Button onClick={submitReturn} disabled={saveDispatch.isPending}>Save Return</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
