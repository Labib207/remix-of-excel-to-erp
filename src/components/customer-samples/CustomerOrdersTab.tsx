import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, ChevronRight, Printer, FileDown, History, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  CustomerOrder, useCustomerOrders, useSaveCustomerOrder, useDeleteCustomerOrder, ORDER_STAGES, DELIVERED_STAGE,
  stageHistory, formatDuration, fmtDate, fmtDateTime, nextNumber, StageEntry,
} from '@/hooks/useCustomerSamples';
import { CustomerPicker } from './CustomerPicker';
import { customerDeliveryNote, orderStageReport } from '@/lib/customerSamplesPdf';

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({ customer_id: null as string | null, customer_name: '', mobile: '', style: '', quantity: '', order_date: today(), deadline: '', remarks: '' });
const matches = (t: string, q: string) => q.trim().toLowerCase().split(/\s+/).filter(Boolean).every(w => t.toLowerCase().includes(w));

function deadlineBadge(o: CustomerOrder) {
  if (!o.deadline) return null;
  const end = o.current_stage >= DELIVERED_STAGE && o.delivery_date ? new Date(`${o.delivery_date}T00:00:00`) : new Date();
  const days = Math.ceil((new Date(`${o.deadline}T23:59:59`).getTime() - end.getTime()) / 86400000);
  if (o.current_stage >= DELIVERED_STAGE) return days >= 0 ? <Badge variant="secondary">Delivered on time</Badge> : <Badge variant="destructive">Delivered {-days}d late</Badge>;
  if (days < 0) return <Badge variant="destructive">Overdue {-days}d</Badge>;
  if (days <= 2) return <Badge className="bg-warning text-warning-foreground">Due in {days}d</Badge>;
  return <Badge variant="outline">{days}d left</Badge>;
}

