import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, Download, Package, CalendarIcon, FileText, RotateCcw, Plus, Trash2, Edit, Save, Wifi, WifiOff, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCuttingStore } from '@/store/cuttingStore';
import { useRequirementStore } from '@/store/requirementStore';
import { useRequests, useRequestItems } from '@/hooks/useRequests';
import { 
  useDeliveryAcknowledgments, 
  useDeliveryItems, 
  useCreateDeliveryAcknowledgment, 
  useCreateDeliveryItems,
  useDeleteDeliveryAcknowledgment,
  DeliveryAcknowledgment 
} from '@/hooks/useDeliveryAcknowledgments';
import { exportDeliveryNotePDF } from '@/lib/requestPdfExport';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DeliveryItem {
  id: string;
  slNo: number;
  itemCode: string;
  description: string;
  requirementQty: number;
  issuedQty: number;
  balance: number;
  remarks: string;
}

const DeliveryNotes = () => {
  const { toast } = useToast();
  const { orders } = useCuttingStore();
  const { requirements, materialCatalog } = useRequirementStore();
  
  // Online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Database hooks
  const { data: dbRequests = [] } = useRequests();
  const { data: savedDeliveryNotes = [], refetch: refetchNotes } = useDeliveryAcknowledgments();
  const createDeliveryAcknowledgment = useCreateDeliveryAcknowledgment();
  const createDeliveryItems = useCreateDeliveryItems();
  const deleteDeliveryAcknowledgment = useDeleteDeliveryAcknowledgment();
  
  // Form state
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [trNo, setTrNo] = useState('');
  const [line, setLine] = useState('');
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
  
  // Edit mode
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showSavedNotes, setShowSavedNotes] = useState(false);
  
  // Selected delivery note items from DB
  const { data: selectedNoteItems = [] } = useDeliveryItems(editingNoteId || undefined);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load items when editing a saved note
  useEffect(() => {
    if (editingNoteId && selectedNoteItems.length > 0) {
      const items: DeliveryItem[] = selectedNoteItems.map((item, index) => ({
        id: item.id,
        slNo: index + 1,
        itemCode: item.item_code || '',
        description: item.description || '',
        requirementQty: item.requirement_qty || 0,
        issuedQty: item.issued_qty || 0,
        balance: (item.requirement_qty || 0) - (item.issued_qty || 0),
        remarks: '',
      }));
      setDeliveryItems(items);
    }
  }, [editingNoteId, selectedNoteItems]);

  // Get orders that have requirements (for offline mode)
  const ordersWithRequirements = useMemo(() => {
    const orderIds = new Set(requirements.map(r => r.orderId));
    return orders.filter(order => orderIds.has(order.id));
  }, [requirements, orders]);

  // Get requests for selected order
  const orderRequests = useMemo(() => {
    if (!selectedOrderId) return [];
    return dbRequests.filter(r => r.order_id === selectedOrderId);
  }, [dbRequests, selectedOrderId]);

  // Get selected order info
  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  // Get delivery notes linked to requests
  const deliveryNotesForOrder = useMemo(() => {
    if (!selectedOrderId) return [];
    const requestIds = orderRequests.map(r => r.id);
    return savedDeliveryNotes.filter(dn => dn.request_id && requestIds.includes(dn.request_id));
  }, [savedDeliveryNotes, orderRequests, selectedOrderId]);

  // When order changes, load requirements as delivery items
  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    setSelectedRequestId('');
    setEditingNoteId(null);
    
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setLine(''); // Line must be entered manually by user
      
      // Load requirements for this order
      const orderRequirements = requirements.filter(r => r.orderId === orderId);
      const items: DeliveryItem[] = orderRequirements.map((req, index) => ({
        id: req.id,
        slNo: index + 1,
        itemCode: req.itemCode || '',
        description: req.description,
        requirementQty: req.requiredQty || 0,
        issuedQty: 0, // Empty for manual entry
        balance: req.requiredQty || 0,
        remarks: req.remarks || '',
      }));
      setDeliveryItems(items);
    } else {
      setDeliveryItems([]);
    }
  };

  // Load a saved delivery note for editing
  const handleEditNote = (note: DeliveryAcknowledgment) => {
    setEditingNoteId(note.id);
    setSelectedRequestId(note.request_id || '');
    setDeliveryDate(new Date(note.delivery_date));
    setTrNo(note.acknowledgment_no || '');
    setLine(note.received_by || '');
    setShowSavedNotes(false);
  };

  // Add a new empty row
  const addNewRow = () => {
    const newSlNo = deliveryItems.length + 1;
    setDeliveryItems(prev => [...prev, {
      id: `new-${Date.now()}`,
      slNo: newSlNo,
      itemCode: '',
      description: '',
      requirementQty: 0,
      issuedQty: 0,
      balance: 0,
      remarks: '',
    }]);
  };

  // Remove a row
  const removeRow = (id: string) => {
    setDeliveryItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      // Re-number the rows
      return filtered.map((item, index) => ({ ...item, slNo: index + 1 }));
    });
  };

  // Update item fields
  const updateItem = (id: string, field: keyof DeliveryItem, value: string | number) => {
    setDeliveryItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate balance when requirement or issued qty changes
        if (field === 'requirementQty' || field === 'issuedQty') {
          updated.balance = (updated.requirementQty || 0) - (updated.issuedQty || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  // Save delivery note to database
  const handleSave = async () => {
    if (!line.trim()) {
      toast({ title: 'Line Name is required', description: 'Please enter the Line Name before saving.', variant: 'destructive' });
      return;
    }
    if (deliveryItems.length === 0) {
      toast({ title: 'Please add at least one item', variant: 'destructive' });
      return;
    }

    if (!isOnline) {
      toast({ title: 'Cannot save while offline', description: 'Please connect to the internet to save.', variant: 'destructive' });
      return;
    }

    try {
      // Generate acknowledgment number
      const ackNo = `DN-${String(savedDeliveryNotes.length + 1).padStart(3, '0')}-${new Date().getFullYear()}`;
      
      // Create delivery acknowledgment
      const ack = await createDeliveryAcknowledgment.mutateAsync({
        request_id: selectedRequestId || undefined,
        acknowledgment_no: ackNo,
        delivery_date: format(deliveryDate, 'yyyy-MM-dd'),
        received_by: line,
        notes: trNo,
      });

      // Create delivery items
      const itemsToCreate = deliveryItems.map(item => ({
        acknowledgment_id: ack.id,
        item_code: item.itemCode,
        description: item.description,
        requirement_qty: item.requirementQty,
        issued_qty: item.issuedQty,
        unit: 'pcs',
      }));

      await createDeliveryItems.mutateAsync(itemsToCreate);
      
      toast({ title: 'Delivery note saved successfully' });
      refetchNotes();
      
    } catch (error) {
      console.error('Failed to save delivery note:', error);
      toast({ title: 'Failed to save delivery note', variant: 'destructive' });
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedOrderId('');
    setSelectedRequestId('');
    setEditingNoteId(null);
    setDeliveryDate(new Date());
    setTrNo('');
    setLine('');
    setDeliveryItems([]);
  };

  // Download PDF
  const handleDownloadPDF = () => {
    if (!line.trim()) {
      toast({ title: 'Line Name is required', description: 'Please enter the Line Name before downloading.', variant: 'destructive' });
      return;
    }
    if (deliveryItems.length === 0) {
      toast({ title: 'Please add at least one item', variant: 'destructive' });
      return;
    }

    const pdfItems = deliveryItems.map(item => ({
      slNo: item.slNo,
      description: item.description,
      requirementQty: item.requirementQty,
      issuedQty: item.issuedQty,
      balance: item.balance,
      remarks: item.remarks,
    }));

    const orderName = selectedOrder 
      ? `${selectedOrder.orderNumber} ${selectedOrder.styleNo || ''} ${selectedOrder.customer || ''} ${selectedOrder.totalQty || ''} QTY`.trim()
      : 'General Delivery';

    exportDeliveryNotePDF(
      {
        orderName,
        date: deliveryDate.toISOString(),
        trNo,
        line,
      },
      pdfItems
    );

    toast({ title: 'Delivery Acknowledgment Report downloaded' });
  };

  // Delete a saved note
  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this delivery note?')) return;
    
    try {
      await deleteDeliveryAcknowledgment.mutateAsync(id);
      refetchNotes();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  // Stats
  const totalRequirementQty = deliveryItems.reduce((sum, item) => sum + (item.requirementQty || 0), 0);
  const totalIssuedQty = deliveryItems.reduce((sum, item) => sum + (item.issuedQty || 0), 0);
  const totalBalance = deliveryItems.reduce((sum, item) => sum + (item.balance || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Truck className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
              <span>Delivery Acknowledgment</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Record material delivery to production line for supervisor acknowledgment
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={isOnline ? 'default' : 'secondary'} className="gap-1">
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => setShowSavedNotes(!showSavedNotes)} 
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Saved Notes ({savedDeliveryNotes.length})
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Saved Delivery Notes List */}
        {showSavedNotes && savedDeliveryNotes.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <List className="h-5 w-5" />
                Saved Delivery Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Doc No</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Line</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-32 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedDeliveryNotes.map((note) => {
                      // Find order name from the linked request
                      const linkedRequest = dbRequests.find(r => r.id === note.request_id);
                      const linkedOrder = linkedRequest ? orders.find(o => o.id === linkedRequest.order_id) : null;
                      const orderDisplay = linkedOrder 
                        ? `${linkedOrder.orderNumber} - ${linkedOrder.customer || ''}` 
                        : (note.notes?.startsWith('ORDER:') ? note.notes.split('|')[0].replace('ORDER:', '') : '-');
                      return (
                        <TableRow key={note.id}>
                          <TableCell className="font-mono font-medium">{note.acknowledgment_no}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate" title={orderDisplay}>{orderDisplay}</TableCell>
                          <TableCell>{format(new Date(note.delivery_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{note.received_by || '-'}</TableCell>
                          <TableCell>{note.notes || '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditNote(note)}
                              className="gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Editing indicator */}
        {editingNoteId && (
          <Alert>
            <Edit className="h-4 w-4" />
            <AlertDescription>
              Editing delivery note. Make your changes and click Save or Download PDF.
            </AlertDescription>
          </Alert>
        )}

        {/* Selection Form */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Delivery Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Order Dropdown (optional) */}
              <div className="space-y-2">
                <Label>Order <span className="text-destructive">*</span></Label>
                <Select value={selectedOrderId} onValueChange={handleOrderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Order to load items" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.length === 0 ? (
                      <SelectItem value="none" disabled>No orders available</SelectItem>
                    ) : (
                      orders.map((order) => {
                        const hasRequirements = ordersWithRequirements.some(o => o.id === order.id);
                        const hasRequests = dbRequests.some(r => r.order_id === order.id);
                        return (
                          <SelectItem key={order.id} value={order.id}>
                            {order.orderNumber} - {order.customer || 'Unknown'}
                            {hasRequests && ' (has requests)'}
                            {!hasRequests && hasRequirements && ' (has requirements)'}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(deliveryDate, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={(date) => date && setDeliveryDate(date)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* TR No */}
              <div className="space-y-2">
                <Label>TR No</Label>
                <Input
                  value={trNo}
                  onChange={(e) => setTrNo(e.target.value)}
                  placeholder="Enter TR number"
                />
              </div>

              {/* Line */}
              <div className="space-y-2">
                <Label>Line <span className="text-destructive">*</span></Label>
                <Input
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                  placeholder="Enter line (required)"
                  className={!line.trim() ? 'border-destructive' : ''}
                />
              </div>
            </div>

            {/* Delivery Notes for this Order */}
            {deliveryNotesForOrder.length > 0 && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-primary mb-2">Existing Delivery Notes for this Order:</p>
                <div className="flex flex-wrap gap-2">
                  {deliveryNotesForOrder.map(dn => (
                    <Button 
                      key={dn.id} 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditNote(dn)}
                      className="gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      {dn.acknowledgment_no}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Order Info */}
            {selectedOrder && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-1">Selected Order</p>
                <p className="font-semibold text-lg">
                  {selectedOrder.orderNumber} - {selectedOrder.styleNo || 'N/A'} ({selectedOrder.customer || 'Unknown'}) - {selectedOrder.totalQty} QTY
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Delivery Items
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={addNewRow} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Row
              </Button>
              {isOnline && (
                <Button 
                  variant="outline"
                  onClick={handleSave} 
                  className="gap-2"
                  disabled={deliveryItems.length === 0 || createDeliveryAcknowledgment.isPending}
                >
                  <Save className="h-4 w-4" />
                  {createDeliveryAcknowledgment.isPending ? 'Saving...' : 'Save'}
                </Button>
              )}
              <Button 
                onClick={handleDownloadPDF} 
                className="gap-2"
                disabled={deliveryItems.length === 0}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">NO</TableHead>
                    <TableHead>ITEM DESCRIPTION</TableHead>
                    <TableHead className="w-28 text-center">REQ QTY</TableHead>
                    <TableHead className="w-28 text-center">ISSUED QTY</TableHead>
                    <TableHead className="w-24 text-center">BALANCE</TableHead>
                    <TableHead className="w-36">REMARK</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Select an order to load requirements or click "Add Row" to enter items manually
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {deliveryItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-center font-mono">{item.slNo}</TableCell>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              className="h-8"
                              placeholder="Item description"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={item.requirementQty || ''}
                              onChange={(e) => updateItem(item.id, 'requirementQty', parseInt(e.target.value) || 0)}
                              className="h-8 w-20 text-center mx-auto"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="0"
                              value={item.issuedQty || ''}
                              onChange={(e) => updateItem(item.id, 'issuedQty', parseInt(e.target.value) || 0)}
                              className="h-8 w-20 text-center mx-auto"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={item.balance === 0 ? 'default' : item.balance < 0 ? 'destructive' : 'secondary'}
                              className="font-mono"
                            >
                              {item.balance}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.remarks}
                              onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                              className="h-8"
                              placeholder="Remark"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeRow(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Totals Row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell></TableCell>
                        <TableCell className="text-right">TOTAL</TableCell>
                        <TableCell className="text-center font-mono">{totalRequirementQty}</TableCell>
                        <TableCell className="text-center font-mono">{totalIssuedQty}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {totalBalance}
                          </Badge>
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Signature Section Info */}
            <div className="mt-6 p-4 border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground text-center">
                The PDF will include signature sections for <strong>Store In-Charge</strong>, <strong>Line Recorder</strong>, <strong>Line Supervisor</strong>, and <strong>Production Manager</strong> acknowledgment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DeliveryNotes;
