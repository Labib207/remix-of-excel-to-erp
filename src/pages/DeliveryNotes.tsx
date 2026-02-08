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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Truck, Search, Download, Eye, Package, FileText, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRequestStore } from '@/store/requestStore';
import { exportDeliveryNotePDF } from '@/lib/requestPdfExport';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface RequestItem {
  id: string;
  slNo: number;
  itemCode: string;
  description: string;
  uom: string;
  requirementQty?: number;
  requestedQty: number;
  issuedQty: number;
  remainingQty: number;
  remarks: string;
}

interface ReturnItem {
  id: string;
  slNo: number;
  itemCode: string;
  description: string;
  uom: string;
  qtyReturned: number;
  qtyReceived: number;
  remarks: string;
}

interface RequestForm {
  date: string;
  department: string;
  orderId?: string;
  orderName?: string;
  requestedBy: string;
  approvedBy: string;
  issuedBy: string;
  aswaqNumber: string;
}

interface SubmittedRequest {
  id: string;
  type: 'raw-material' | 'general-supplies' | 'material-return';
  docNumber: string;
  form: RequestForm;
  items: (RequestItem | ReturnItem)[];
  submittedAt: string;
}

const DeliveryNotes = () => {
  const { toast } = useToast();
  const { submittedRequests } = useRequestStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedRequest, setSelectedRequest] = useState<SubmittedRequest | null>(null);
  const [deliveryForm, setDeliveryForm] = useState({
    trNo: '',
    line: '',
  });

  // Filter only raw-material and general-supplies (not material-return)
  const deliveryRequests = useMemo(() => {
    return submittedRequests
      .filter((request) => {
        // Only raw-material and general-supplies can have delivery notes
        if (request.type === 'material-return') return false;

        // Date range filter
        if (dateFrom || dateTo) {
          const requestDate = new Date(request.form.date);
          if (dateFrom && dateTo) {
            if (!isWithinInterval(requestDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) })) {
              return false;
            }
          } else if (dateFrom) {
            if (requestDate < startOfDay(dateFrom)) return false;
          } else if (dateTo) {
            if (requestDate > endOfDay(dateTo)) return false;
          }
        }

        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesDocNumber = request.docNumber.toLowerCase().includes(query);
          const matchesDepartment = request.form.department.toLowerCase().includes(query);
          const matchesOrder = (request.form as any).orderName?.toLowerCase().includes(query);
          const matchesItems = request.items.some(
            (item: any) =>
              item.itemCode?.toLowerCase().includes(query) ||
              item.description?.toLowerCase().includes(query)
          );
          return matchesDocNumber || matchesDepartment || matchesOrder || matchesItems;
        }

        return true;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [submittedRequests, searchQuery, dateFrom, dateTo]);

  const handleDownloadDeliveryNote = (request: SubmittedRequest, trNo?: string, line?: string) => {
    const items = request.items as RequestItem[];
    const deliveryItems = items.map(item => ({
      slNo: item.slNo,
      description: item.description,
      requirementQty: item.requirementQty || item.requestedQty,
      issuedQty: item.issuedQty,
      balance: (item.requirementQty || item.requestedQty) - item.issuedQty,
      remarks: item.remarks,
    }));

    exportDeliveryNotePDF(
      {
        orderName: (request.form as any).orderName || request.docNumber,
        date: request.form.date,
        trNo: trNo || '',
        line: line || request.form.department,
      },
      deliveryItems,
      request.docNumber
    );

    toast({ title: 'Delivery Note PDF downloaded' });
  };

  const handleQuickDownload = (request: SubmittedRequest) => {
    handleDownloadDeliveryNote(request, '', request.form.department);
  };

  const handleCustomDownload = () => {
    if (selectedRequest) {
      handleDownloadDeliveryNote(selectedRequest, deliveryForm.trNo, deliveryForm.line);
      setSelectedRequest(null);
      setDeliveryForm({ trNo: '', line: '' });
    }
  };

  const openCustomDialog = (request: SubmittedRequest) => {
    setSelectedRequest(request);
    setDeliveryForm({
      trNo: '',
      line: request.form.department,
    });
  };

  // Stats
  const totalRequests = deliveryRequests.length;
  const totalItems = deliveryRequests.reduce((sum, req) => sum + req.items.length, 0);
  const totalIssuedQty = deliveryRequests.reduce((sum, req) => 
    sum + req.items.reduce((s, item: any) => s + (item.issuedQty || 0), 0), 0
  );

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary" />
            Delivery Notes
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate delivery notes for issued materials - for line supervisor acknowledgment
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalRequests}</p>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Package className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalItems}</p>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <Truck className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalIssuedQty}</p>
                  <p className="text-sm text-muted-foreground">Total Issued Qty</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Filter Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by doc number, order, department, item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">From:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">To:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              {(dateFrom || dateTo) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}
                >
                  Clear Dates
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Submitted Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doc Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Issued Qty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {submittedRequests.length === 0
                          ? 'No requests submitted yet. Submit a Raw Material or General Supplies request first.'
                          : 'No requests match your filters'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveryRequests.map((request) => {
                      const totalIssued = request.items.reduce((sum, item: any) => sum + (item.issuedQty || 0), 0);
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono text-sm">{request.docNumber}</TableCell>
                          <TableCell>
                            <Badge variant={request.type === 'raw-material' ? 'default' : 'secondary'}>
                              {request.type === 'raw-material' ? 'Raw Material' : 'General Supplies'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {(request.form as any).orderName || '-'}
                          </TableCell>
                          <TableCell>{format(new Date(request.form.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{request.form.department || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{request.items.length} items</Badge>
                          </TableCell>
                          <TableCell className="font-mono">{totalIssued}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openCustomDialog(request)}
                                title="Customize & Download"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleQuickDownload(request)}
                                title="Quick Download Delivery Note"
                                className="text-primary hover:text-primary"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Custom Download Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Generate Delivery Note
              </DialogTitle>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-6 py-4">
                {/* Request Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Document</p>
                    <p className="font-mono font-medium">{selectedRequest.docNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Order</p>
                    <p className="font-medium">{(selectedRequest.form as any).orderName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p>{format(new Date(selectedRequest.form.date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Items</p>
                    <p>{selectedRequest.items.length} items</p>
                  </div>
                </div>

                {/* Custom Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>TR No</Label>
                    <Input
                      value={deliveryForm.trNo}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, trNo: e.target.value })}
                      placeholder="Enter TR number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Line</Label>
                    <Input
                      value={deliveryForm.line}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, line: e.target.value })}
                      placeholder="Enter line"
                    />
                  </div>
                </div>

                {/* Items Preview */}
                <div className="space-y-2">
                  <Label>Items Preview</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">No</TableHead>
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs text-right">Req Qty</TableHead>
                          <TableHead className="text-xs text-right">Issued</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRequest.items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs">{item.slNo}</TableCell>
                            <TableCell className="text-xs">{item.description}</TableCell>
                            <TableCell className="text-xs text-right">{item.requirementQty || item.requestedQty}</TableCell>
                            <TableCell className="text-xs text-right">{item.issuedQty}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCustomDownload} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Delivery Note
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default DeliveryNotes;