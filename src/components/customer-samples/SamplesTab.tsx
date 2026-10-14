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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Search, Send, Undo2, Printer, FileDown, Tag, Eye, Star, CalendarPlus, Recycle, Trash2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Sample, SampleDispatch, useSamples, useSaveSample, useDeleteSample, useSampleDispatches, useSaveDispatch, useCustomerOrders, fmtDate,
} from '@/hooks/useCustomerSamples';
import { sampleGatePass, sampleLabel } from '@/lib/customerSamplesPdf';
import { exportSamplesExcel } from '@/lib/sampleExcel';
import {
  SAMPLE_TYPES, SAMPLE_STATUSES, LEAVING_STATUSES, typeLabel, statusLabel, isInRoom, isExpired, reviewReasons,
  suggestKeepUntil, todayStr, addDays,
} from '@/lib/sampleRules';
import { SampleFormDialog } from './SampleFormDialog';
import { GatePassDialog, PassType } from './GatePassDialog';
import { SampleDetailDialog } from './SampleDetailDialog';

const matches = (t: string, q: string) => q.trim().toLowerCase().split(/\s+/).filter(Boolean).every(w => t.toLowerCase().includes(w));

const STATUS_STYLE: Record<string, string> = {
  waiting_approval: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  sent: 'bg-primary/15 text-primary border-primary/30',
  returned: 'bg-muted text-muted-foreground',
  disposed: 'bg-muted text-muted-foreground line-through',
};
const StatusBadge = ({ s }: { s: string }) => <Badge variant="outline" className={STATUS_STYLE[s]}>{statusLabel(s)}</Badge>;