export function CustomerOrdersTab() {
  const { data: orders = [] } = useCustomerOrders();
  const save = useSaveCustomerOrder();
  const remove = useDeleteCustomerOrder();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'active' | 'delivered' | 'all'>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerOrder | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [advance, setAdvance] = useState<CustomerOrder | null>(null);
  const [remark, setRemark] = useState('');
  const [delivery, setDelivery] = useState({ date: today(), receivedBy: '' });
  const [historyOf, setHistoryOf] = useState<CustomerOrder | null>(null);

  const rows = useMemo(() => orders.filter(o =>
    (filter === 'all' || (filter === 'active' ? o.current_stage < DELIVERED_STAGE : o.current_stage >= DELIVERED_STAGE)) &&
    matches(`${o.order_no} ${o.customer_name} ${o.mobile ?? ''} ${o.style ?? ''}`, q)), [orders, q, filter]);

  const openForm = (o?: CustomerOrder) => {
    setEditing(o ?? null);
    setForm(o ? {
      customer_id: o.customer_id, customer_name: o.customer_name, mobile: o.mobile ?? '', style: o.style ?? '',
      quantity: String(o.quantity), order_date: o.order_date, deadline: o.deadline ?? '', remarks: o.remarks ?? '',
    } : emptyForm());
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.customer_name.trim()) return toast.error('Customer name is required');
    const values: Record<string, unknown> = {
      customer_id: form.customer_id, customer_name: form.customer_name.trim(), mobile: form.mobile || null,
      style: form.style || null, quantity: parseFloat(form.quantity) || 0, order_date: form.order_date,
      deadline: form.deadline || null, remarks: form.remarks || null,
    };
    if (!editing) {
      values.order_no = await nextNumber('CO');
      values.current_stage = 0;
      values.stage_history = [{ stage: 0, started_at: new Date().toISOString() }];
    }
    await save.mutateAsync({ id: editing?.id, values });
    toast.success('Order saved');
    setFormOpen(false);
  };

  const doAdvance = async () => {
    if (!advance) return;
    const now = new Date().toISOString();
    const next = advance.current_stage + 1;
    const hist: StageEntry[] = stageHistory(advance).map(e =>
      e.stage === advance.current_stage && !e.completed_at ? { ...e, completed_at: now, remark: remark || e.remark || null } : e);
    const values: Record<string, unknown> = { current_stage: next };
    if (next === DELIVERED_STAGE) {
      hist.push({ stage: next, started_at: now, completed_at: now });
      values.delivery_date = delivery.date;
      values.received_by = delivery.receivedBy || null;
    } else {
      hist.push({ stage: next, started_at: now });
    }
    values.stage_history = hist;
    await save.mutateAsync({ id: advance.id, values });
    toast.success(`Moved to ${ORDER_STAGES[next]}`);
    setAdvance(null); setRemark('');
  };

  const saveStageRemark = async (o: CustomerOrder, stage: number, text: string) => {
    const hist = stageHistory(o).map(e => (e.stage === stage ? { ...e, remark: text } : e));
    await save.mutateAsync({ id: o.id, values: { stage_history: hist } });
    setHistoryOf({ ...o, stage_history: hist as never });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle className="font-normal">Customer Orders</CardTitle>
        <div className="flex flex-wrap gap-2">
          {(['active', 'delivered', 'all'] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
          ))}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 w-full sm:w-52" placeholder="Search orders" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => orderStageReport(rows, 'download')} disabled={!rows.length}><BarChart3 className="h-4 w-4 mr-1" />Stage Report</Button>
          <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />New Order</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows.length === 0 && <p className="text-center text-muted-foreground py-8">No orders here</p>}
        {rows.map(o => {
          const hist = stageHistory(o);
          const delivered = o.current_stage >= DELIVERED_STAGE;
          const current = hist.find(e => e.stage === o.current_stage);
          return (
            <div key={o.id} className="rounded-lg border border-border px-4 py-3 grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm">{o.order_no}</span>
                    <span>{o.customer_name}</span>
                    {o.mobile && <a className="text-sm text-primary" href={`tel:${o.mobile}`}>{o.mobile}</a>}
                    {deadlineBadge(o)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {o.style || 'No style'} · Qty {o.quantity} · Ordered {fmtDate(o.order_date)} · Deadline {fmtDate(o.deadline)}
                    {delivered && ` · Delivered ${fmtDate(o.delivery_date)}`}
                  </p>
                  {o.remarks && <p className="text-sm text-muted-foreground">Remark: {o.remarks}</p>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {!delivered && <Button size="sm" onClick={() => { setAdvance(o); setRemark(''); setDelivery({ date: today(), receivedBy: '' }); }}>
                    {o.current_stage === DELIVERED_STAGE - 1 ? 'Mark Delivered' : `Complete ${ORDER_STAGES[o.current_stage]}`}<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>}
                  {delivered && <>
                    <Button size="sm" variant="outline" onClick={() => customerDeliveryNote(o, 'print')}><Printer className="h-4 w-4 mr-1" />Print DN</Button>
                    <Button size="icon" variant="ghost" onClick={() => customerDeliveryNote(o, 'download')}><FileDown className="h-4 w-4" /></Button>
                  </>}
                  <Button size="icon" variant="ghost" onClick={() => setHistoryOf(o)} title="Stage times"><History className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => openForm(o)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => confirm(`Delete order ${o.order_no}?`) && remove.mutate(o.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <Progress value={(o.current_stage / DELIVERED_STAGE) * 100} />
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 text-xs">
                {ORDER_STAGES.map((s, i) => (
                  <div key={s} className={cn('rounded px-2 py-1 text-center',
                    i < o.current_stage || delivered ? 'bg-primary/15 text-primary' : i === o.current_stage ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {s}
                  </div>
                ))}
              </div>
              {!delivered && current && <p className="text-xs text-muted-foreground">In {ORDER_STAGES[o.current_stage]} for {formatDuration(current.started_at)}</p>}
            </div>
          );
        })}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-normal">{editing ? `Edit ${editing.order_no}` : 'New Customer Order'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <CustomerPicker value={form.customer_id} onPick={c => setForm({ ...form, customer_id: c?.id ?? null, customer_name: c?.name ?? form.customer_name, mobile: c?.mobile ?? form.mobile })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Customer Name *</Label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Mobile</Label><Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} /></div>
              <div><Label>Style</Label><Input value={form.style} onChange={e => setForm({ ...form, style: e.target.value })} /></div>
              <div><Label>Quantity</Label><Input type="number" step="any" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>Order Date</Label><Input type="date" value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })} /></div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
            </div>
            <div><Label>Remarks</Label><Textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
            <Button onClick={submit} disabled={save.isPending}>Save Order</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!advance} onOpenChange={v => !v && setAdvance(null)}>
        <DialogContent>
          {advance && <>
            <DialogHeader><DialogTitle className="font-normal">Complete {ORDER_STAGES[advance.current_stage]} — {advance.order_no}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">Time taken: {formatDuration(stageHistory(advance).find(e => e.stage === advance.current_stage)?.started_at)}</p>
              <div><Label>Remark for {ORDER_STAGES[advance.current_stage]}</Label><Textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="e.g. reason for delay" /></div>
              {advance.current_stage + 1 === DELIVERED_STAGE && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Delivery Date</Label><Input type="date" value={delivery.date} onChange={e => setDelivery({ ...delivery, date: e.target.value })} /></div>
                  <div><Label>Received By</Label><Input value={delivery.receivedBy} onChange={e => setDelivery({ ...delivery, receivedBy: e.target.value })} /></div>
                </div>
              )}
              <Button onClick={doAdvance} disabled={save.isPending}>Move to {ORDER_STAGES[advance.current_stage + 1]}</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyOf} onOpenChange={v => !v && setHistoryOf(null)}>
        <DialogContent className="max-w-2xl">
          {historyOf && <>
            <DialogHeader><DialogTitle className="font-normal">Stage Times — {historyOf.order_no}</DialogTitle></DialogHeader>
            <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
              {ORDER_STAGES.slice(0, -1).map((s, i) => {
                const e = stageHistory(historyOf).find(x => x.stage === i);
                return (
                  <div key={s} className="rounded border border-border px-4 py-3 grid gap-1 text-sm">
                    <div className="flex justify-between"><span>{s}</span><span className="text-muted-foreground">{e ? formatDuration(e.started_at, e.completed_at) : 'Not started'}</span></div>
                    {e && <p className="text-xs text-muted-foreground">Start {fmtDateTime(e.started_at)} · End {e.completed_at ? fmtDateTime(e.completed_at) : 'in progress'}</p>}
                    {e && <Input defaultValue={e.remark ?? ''} placeholder="Remark" onBlur={ev => ev.target.value !== (e.remark ?? '') && saveStageRemark(historyOf, i, ev.target.value)} />}
                  </div>
                );
              })}
              <Button variant="outline" onClick={() => orderStageReport([historyOf], 'print')}><Printer className="h-4 w-4 mr-1" />Print Stage Report</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
