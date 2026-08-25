import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Trash2, Pencil, Loader2, Search, Download, PackagePlus, PackageMinus, Archive, History,
} from 'lucide-react';
import {
  useStationeryItems, useStationeryTransactions, useCreateStationeryItem,
  useUpdateStationeryItem, useDeleteStationeryItem, useAddStationeryTxn,
  useDeleteStationeryTxn, computeStock, StationeryItem, StationeryItemInput, StockRow,
} from '@/hooks/useStationery';
import { DescriptionAutocomplete } from '@/components/requests/DescriptionAutocomplete';
import { exportStationeryStockExcel, exportStationeryHistoryExcel } from '@/lib/stationeryExcel';
import { toast } from 'sonner';

const emptyForm = (): StationeryItemInput => ({
  itemCode: '', description: '', uom: 'pcs', openingStock: 0, minStock: 0,
});

// Multi-word, case-insensitive match: every typed word must appear somewhere in the text
const matchesWords = (text: string, query: string) => {
  const hay = text.toLowerCase();
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
};

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const Stationery = () => {
  const { data: items = [], isLoading } = useStationeryItems();
  const { data: txns = [] } = useStationeryTransactions();
  const createItem = useCreateStationeryItem();
  const updateItem = useUpdateStationeryItem();
  const deleteItem = useDeleteStationeryItem();
  const addTxn = useAddStationeryTxn();
  const deleteTxn = useDeleteStationeryTxn();

  const [search, setSearch] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [recordItemFilter, setRecordItemFilter] = useState<string>('all');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<StationeryItem | null>(null);
  const [form, setForm] = useState<StationeryItemInput>(emptyForm());

  const [txnDialog, setTxnDialog] = useState<{ item: StockRow; type: 'in' | 'out' } | null>(null);
  const [txnForm, setTxnForm] = useState({ qty: '', date: new Date().toISOString().slice(0, 10), reference: '', notes: '' });

  const stock = useMemo(() => computeStock(items, txns), [items, txns]);

  const filteredStock = useMemo(() => {
    if (!search.trim()) return stock;
    return stock.filter(r =>
      matchesWords(`${r.itemCode} ${r.description} ${r.uom}`, search)
    );
  }, [stock, search]);

  const filteredTxns = useMemo(() => {
    let list = txns;
    if (recordItemFilter !== 'all') list = list.filter(t => t.itemId === recordItemFilter);
    if (recordSearch.trim()) {
      const itemById = new Map(items.map(i => [i.id, i]));
      list = list.filter(t => {
        const item = itemById.get(t.itemId);
        return matchesWords(
          `${item?.itemCode || ''} ${item?.description || ''} ${t.reference} ${t.notes} ${t.type}`,
          recordSearch
        );
      });
    }
    return list;
  }, [txns, items, recordItemFilter, recordSearch]);

  const itemById = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

  const openEdit = (item: StationeryItem) => {
    setEditing(item);
    setForm({
      itemCode: item.itemCode,
      description: item.description,
      uom: item.uom,
      openingStock: item.openingStock,
      minStock: item.minStock,
    });
  };

  const submitAdd = () => {
    createItem.mutate(form, { onSuccess: () => { setForm(emptyForm()); setIsAddOpen(false); } });
  };

  const submitEdit = () => {
    if (!editing) return;
    updateItem.mutate({ id: editing.id, ...form }, { onSuccess: () => { setEditing(null); setForm(emptyForm()); } });
  };

  const openTxn = (item: StockRow, type: 'in' | 'out') => {
    setTxnDialog({ item, type });
    setTxnForm({ qty: '', date: new Date().toISOString().slice(0, 10), reference: '', notes: '' });
  };

  const submitTxn = () => {
    if (!txnDialog) return;
    const qty = num(txnForm.qty);
    if (qty <= 0) { toast.error('Quantity must be greater than 0'); return; }
    if (txnDialog.type === 'out' && qty > txnDialog.item.balance) {
      toast.error(`Only ${txnDialog.item.balance} ${txnDialog.item.uom} in stock`);
      return;
    }
    addTxn.mutate(
      {
        itemId: txnDialog.item.id,
        type: txnDialog.type,
        qty,
        transDate: txnForm.date,
        reference: txnForm.reference,
        notes: txnForm.notes,
      },
      { onSuccess: () => setTxnDialog(null) }
    );
  };

  const itemFormBody = (onSubmit: () => void, busy: boolean, label: string) => (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Description *</Label>
        <DescriptionAutocomplete
          value={form.description}
          onChange={(v) => setForm(f => ({ ...f, description: v }))}
          onSelect={(m) => setForm(f => ({ ...f, description: m.description, itemCode: m.itemCode, uom: m.uom || f.uom }))}
          placeholder="Search Item List by description or item code..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Item Code</Label>
          <Input
            value={form.itemCode}
            onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
            placeholder="e.g., STA-001"
          />
        </div>
        <div className="space-y-2">
          <Label>UOM</Label>
          <Input
            value={form.uom}
            onChange={(e) => setForm({ ...form, uom: e.target.value })}
            placeholder="pcs"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Opening Stock</Label>
          <Input
            type="number" min="0" step="any"
            value={form.openingStock || ''}
            onChange={(e) => setForm({ ...form, openingStock: num(e.target.value) })}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>Minimum Level (low alert)</Label>
          <Input
            type="number" min="0" step="any"
            value={form.minStock || ''}
            onChange={(e) => setForm({ ...form, minStock: num(e.target.value) })}
            placeholder="0 = no alert"
          />
        </div>
      </div>
      <Button className="w-full" onClick={onSubmit} disabled={busy || !form.description.trim()}>
        {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {label}
      </Button>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl tracking-tight text-foreground">Stationery Inventory</h1>
          <p className="text-muted-foreground">
            Track stationery stock in, delivery (stock out), and balances
          </p>
        </div>

        {/* Stock Board */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Stock ({filteredStock.length})
                {stock.some(r => r.isLow) && (
                  <Badge variant="destructive" className="ml-2">
                    {stock.filter(r => r.isLow).length} low
                  </Badge>
                )}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search stock..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 w-56"
                  />
                </div>
                <Button
                  variant="outline" className="gap-2"
                  onClick={() => exportStationeryStockExcel(stock)}
                  disabled={stock.length === 0}
                >
                  <Download className="h-4 w-4" /> Stock Excel
                </Button>
                <Button className="gap-2" onClick={() => { setForm(emptyForm()); setIsAddOpen(true); }}>
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredStock.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">
                {stock.length === 0 ? 'No stationery items yet. Click "Add Item" to start.' : 'No items match your search.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 py-3 w-14">SL</TableHead>
                      <TableHead className="px-4 py-3">Item Code</TableHead>
                      <TableHead className="px-4 py-3">Description</TableHead>
                      <TableHead className="px-4 py-3">UOM</TableHead>
                      <TableHead className="px-4 py-3 text-right">Opening</TableHead>
                      <TableHead className="px-4 py-3 text-right">Total In</TableHead>
                      <TableHead className="px-4 py-3 text-right">Total Used</TableHead>
                      <TableHead className="px-4 py-3 text-right">Balance</TableHead>
                      <TableHead className="px-4 py-3 text-right">Min</TableHead>
                      <TableHead className="px-4 py-3">Status</TableHead>
                      <TableHead className="px-4 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStock.map((row, i) => (
                      <TableRow key={row.id} className={row.isLow ? 'bg-destructive/10' : undefined}>
                        <TableCell className="px-4 py-3">{i + 1}</TableCell>
                        <TableCell className="px-4 py-3">{row.itemCode}</TableCell>
                        <TableCell className="px-4 py-3">{row.description}</TableCell>
                        <TableCell className="px-4 py-3">{row.uom}</TableCell>
                        <TableCell className="px-4 py-3 text-right">{row.openingStock}</TableCell>
                        <TableCell className="px-4 py-3 text-right">{row.totalIn}</TableCell>
                        <TableCell className="px-4 py-3 text-right">{row.totalOut}</TableCell>
                        <TableCell className={`px-4 py-3 text-right ${row.isLow ? 'text-destructive' : ''}`}>
                          {row.balance}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">{row.minStock || '-'}</TableCell>
                        <TableCell className="px-4 py-3">
                          {row.isLow
                            ? <Badge variant="destructive">Low Stock</Badge>
                            : <Badge variant="secondary">OK</Badge>}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => openTxn(row, 'in')}>
                              <PackagePlus className="h-3.5 w-3.5" /> In
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => openTxn(row, 'out')}>
                              <PackageMinus className="h-3.5 w-3.5" /> Out
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (window.confirm(`Delete "${row.description}" and all its history?`)) {
                                  deleteItem.mutate(row.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Records */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Stock Records ({filteredTxns.length})
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={recordItemFilter} onValueChange={setRecordItemFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="All items" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All items</SelectItem>
                    {items.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search records..."
                    value={recordSearch}
                    onChange={(e) => setRecordSearch(e.target.value)}
                    className="pl-8 w-56"
                  />
                </div>
                <Button
                  variant="outline" className="gap-2"
                  onClick={() => exportStationeryHistoryExcel(txns, items)}
                  disabled={txns.length === 0}
                >
                  <Download className="h-4 w-4" /> History Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTxns.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">
                {txns.length === 0 ? 'No stock movements yet. Use the In / Out buttons above.' : 'No records match your filters.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 py-3 w-14">SL</TableHead>
                      <TableHead className="px-4 py-3">Date</TableHead>
                      <TableHead className="px-4 py-3">Item</TableHead>
                      <TableHead className="px-4 py-3">Type</TableHead>
                      <TableHead className="px-4 py-3 text-right">Qty</TableHead>
                      <TableHead className="px-4 py-3">Reference</TableHead>
                      <TableHead className="px-4 py-3">Remarks</TableHead>
                      <TableHead className="px-4 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTxns.map((t, i) => {
                      const item = itemById.get(t.itemId);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="px-4 py-3">{i + 1}</TableCell>
                          <TableCell className="px-4 py-3">{new Date(t.transDate).toLocaleDateString('en-GB')}</TableCell>
                          <TableCell className="px-4 py-3">
                            {item ? `${item.itemCode} — ${item.description}` : '(deleted item)'}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {t.type === 'in'
                              ? <Badge variant="secondary">Stock In</Badge>
                              : <Badge variant="outline">Stock Out</Badge>}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">{t.qty} {item?.uom || ''}</TableCell>
                          <TableCell className="px-4 py-3">{t.reference || '-'}</TableCell>
                          <TableCell className="px-4 py-3">{t.notes || '-'}</TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <Button
                              size="icon" variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (window.confirm('Delete this entry? The balance will be recalculated.')) {
                                  deleteTxn.mutate(t.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Stationery Item</DialogTitle></DialogHeader>
          {itemFormBody(submitAdd, createItem.isPending, 'Add Item')}
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Stationery Item</DialogTitle></DialogHeader>
          {itemFormBody(submitEdit, updateItem.isPending, 'Save Changes')}
        </DialogContent>
      </Dialog>

      {/* Stock In / Out Dialog */}
      <Dialog open={!!txnDialog} onOpenChange={(open) => { if (!open) setTxnDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {txnDialog?.type === 'in' ? 'Stock In' : 'Stock Out (Delivery)'} — {txnDialog?.item.description}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Current balance: {txnDialog?.item.balance} {txnDialog?.item.uom}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number" min="0" step="any"
                  value={txnForm.qty}
                  onChange={(e) => setTxnForm({ ...txnForm, qty: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={txnForm.date}
                  onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                value={txnForm.reference}
                onChange={(e) => setTxnForm({ ...txnForm, reference: e.target.value })}
                placeholder={txnDialog?.type === 'in' ? 'e.g., PO / bill no' : 'e.g., issued to / dept'}
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input
                value={txnForm.notes}
                onChange={(e) => setTxnForm({ ...txnForm, notes: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <Button className="w-full" onClick={submitTxn} disabled={addTxn.isPending}>
              {addTxn.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {txnDialog?.type === 'in' ? 'Save Stock In' : 'Save Stock Out'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Stationery;