export function SamplesTab() {
  const { data: samples = [] } = useSamples();
  const { data: dispatches = [] } = useSampleDispatches();
  const { data: orders = [] } = useCustomerOrders();
  const saveSample = useSaveSample();
  const saveDispatch = useSaveDispatch();

  const [q, setQ] = useState('');
  const [fType, setFType] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fLoc, setFLoc] = useState('all');
  const [fGolden, setFGolden] = useState('all');
  const [logFilter, setLogFilter] = useState<'out' | 'all'>('out');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sample | null>(null);
  const [gate, setGate] = useState<{ sample: Sample; type: PassType } | null>(null);
  const [detail, setDetail] = useState<Sample | null>(null);
  const [extendOf, setExtendOf] = useState<Sample | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [returnOf, setReturnOf] = useState<SampleDispatch | null>(null);
  const [rForm, setRForm] = useState({ return_date: todayStr(), returned_by: '', return_condition: 'Good', return_remarks: '' });

  const orderById = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);
  const sampleById = useMemo(() => new Map(samples.map(s => [s.id, s])), [samples]);
  const reviewMap = useMemo(() => new Map(samples.map(s => [s.id, reviewReasons(s, samples)])), [samples]);
  const locations = useMemo(() => [...new Set(samples.map(s => s.location?.trim()).filter(Boolean) as string[])].sort(), [samples]);

  const stats = useMemo(() => {
    const room = samples.filter(isInRoom);
    const byType = SAMPLE_TYPES.map(t => [t.label, room.filter(s => s.sample_type === t.value).length] as const);
    const byLoc = new Map<string, number>();
    room.forEach(s => { const l = s.location?.trim() || 'No location'; byLoc.set(l, (byLoc.get(l) ?? 0) + 1); });
    const review = samples.filter(s => (reviewMap.get(s.id) ?? []).length > 0).length;
    return { room: room.length, byType, byLoc: [...byLoc.entries()].sort((a, b) => b[1] - a[1]), review };
  }, [samples, reviewMap]);

  const rows = useMemo(() => samples.filter(s => {
    const o = s.order_id ? orderById.get(s.order_id) : undefined;
    return (fType === 'all' || s.sample_type === fType) && (fStatus === 'all' || s.status === fStatus)
      && (fLoc === 'all' || (s.location?.trim() ?? '') === fLoc) && (fGolden === 'all' || String(s.golden) === fGolden)
      && matches(`${s.ref_no} ${s.style_name} ${o?.customer_name ?? ''} ${o?.order_no ?? ''}`, q);
  }), [samples, orderById, fType, fStatus, fLoc, fGolden, q]);

  const reviewRows = samples.filter(s => (reviewMap.get(s.id) ?? []).length > 0);
  const logRows = dispatches.filter(d => (logFilter === 'all' || d.status === 'out') &&
    matches(`${d.gate_pass_no} ${d.sent_to} ${sampleById.get(d.sample_id)?.ref_no ?? ''} ${sampleById.get(d.sample_id)?.style_name ?? ''}`, q));

  const openForm = (s: Sample | null) => { setEditing(s); setFormOpen(true); };
  const canLeave = (s: Sample) => !LEAVING_STATUSES.includes(s.status);

  const doExtend = async () => {
    if (!extendOf || !extendDate) return toast.error('Pick a new date');
    await saveSample.mutateAsync({ id: extendOf.id, values: { keep_until: extendDate, final_action: 'keep' } });
    toast.success('Keep-until date extended'); setExtendOf(null);
  };

  const doReuse = async (s: Sample) => {
    const keep = suggestKeepUntil(s.sample_type, 'waiting_approval', todayStr(), s.order_id ? orderById.get(s.order_id) : null) || addDays(todayStr(), 30);
    await saveSample.mutateAsync({ id: s.id, values: { final_action: 'reuse', status: 'waiting_approval', keep_until: keep, made_date: todayStr() } });
    toast.success('Sample marked for reuse');
  };

  const submitReturn = async () => {
    if (!returnOf) return;
    await saveDispatch.mutateAsync({ id: returnOf.id, values: { status: 'returned', ...rForm, returned_by: rForm.returned_by || null, return_remarks: rForm.return_remarks || null } });
    const s = sampleById.get(returnOf.sample_id);
    if (s) await saveSample.mutateAsync({ id: s.id, values: { status: returnOf.prev_status && !LEAVING_STATUSES.includes(returnOf.prev_status) ? returnOf.prev_status : 'approved' } });
    toast.success('Sample is back in the store'); setReturnOf(null);
  };

  const rowActions = (s: Sample) => (
    <>
      <Button size="icon" variant="ghost" title="Details" onClick={() => setDetail(s)}><Eye className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" title="Edit" onClick={() => openForm(s)}><Pencil className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" title="Print label" onClick={() => sampleLabel(s, typeLabel(s.sample_type), 'print')}><Tag className="h-4 w-4" /></Button>
      <Button size="sm" variant="outline" disabled={!canLeave(s)} onClick={() => setGate({ sample: s, type: 'sent' })}><Send className="h-4 w-4 mr-1" />Gate Pass</Button>
    </>
  );

  const filterSelect = (value: string, set: (v: string) => void, all: string, opts: { value: string; label: string }[]) => (
    <Select value={value} onValueChange={set}>
      <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {opts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="px-4 py-3"><p className="text-xs text-muted-foreground">In Sample Room</p><p className="text-2xl">{stats.room}</p></CardContent></Card>
        <Card><CardContent className="px-4 py-3"><p className="text-xs text-muted-foreground mb-1">By Type</p>
          {stats.byType.map(([l, n]) => <p key={l} className="text-sm flex justify-between gap-2"><span className="truncate">{l}</span><span>{n}</span></p>)}
        </CardContent></Card>
        <Card><CardContent className="px-4 py-3"><p className="text-xs text-muted-foreground mb-1">By Location</p>
          <div className="max-h-20 overflow-y-auto">
            {stats.byLoc.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : stats.byLoc.map(([l, n]) => <p key={l} className="text-sm flex justify-between gap-2"><span className="truncate">{l}</span><span>{n}</span></p>)}
          </div>
        </CardContent></Card>
        <Card className={cn(stats.review > 0 && 'border-destructive/50')}><CardContent className="px-4 py-3"><p className="text-xs text-muted-foreground">Needs Review</p><p className={cn('text-2xl', stats.review > 0 && 'text-destructive')}>{stats.review}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="list">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="list">All Samples ({samples.length})</TabsTrigger>
            <TabsTrigger value="review">Needs Review ({reviewRows.length})</TabsTrigger>
            <TabsTrigger value="passes">Gate Passes</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 w-full sm:w-60" placeholder="Search ID, style, customer" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => exportSamplesExcel(rows, orders)} disabled={!rows.length}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
            <Button onClick={() => openForm(null)}><Plus className="h-4 w-4 mr-1" />Add Sample</Button>
          </div>
        </div>

        <TabsContent value="list">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {filterSelect(fType, setFType, 'All types', SAMPLE_TYPES.map(t => ({ value: t.value, label: t.label })))}
              {filterSelect(fStatus, setFStatus, 'All statuses', SAMPLE_STATUSES.map(t => ({ value: t.value, label: t.label })))}
              {filterSelect(fLoc, setFLoc, 'All locations', locations.map(l => ({ value: l, label: l })))}
              {filterSelect(fGolden, setFGolden, 'Golden: any', [{ value: 'true', label: 'Golden only' }, { value: 'false', label: 'Not golden' }])}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Sample ID</TableHead><TableHead>Type</TableHead><TableHead>Style</TableHead><TableHead>Customer / Order</TableHead>
                  <TableHead>Size / Color</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Status</TableHead>
                  <TableHead>Location</TableHead><TableHead>Keep Until</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No samples found</TableCell></TableRow>}
                  {rows.map(s => {
                    const o = s.order_id ? orderById.get(s.order_id) : undefined;
                    const expired = isExpired(s);
                    return (
                      <TableRow key={s.id} className={cn(expired && 'bg-destructive/10')}>
                        <TableCell className="px-4 py-3 font-mono text-sm whitespace-nowrap">{s.golden && <Star className="inline h-3 w-3 mr-1 text-warning fill-current" />}{s.ref_no}</TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">{typeLabel(s.sample_type)}</TableCell>
                        <TableCell className="px-4 py-3">{s.style_name}</TableCell>
                        <TableCell className="px-4 py-3">{o ? <>{o.customer_name}<div className="text-xs text-muted-foreground">{o.order_no}</div></> : '-'}</TableCell>
                        <TableCell className="px-4 py-3">{[s.size, s.color].filter(Boolean).join(' / ') || '-'}</TableCell>
                        <TableCell className="px-4 py-3 text-right">{s.total_qty}</TableCell>
                        <TableCell className="px-4 py-3"><StatusBadge s={s.status} /></TableCell>
                        <TableCell className="px-4 py-3">{s.location || '-'}</TableCell>
                        <TableCell className={cn('px-4 py-3 whitespace-nowrap', expired && 'text-destructive')}>{fmtDate(s.keep_until)}</TableCell>
                        <TableCell className="px-4 py-3 text-right whitespace-nowrap">{rowActions(s)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardContent className="overflow-x-auto pt-6">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Sample ID</TableHead><TableHead>Type</TableHead><TableHead>Style</TableHead><TableHead>Status</TableHead>
                  <TableHead>Location</TableHead><TableHead>Keep Until</TableHead><TableHead>Why</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {reviewRows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nothing needs review</TableCell></TableRow>}
                  {reviewRows.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="px-4 py-3 font-mono text-sm"><button className="text-primary" onClick={() => setDetail(s)}>{s.ref_no}</button></TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">{typeLabel(s.sample_type)}</TableCell>
                      <TableCell className="px-4 py-3">{s.style_name}</TableCell>
                      <TableCell className="px-4 py-3"><StatusBadge s={s.status} /></TableCell>
                      <TableCell className="px-4 py-3">{s.location || '-'}</TableCell>
                      <TableCell className={cn('px-4 py-3', isExpired(s) && 'text-destructive')}>{fmtDate(s.keep_until)}</TableCell>
                      <TableCell className="px-4 py-3"><div className="flex flex-wrap gap-1">{(reviewMap.get(s.id) ?? []).map(r => <Badge key={r} variant="destructive">{r}</Badge>)}</div></TableCell>
                      <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => { setExtendOf(s); setExtendDate(addDays(todayStr(), 30)); }}><CalendarPlus className="h-4 w-4 mr-1" />Extend</Button>
                        <Button size="sm" variant="ghost" disabled={!canLeave(s)} onClick={() => setGate({ sample: s, type: 'sent' })}><Send className="h-4 w-4 mr-1" />Send</Button>
                        <Button size="sm" variant="ghost" onClick={() => doReuse(s)}><Recycle className="h-4 w-4 mr-1" />Reuse</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setGate({ sample: s, type: 'disposed' })}><Trash2 className="h-4 w-4 mr-1" />Dispose</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="passes">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="font-normal">Gate Passes & Returns</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={logFilter === 'out' ? 'default' : 'outline'} onClick={() => setLogFilter('out')}>Currently Outside</Button>
                <Button size="sm" variant={logFilter === 'all' ? 'default' : 'outline'} onClick={() => setLogFilter('all')}>All History</Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Gate Pass</TableHead><TableHead>Type</TableHead><TableHead>Sample</TableHead><TableHead>To</TableHead><TableHead className="text-right">Qty</TableHead>
                  <TableHead>Date</TableHead><TableHead>Return</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {logRows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nothing here</TableCell></TableRow>}
                  {logRows.map(d => {
                    const s = sampleById.get(d.sample_id);
                    const late = d.status === 'out' && d.expected_return && d.expected_return < todayStr();
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="px-4 py-3 font-mono text-sm">{d.gate_pass_no}</TableCell>
                        <TableCell className="px-4 py-3 capitalize">{d.pass_type}{d.reason && <div className="text-xs text-muted-foreground normal-case">{d.reason}</div>}</TableCell>
                        <TableCell className="px-4 py-3">{s ? `${s.ref_no} · ${s.style_name}` : '-'}</TableCell>
                        <TableCell className="px-4 py-3">{d.sent_to}{d.mobile && <div className="text-xs text-muted-foreground">{d.mobile}</div>}</TableCell>
                        <TableCell className="px-4 py-3 text-right">{d.qty}</TableCell>
                        <TableCell className="px-4 py-3">{fmtDate(d.sent_date)}<div className="text-xs text-muted-foreground">by {d.dispatched_by || '-'}</div></TableCell>
                        <TableCell className="px-4 py-3">
                          {d.pass_type !== 'sent' ? '-' : d.status === 'out'
                            ? <span className={late ? 'text-destructive' : ''}>Outside · Exp. {fmtDate(d.expected_return)}</span>
                            : <>{fmtDate(d.return_date)}<div className="text-xs text-muted-foreground">{d.returned_by || '-'} · {d.return_condition || '-'}</div></>}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                          {d.status === 'out' && <Button size="sm" variant="outline" onClick={() => { setReturnOf(d); setRForm({ return_date: todayStr(), returned_by: d.sent_to, return_condition: 'Good', return_remarks: '' }); }}><Undo2 className="h-4 w-4 mr-1" />Back to Store</Button>}
                          <Button size="icon" variant="ghost" onClick={() => sampleGatePass(d, s, 'print')}><Printer className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => sampleGatePass(d, s, 'download')}><FileDown className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SampleFormDialog open={formOpen} onOpenChange={setFormOpen} sample={editing} />
      <GatePassDialog sample={gate?.sample ?? null} initialType={gate?.type ?? 'sent'} onClose={() => setGate(null)} />
      {detail && <SampleDetailDialog sample={sampleById.get(detail.id) ?? detail} all={samples} dispatches={dispatches}
        order={detail.order_id ? orderById.get(detail.order_id) : undefined} onClose={() => setDetail(null)} />}

      <Dialog open={!!extendOf} onOpenChange={v => !v && setExtendOf(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-normal">Extend Keep-Until — {extendOf?.ref_no}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>New Keep-Until Date</Label><Input type="date" value={extendDate} onChange={e => setExtendDate(e.target.value)} /></div>
            <Button onClick={doExtend} disabled={saveSample.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnOf} onOpenChange={v => !v && setReturnOf(null)}>
        <DialogContent>
          {returnOf && <>
            <DialogHeader><DialogTitle className="font-normal">Back to Store — {returnOf.gate_pass_no}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
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
