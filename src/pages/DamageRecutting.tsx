import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Scissors, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface DamageRecord {
  id: string;
  order_id: string | null;
  date: string;
  size_code: string;
  part_name: string;
  quantity: number;
  marker_length: number;
  unit: string;
  fabric_usage: number;
  reason: string | null;
  line_no: string | null;
  created_at: string;
}

interface Order {
  id: string;
  order_no: string;
  customer: string;
  style_no: string;
}

const SIZE_CODES = [
  { value: 'LR', label: 'LR - Regular Size' },
  { value: 'LS', label: 'LS - Small Size' },
  { value: 'LL', label: 'LL - Long Size' },
];

const PART_NAMES = [
  'Front Panel', 'Back Panel', 'Sleeve', 'Collar', 'Cuff',
  'Pocket', 'Yoke', 'Placket', 'Waistband', 'Fly', 'Other'
];

const emptyForm = {
  order_id: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  size_code: '',
  part_name: '',
  quantity: 1,
  marker_length: 0,
  unit: 'yards',
  reason: '',
  line_no: '',
};

export default function DamageRecutting() {
  const { user } = useAuth();
  const [records, setRecords] = useState<DamageRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterDate, setFilterDate] = useState('');
  const [filterOrder, setFilterOrder] = useState('all');

  // Fetch orders and records
  useEffect(() => {
    fetchOrders();
    fetchRecords();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('id, order_no, customer, style_no');
    if (data) setOrders(data);
  };

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('damage_recutting')
      .select('*')
      .order('date', { ascending: false });
    if (error) {
      console.error('Error fetching records:', error);
      toast.error('Failed to load records');
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  };

  const fabricUsage = useMemo(() => form.marker_length * form.quantity, [form.marker_length, form.quantity]);

  const handleSubmit = async () => {
    if (!form.size_code || !form.part_name || !form.order_id) {
      toast.error('Please fill all required fields');
      return;
    }

    const payload = {
      order_id: form.order_id || null,
      date: form.date,
      size_code: form.size_code,
      part_name: form.part_name,
      quantity: form.quantity,
      marker_length: form.marker_length,
      unit: form.unit,
      reason: form.reason || null,
      line_no: form.line_no || null,
      created_by: user?.id,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('damage_recutting').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('damage_recutting').insert(payload));
    }

    if (error) {
      toast.error('Failed to save: ' + error.message);
    } else {
      toast.success(editingId ? 'Record updated' : 'Record added');
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchRecords();
    }
  };

  const handleEdit = (record: DamageRecord) => {
    setEditingId(record.id);
    setForm({
      order_id: record.order_id || '',
      date: record.date,
      size_code: record.size_code,
      part_name: record.part_name,
      quantity: record.quantity,
      marker_length: record.marker_length,
      unit: record.unit,
      reason: record.reason || '',
      line_no: record.line_no || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('damage_recutting').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Record deleted');
      fetchRecords();
    }
  };

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterDate && r.date !== filterDate) return false;
      if (filterOrder && filterOrder !== 'all' && r.order_id !== filterOrder) return false;
      return true;
    });
  }, [records, filterDate, filterOrder]);

  const totalFabricUsage = useMemo(() => {
    return filtered.reduce((sum, r) => sum + (r.fabric_usage || 0), 0);
  }, [filtered]);

  const getOrderName = (orderId: string | null) => {
    if (!orderId) return '-';
    const order = orders.find(o => o.id === orderId);
    return order ? `${order.order_no} - ${order.customer}` : '-';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-destructive/80 to-destructive shadow-lg">
              <Scissors className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Damage & Recutting</h1>
              <p className="text-sm text-muted-foreground">Track damaged parts and calculate fabric usage</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditingId(null); setForm(emptyForm); }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-accent text-white shadow-lg">
                <Plus className="h-4 w-4 mr-2" /> Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Record' : 'Add Damage Record'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="col-span-2">
                  <Label>Order *</Label>
                  <Select value={form.order_id} onValueChange={v => setForm(p => ({ ...p, order_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                    <SelectContent>
                      {orders.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.order_no} - {o.customer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <Label>Size Code *</Label>
                  <Select value={form.size_code} onValueChange={v => setForm(p => ({ ...p, size_code: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {SIZE_CODES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Part Name *</Label>
                  <Select value={form.part_name} onValueChange={v => setForm(p => ({ ...p, part_name: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select part" /></SelectTrigger>
                    <SelectContent>
                      {PART_NAMES.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min={1} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                </div>
                <div>
                  <Label>Marker Length (YY)</Label>
                  <Input type="number" step="0.01" min={0} value={form.marker_length} onChange={e => setForm(p => ({ ...p, marker_length: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yards">Yards</SelectItem>
                      <SelectItem value="meters">Meters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 rounded-lg bg-muted p-3 text-center">
                  <p className="text-xs text-muted-foreground">Auto Fabric Usage</p>
                  <p className="text-2xl font-bold text-primary">{fabricUsage.toFixed(2)} <span className="text-sm font-normal">{form.unit}</span></p>
                </div>
                <div>
                  <Label>Line No</Label>
                  <Input value={form.line_no} onChange={e => setForm(p => ({ ...p, line_no: e.target.value }))} placeholder="e.g. Line 5" />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Fabric defect" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit}>{editingId ? 'Update' : 'Save'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters & Summary */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Card className="flex-1">
            <CardContent className="p-4 flex items-center gap-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-3 flex-1">
                <Input type="date" className="max-w-[160px]" value={filterDate} onChange={e => setFilterDate(e.target.value)} placeholder="Filter by date" />
                <Select value={filterOrder} onValueChange={setFilterOrder}>
                  <SelectTrigger className="max-w-[220px]"><SelectValue placeholder="All Orders" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    {orders.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.order_no} - {o.customer}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(filterDate || filterOrder !== 'all') && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterDate(''); setFilterOrder('all'); }}>Clear</Button>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-[200px]">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Fabric Usage</p>
              <p className="text-3xl font-bold text-destructive">{totalFabricUsage.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{filtered.length} record(s)</p>
            </CardContent>
          </Card>
        </div>

        {/* Records Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Damage Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Size Code</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">YY</TableHead>
                    <TableHead className="text-right">Fabric Usage</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Line</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No damage records found</TableCell></TableRow>
                  ) : (
                    filtered.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>{format(new Date(r.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{getOrderName(r.order_id)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.size_code}</Badge>
                        </TableCell>
                        <TableCell>{r.part_name}</TableCell>
                        <TableCell className="text-right font-medium">{r.quantity}</TableCell>
                        <TableCell className="text-right">{r.marker_length}</TableCell>
                        <TableCell className="text-right font-bold text-destructive">{r.fabric_usage?.toFixed(2)}</TableCell>
                        <TableCell>{r.unit}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{r.reason || '-'}</TableCell>
                        <TableCell>{r.line_no || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(r.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
