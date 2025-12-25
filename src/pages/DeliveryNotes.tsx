import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FileText, Plus, Download, Trash2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeliveryItem {
  id: string;
  itemName: string;
  top: number;
  bottom: number;
}

interface DeliveryNote {
  id: string;
  noteNo: number;
  toRecipient: string;
  date: string;
  items: DeliveryItem[];
  issuedBy: string;
  receivedBy: string;
  createdAt: string;
}

const DeliveryNotes = () => {
  const { toast } = useToast();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    toRecipient: '',
    date: new Date().toISOString().split('T')[0],
    issuedBy: '',
    receivedBy: '',
  });
  const [items, setItems] = useState<DeliveryItem[]>([
    { id: '1', itemName: '', top: 0, bottom: 0 }
  ]);

  const addItem = () => {
    setItems(prev => [...prev, { 
      id: Date.now().toString(), 
      itemName: '', 
      top: 0, 
      bottom: 0 
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof DeliveryItem, value: string | number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.top + item.bottom, 0);
  };

  const handleCreate = () => {
    const newNote: DeliveryNote = {
      id: `dn-${Date.now()}`,
      noteNo: deliveryNotes.length + 1,
      toRecipient: formData.toRecipient,
      date: formData.date,
      items: items.filter(item => item.itemName.trim() !== ''),
      issuedBy: formData.issuedBy,
      receivedBy: formData.receivedBy,
      createdAt: new Date().toISOString(),
    };

    setDeliveryNotes(prev => [...prev, newNote]);
    setIsCreateOpen(false);
    resetForm();
    toast({ title: 'Delivery note created' });
  };

  const resetForm = () => {
    setFormData({
      toRecipient: '',
      date: new Date().toISOString().split('T')[0],
      issuedBy: '',
      receivedBy: '',
    });
    setItems([{ id: '1', itemName: '', top: 0, bottom: 0 }]);
  };

  const exportDeliveryNotePDF = async (note: DeliveryNote) => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DELIVERY NOTE', doc.internal.pageSize.width / 2, 20, { align: 'center' });

    // Company logo area
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('GHOUSH', 14, 35);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('MILITARY SAFETY UNIFORMS', 14, 42);

    // To and Date
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TO: ${note.toRecipient}`, 14, 55);
    doc.text(`DATE: ${new Date(note.date).toLocaleDateString()}`, doc.internal.pageSize.width - 14, 55, { align: 'right' });

    // Items table
    const tableBody = note.items.map(item => [
      item.itemName,
      item.top.toString(),
      item.bottom.toString(),
    ]);

    // Add total row
    const totalTop = note.items.reduce((sum, item) => sum + item.top, 0);
    const totalBottom = note.items.reduce((sum, item) => sum + item.bottom, 0);
    tableBody.push(['TOTAL', totalTop.toString(), totalBottom.toString()]);

    autoTable(doc, {
      startY: 65,
      head: [['ITEM', 'TOP', 'BOTTOM']],
      body: tableBody,
      theme: 'grid',
      headStyles: { 
        fillColor: [240, 240, 240], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { fontSize: 10, halign: 'center' },
      columnStyles: {
        0: { halign: 'left', cellWidth: 100 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
      },
      footStyles: { fontStyle: 'bold' },
    });

    // Signature section
    const signatureY = (doc as any).lastAutoTable.finalY + 30;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Issued by
    doc.text('ISSUED BY', 14, signatureY);
    doc.text('NAME.............................', 14, signatureY + 10);
    
    // Received by
    doc.text('RECEIVED BY', doc.internal.pageSize.width / 2 + 20, signatureY);
    doc.text('NAME.............................', doc.internal.pageSize.width / 2 + 20, signatureY + 10);

    doc.save(`DeliveryNote_${note.noteNo}_${note.toRecipient}.pdf`);
    toast({ title: 'PDF exported successfully' });
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Delivery Notes</h1>
            <p className="text-muted-foreground">Create delivery notes for sending samples outside</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                New Delivery Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Delivery Note</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>To (Recipient)</Label>
                    <Input
                      value={formData.toRecipient}
                      onChange={(e) => setFormData({ ...formData, toRecipient: e.target.value })}
                      placeholder="MR. ABDULLAH"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Items</Label>
                    <Button variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
                      <div className="col-span-6">ITEM NAME</div>
                      <div className="col-span-2 text-center">TOP</div>
                      <div className="col-span-2 text-center">BOTTOM</div>
                      <div className="col-span-2"></div>
                    </div>
                    
                    {items.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <Input
                            value={item.itemName}
                            onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                            placeholder="Item name / Style"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            className="text-center"
                            value={item.top}
                            onChange={(e) => updateItem(item.id, 'top', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            className="text-center"
                            value={item.bottom}
                            onChange={(e) => updateItem(item.id, 'bottom', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-end pt-2">
                      <Badge variant="secondary" className="text-base">
                        Total Items: {calculateTotal()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Signature Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Issued By</Label>
                    <Input
                      value={formData.issuedBy}
                      onChange={(e) => setFormData({ ...formData, issuedBy: e.target.value })}
                      placeholder="Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Received By</Label>
                    <Input
                      value={formData.receivedBy}
                      onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
                      placeholder="Name"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreate} 
                    className="gradient-primary text-primary-foreground"
                    disabled={!formData.toRecipient || items.filter(i => i.itemName.trim()).length === 0}
                  >
                    Create Delivery Note
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{deliveryNotes.length}</p>
                  <p className="text-sm text-muted-foreground">Total Delivery Notes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <Package className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {deliveryNotes.reduce((sum, note) => 
                      sum + note.items.reduce((s, i) => s + i.top + i.bottom, 0), 0
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Items Delivered</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delivery Notes Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Delivery Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Note No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Total Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deliveryNotes.map((note) => {
                    const totalQty = note.items.reduce((sum, i) => sum + i.top + i.bottom, 0);
                    return (
                      <tr key={note.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono">DN#{note.noteNo}</Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">{note.toRecipient}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(note.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{note.items.length}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{totalQty}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => exportDeliveryNotePDF(note)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {deliveryNotes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No delivery notes yet. Click "New Delivery Note" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DeliveryNotes;
