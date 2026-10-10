import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  Customer, useCustomers, useSaveCustomer, useDeleteCustomer, useCustomerOrders, useSampleDispatches, DELIVERED_STAGE,
} from '@/hooks/useCustomerSamples';

const empty = { name: '', mobile: '', company: '', address: '', notes: '' };
const matches = (t: string, q: string) => q.trim().toLowerCase().split(/\s+/).filter(Boolean).every(w => t.toLowerCase().includes(w));

export function CustomersTab() {
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useCustomerOrders();
  const { data: dispatches = [] } = useSampleDispatches();
  const save = useSaveCustomer();
  const remove = useDeleteCustomer();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [form, setForm] = useState(empty);

  const rows = useMemo(() => customers.filter(c => matches(`${c.name} ${c.mobile ?? ''} ${c.company ?? ''}`, q)), [customers, q]);

  const openForm = (c?: Customer) => {
    setEditId(c?.id);
    setForm(c ? { name: c.name, mobile: c.mobile ?? '', company: c.company ?? '', address: c.address ?? '', notes: c.notes ?? '' } : empty);
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Customer name is required');
    await save.mutateAsync({ id: editId, values: { ...form, name: form.name.trim() } });
    toast.success('Customer saved');
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-normal">Customer Index ({customers.length})</CardTitle>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 w-full sm:w-56" placeholder="Search name or mobile" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Customer</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Mobile</TableHead><TableHead>Company</TableHead>
              <TableHead>Address</TableHead><TableHead>Active Orders</TableHead><TableHead>Samples Out</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No customers yet</TableCell></TableRow>}
            {rows.map(c => {
              const active = orders.filter(o => o.customer_id === c.id && o.current_stage < DELIVERED_STAGE).length;
              const out = dispatches.filter(d => d.customer_id === c.id && d.status === 'out').length;
              return (
                <TableRow key={c.id}>
                  <TableCell className="px-4 py-3">{c.name}</TableCell>
                  <TableCell className="px-4 py-3">
                    {c.mobile ? <a href={`tel:${c.mobile}`} className="inline-flex items-center gap-1 text-primary"><Phone className="h-3 w-3" />{c.mobile}</a> : '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3">{c.company || '-'}</TableCell>
                  <TableCell className="px-4 py-3 max-w-[200px] truncate">{c.address || '-'}</TableCell>
                  <TableCell className="px-4 py-3"><Badge variant="secondary">{active}</Badge></TableCell>
                  <TableCell className="px-4 py-3">{out ? <Badge variant="destructive">{out}</Badge> : <Badge variant="outline">0</Badge>}</TableCell>
                  <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => openForm(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm(`Delete ${c.name}?`) && remove.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-normal">{editId ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Mobile</Label><Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={submit} disabled={save.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
