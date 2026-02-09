import { useState, useMemo } from 'react';
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
import { Truck, Download, Package, CalendarIcon, FileText, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCuttingStore } from '@/store/cuttingStore';
import { useRequirementStore } from '@/store/requirementStore';
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
  
  // Form state
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [trNo, setTrNo] = useState('');
  const [line, setLine] = useState('');
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);

  // Get orders that have requirements (for offline mode)
  const ordersWithRequirements = useMemo(() => {
    const orderIds = new Set(requirements.map(r => r.orderId));
    return orders.filter(order => orderIds.has(order.id));
  }, [requirements, orders]);

  // Get selected order info
  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  // When order changes, load requirements as delivery items
  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setLine(order.orderNumber || '');
      
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

  // Reset form
  const handleReset = () => {
    setSelectedOrderId('');
    setDeliveryDate(new Date());
    setTrNo('');
    setLine('');
    setDeliveryItems([]);
  };

  // Download PDF
  const handleDownloadPDF = () => {
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
      : line || 'General Delivery';

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

  // Stats
  const totalRequirementQty = deliveryItems.reduce((sum, item) => sum + (item.requirementQty || 0), 0);
  const totalIssuedQty = deliveryItems.reduce((sum, item) => sum + (item.issuedQty || 0), 0);
  const totalBalance = deliveryItems.reduce((sum, item) => sum + (item.balance || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Truck className="h-8 w-8 text-primary" />
              Delivery Acknowledgment
            </h1>
            <p className="text-muted-foreground mt-1">
              Record material delivery to production line for supervisor acknowledgment
            </p>
          </div>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

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
                <Label>Order (Optional)</Label>
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
                        return (
                          <SelectItem key={order.id} value={order.id}>
                            {order.orderNumber} - {order.customer || 'Unknown'}
                            {hasRequirements && ' (has requirements)'}
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
                <Label>Line</Label>
                <Input
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                  placeholder="Enter line"
                />
              </div>
            </div>

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