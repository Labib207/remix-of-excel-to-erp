import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Package, Loader2, Search, Upload } from 'lucide-react';
import {
  useMaterialCatalog, useCreateCatalogItem, useUpdateCatalogItem, useDeleteCatalogItem,
  CatalogItem, normalizeText,
} from '@/hooks/useMaterialCatalog';
import { BulkAddItemsDialog } from '@/components/items/BulkAddItemsDialog';

const empty = () => ({ itemCode: '', description: '', uom: 'pcs' });

const ItemList = () => {
  const { data: items = [], isLoading } = useMaterialCatalog();
  const create = useCreateCatalogItem();
  const update = useUpdateCatalogItem();
  const remove = useDeleteCatalogItem();

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState(empty());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.description.toLowerCase().includes(q) ||
      i.itemCode.toLowerCase().includes(q) ||
      i.uom.toLowerCase().includes(q)
    );
  }, [items, search]);

  const submitAdd = () => {
    create.mutate(
      { itemCode: form.itemCode, description: form.description, uom: form.uom },
      { onSuccess: () => { setForm(empty()); setIsAddOpen(false); } }
    );
  };

  const submitEdit = () => {
    if (!editing) return;
    update.mutate(
      { id: editing.id, itemCode: form.itemCode, description: form.description, uom: form.uom },
      { onSuccess: () => { setEditing(null); setForm(empty()); } }
    );
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setForm({ itemCode: item.itemCode, description: item.description, uom: item.uom });
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl tracking-tight text-foreground">Item List</h1>
          <p className="text-muted-foreground">
            Master list of items used across Trim Chart, Requests, and Delivery Notes
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Catalog ({filtered.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add New Item</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <Input
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          onBlur={() => setForm(f => ({ ...f, description: normalizeText(f.description) }))}
                          placeholder="e.g., Button 4-Hole 20L"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Item Code</Label>
                          <Input
                            value={form.itemCode}
                            onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
                            placeholder="Auto-generated if empty"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>UOM</Label>
                          <Input
                            value={form.uom}
                            onChange={(e) => setForm({ ...form, uom: e.target.value })}
                            placeholder="pcs, mtr, cone..."
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                      <Button onClick={submitAdd} disabled={create.isPending}>
                        {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Add
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {search ? 'No items match your search.' : 'No items yet. Click "Add Item" to create your first item.'}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-40">Item Code</TableHead>
                      <TableHead className="w-24">UOM</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="px-4 py-3">{item.description}</TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground">{item.itemCode}</TableCell>
                        <TableCell className="px-4 py-3">{item.uom}</TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm(`Delete "${item.description}"?`)) remove.mutate(item.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Description *</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  onBlur={() => setForm(f => ({ ...f, description: normalizeText(f.description) }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item Code</Label>
                  <Input value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>UOM</Label>
                  <Input value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={submitEdit} disabled={update.isPending}>
                {update.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default ItemList;
