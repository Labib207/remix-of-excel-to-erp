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
import { Truck, Download, Package, CalendarIcon, FileText, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRequestStore } from '@/store/requestStore';
import { useCuttingStore } from '@/store/cuttingStore';
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
  const { submittedRequests } = useRequestStore();
  const { orders } = useCuttingStore();
  
  // Form state
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [trNo, setTrNo] = useState('');
  const [line, setLine] = useState('');
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);

  // Get orders that have submitted requests (raw-material or general-supplies)
  const ordersWithRequests = useMemo(() => {
    const orderIds = new Set<string>();
    submittedRequests
      .filter(req => req.type !== 'material-return' && (req.form as any).orderId)
      .forEach(req => {
        orderIds.add((req.form as any).orderId);
      });
    
    return orders.filter(order => orderIds.has(order.id));
  }, [submittedRequests, orders]);

  // Get requests for selected order
  const requestsForOrder = useMemo(() => {
    if (!selectedOrderId) return [];
    return submittedRequests.filter(
      req => req.type !== 'material-return' && (req.form as any).orderId === selectedOrderId
    );
  }, [submittedRequests, selectedOrderId]);

  // Get selected order info
  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  // Get selected request info
  const selectedRequest = useMemo(() => {
    return submittedRequests.find(r => r.id === selectedRequestId);
  }, [submittedRequests, selectedRequestId]);

  // When order changes, reset request selection
  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    setSelectedRequestId('');
    setDeliveryItems([]);
    
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setLine(order.orderNumber || '');
    }
  };

  // When request is selected, load items
  const handleRequestChange = (requestId: string) => {
    setSelectedRequestId(requestId);
    
    const request = submittedRequests.find(r => r.id === requestId);
    if (request) {
      const items: DeliveryItem[] = request.items.map((item: any) => ({
        id: item.id,
        slNo: item.slNo,
        itemCode: item.itemCode || '',
        description: item.description,
        requirementQty: item.requirementQty || item.requestedQty || 0,
        issuedQty: 0, // Empty for manual entry
        balance: item.requirementQty || item.requestedQty || 0, // Full balance initially
        remarks: item.remarks || '',
      }));
      setDeliveryItems(items);
    }
  };

  // Update issued qty and calculate balance
  const updateIssuedQty = (itemId: string, issuedQty: number) => {
    setDeliveryItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          issuedQty,
          balance: item.requirementQty - issuedQty,
        };
      }
      return item;
    }));
  };

  // Reset form
  const handleReset = () => {
    setSelectedOrderId('');
    setSelectedRequestId('');
    setDeliveryDate(new Date());
    setTrNo('');
    setLine('');
    setDeliveryItems([]);
  };

  // Download PDF
  const handleDownloadPDF = () => {
    if (!selectedOrder || deliveryItems.length === 0) {
      toast({ title: 'Please select an order and request first', variant: 'destructive' });
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

    const orderName = `${selectedOrder.orderNumber} ${selectedOrder.styleNo || ''} ${selectedOrder.customer || ''} ${selectedOrder.totalQty || ''} QTY`.trim();

    exportDeliveryNotePDF(
      {
        orderName,
        date: deliveryDate.toISOString(),
        trNo,
        line,
      },
      pdfItems,
      selectedRequest?.docNumber
    );

    toast({ title: 'Delivery Acknowledgment Report downloaded' });
  };

  // Stats
  const totalRequirementQty = deliveryItems.reduce((sum, item) => sum + item.requirementQty, 0);
  const totalIssuedQty = deliveryItems.reduce((sum, item) => sum + item.issuedQty, 0);
  const totalBalance = deliveryItems.reduce((sum, item) => sum + item.balance, 0);

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
              Select Order & Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Order Dropdown */}
              <div className="space-y-2">
                <Label>Order <span className="text-destructive">*</span></Label>
                <Select value={selectedOrderId} onValueChange={handleOrderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Order" />
                  </SelectTrigger>
                  <SelectContent>
                    {ordersWithRequests.length === 0 ? (
                      <SelectItem value="none" disabled>No orders with requests</SelectItem>
                    ) : (
                      ordersWithRequests.map((order) => {
                        const requestCount = requestsForOrder.length;
                        return (
                          <SelectItem key={order.id} value={order.id}>
                            {order.orderNumber} - {order.customer || 'Unknown'}
                            {selectedOrderId === order.id && requestCount > 0 && ` (${requestCount})`}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Request Dropdown */}
              <div className="space-y-2">
                <Label>Request No <span className="text-destructive">*</span></Label>
                <Select 
                  value={selectedRequestId} 
                  onValueChange={handleRequestChange}
                  disabled={!selectedOrderId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedOrderId ? "Select Request" : "Select order first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {requestsForOrder.length === 0 ? (
                      <SelectItem value="none" disabled>No requests for this order</SelectItem>
                    ) : (
                      requestsForOrder.map((request) => (
                        <SelectItem key={request.id} value={request.id}>
                          {request.docNumber} ({request.items.length} items)
                        </SelectItem>
                      ))
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
            </div>

            {/* Line */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        {deliveryItems.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Delivery Items
              </CardTitle>
              <Button onClick={handleDownloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-14 text-center">NO</TableHead>
                      <TableHead>ITEM</TableHead>
                      <TableHead className="w-32 text-center">REQUIREMENT QTY</TableHead>
                      <TableHead className="w-32 text-center">ISSUED QTY</TableHead>
                      <TableHead className="w-28 text-center">BALANCE</TableHead>
                      <TableHead className="w-40">REMARK</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-center font-mono">{item.slNo}</TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-center font-mono">{item.requirementQty}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            value={item.issuedQty || ''}
                            onChange={(e) => updateIssuedQty(item.id, parseInt(e.target.value) || 0)}
                            className="h-8 w-24 text-center mx-auto"
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
                            onChange={(e) => {
                              setDeliveryItems(prev => prev.map(i => 
                                i.id === item.id ? { ...i, remarks: e.target.value } : i
                              ));
                            }}
                            className="h-8"
                            placeholder="Remark"
                          />
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
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Signature Section Info */}
              <div className="mt-6 p-4 border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground text-center">
                  The PDF will include signature sections for <strong>Line Supervisor</strong> and <strong>Line Recorder</strong> acknowledgment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {deliveryItems.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Select an <strong>Order</strong> and <strong>Request</strong> above to load delivery items.
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                First submit a Raw Material Request for an order, then come here to record the delivery.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default DeliveryNotes;