import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Search, Download, FileText, Package, Undo2, Eye, FileSpreadsheet, CalendarIcon, Truck } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useRequestStore } from '@/store/requestStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  exportRawMaterialRequestPDF,
  exportGeneralSuppliesRequestPDF,
  exportMaterialReturnSlipPDF,
  exportDeliveryNotePDF,
} from '@/lib/requestPdfExport';
import * as XLSX from 'xlsx';

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

const typeLabels: Record<string, string> = {
  'raw-material': 'Raw Material',
  'general-supplies': 'General Supplies',
  'material-return': 'Material Return',
};

const typeIcons: Record<string, React.ReactNode> = {
  'raw-material': <Package className="h-4 w-4" />,
  'general-supplies': <FileText className="h-4 w-4" />,
  'material-return': <Undo2 className="h-4 w-4" />,
};

const typeBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  'raw-material': 'default',
  'general-supplies': 'secondary',
  'material-return': 'outline',
};

export function RequestHistoryTable() {
  const { submittedRequests } = useRequestStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedRequest, setSelectedRequest] = useState<SubmittedRequest | null>(null);

  const filteredRequests = useMemo(() => {
    return submittedRequests
      .filter((request) => {
        // Type filter
        if (typeFilter !== 'all' && request.type !== typeFilter) {
          return false;
        }

        // Date range filter
        if (dateFrom || dateTo) {
          const requestDate = new Date(request.form.date);
          if (dateFrom && dateTo) {
            if (!isWithinInterval(requestDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) })) {
              return false;
            }
          } else if (dateFrom) {
            if (requestDate < startOfDay(dateFrom)) {
              return false;
            }
          } else if (dateTo) {
            if (requestDate > endOfDay(dateTo)) {
              return false;
            }
          }
        }

        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesDocNumber = request.docNumber.toLowerCase().includes(query);
          const matchesDepartment = request.form.department.toLowerCase().includes(query);
          const matchesRequestedBy = request.form.requestedBy.toLowerCase().includes(query);
          const matchesItems = request.items.some(
            (item) =>
              item.itemCode.toLowerCase().includes(query) ||
              item.description.toLowerCase().includes(query)
          );
          return matchesDocNumber || matchesDepartment || matchesRequestedBy || matchesItems;
        }

        return true;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [submittedRequests, searchQuery, typeFilter, dateFrom, dateTo]);

  const handleDownloadPDF = (request: SubmittedRequest) => {
    if (request.type === 'raw-material') {
      exportRawMaterialRequestPDF(request.form, request.items as RequestItem[], request.docNumber);
    } else if (request.type === 'general-supplies') {
      exportGeneralSuppliesRequestPDF(request.form, request.items as RequestItem[], request.docNumber);
    } else {
      exportMaterialReturnSlipPDF(request.form, request.items as ReturnItem[], request.docNumber);
    }
  };

  // Download Delivery Note PDF - for line supervisor acknowledgment
  const handleDownloadDeliveryNote = (request: SubmittedRequest) => {
    if (request.type === 'material-return') return; // Not applicable for returns
    
    const items = request.items as RequestItem[];
    const deliveryItems = items.map(item => ({
      slNo: item.slNo,
      description: item.description,
      requirementQty: item.requirementQty || item.requestedQty, // Fallback to requestedQty if no requirementQty
      issuedQty: item.issuedQty,
      balance: (item.requirementQty || item.requestedQty) - item.issuedQty,
      remarks: item.remarks,
    }));

    exportDeliveryNotePDF(
      {
        orderName: request.form.orderName || request.docNumber,
        date: request.form.date,
        trNo: '',
        line: request.form.department,
      },
      deliveryItems,
      request.docNumber
    );
  };

  const getFilteredRequestsForExport = () => {
    return submittedRequests.filter((request) => {
      // Date range filter
      if (dateFrom || dateTo) {
        const requestDate = new Date(request.form.date);
        if (dateFrom && dateTo) {
          if (!isWithinInterval(requestDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) })) {
            return false;
          }
        } else if (dateFrom) {
          if (requestDate < startOfDay(dateFrom)) {
            return false;
          }
        } else if (dateTo) {
          if (requestDate > endOfDay(dateTo)) {
            return false;
          }
        }
      }
      return true;
    });
  };

  const exportToExcel = (type: 'raw-material' | 'general-supplies' | 'material-return' | 'all') => {
    const allFilteredRequests = getFilteredRequestsForExport();
    const requests = type === 'all' 
      ? allFilteredRequests 
      : allFilteredRequests.filter(r => r.type === type);
    
    if (requests.length === 0) {
      return;
    }

    const wb = XLSX.utils.book_new();
    const dateRangeText = dateFrom && dateTo 
      ? `${format(dateFrom, 'dd-MM-yyyy')}_to_${format(dateTo, 'dd-MM-yyyy')}`
      : dateFrom 
        ? `from_${format(dateFrom, 'dd-MM-yyyy')}`
        : dateTo 
          ? `to_${format(dateTo, 'dd-MM-yyyy')}`
          : format(new Date(), 'yyyy-MM-dd');
    
    if (type === 'all' || type === 'raw-material') {
      const rawMaterialRequests = (type === 'all' ? allFilteredRequests : requests)
        .filter(r => r.type === 'raw-material')
        .sort((a, b) => new Date(a.form.date).getTime() - new Date(b.form.date).getTime());
      
      if (rawMaterialRequests.length > 0) {
        const data = rawMaterialRequests.flatMap(request => 
          (request.items as RequestItem[])
            .sort((a, b) => a.slNo - b.slNo)
            .map(item => ({
              'Order': request.docNumber,
              'Date': format(new Date(request.form.date), 'dd/MM/yyyy'),
              'Department': request.form.department,
              'Requested By': request.form.requestedBy,
              'SL No': item.slNo,
              'Item Code': item.itemCode,
              'Description': item.description,
              'UOM': item.uom,
              'Requested Qty': item.requestedQty,
              'Issued Qty': item.issuedQty,
              'Remaining Qty': item.remainingQty,
              'Remarks': item.remarks,
              'Submitted At': format(new Date(request.submittedAt), 'dd/MM/yyyy HH:mm'),
            }))
        );
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
          { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 8 },
          { wch: 15 }, { wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
          { wch: 12 }, { wch: 20 }, { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Raw Material');
      }
    }
    
    if (type === 'all' || type === 'general-supplies') {
      const generalSuppliesRequests = (type === 'all' ? allFilteredRequests : requests)
        .filter(r => r.type === 'general-supplies')
        .sort((a, b) => new Date(a.form.date).getTime() - new Date(b.form.date).getTime());
      
      if (generalSuppliesRequests.length > 0) {
        const data = generalSuppliesRequests.flatMap(request => 
          (request.items as RequestItem[])
            .sort((a, b) => a.slNo - b.slNo)
            .map(item => ({
              'Order': request.docNumber,
              'Date': format(new Date(request.form.date), 'dd/MM/yyyy'),
              'Department': request.form.department,
              'Requested By': request.form.requestedBy,
              'SL No': item.slNo,
              'Item Code': item.itemCode,
              'Description': item.description,
              'UOM': item.uom,
              'Requested Qty': item.requestedQty,
              'Issued Qty': item.issuedQty,
              'Remaining Qty': item.remainingQty,
              'Remarks': item.remarks,
              'Submitted At': format(new Date(request.submittedAt), 'dd/MM/yyyy HH:mm'),
            }))
        );
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
          { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 8 },
          { wch: 15 }, { wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
          { wch: 12 }, { wch: 20 }, { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'General Supplies');
      }
    }
    
    if (type === 'all' || type === 'material-return') {
      const materialReturnRequests = (type === 'all' ? allFilteredRequests : requests)
        .filter(r => r.type === 'material-return')
        .sort((a, b) => new Date(a.form.date).getTime() - new Date(b.form.date).getTime());
      
      if (materialReturnRequests.length > 0) {
        const data = materialReturnRequests.flatMap(request => 
          (request.items as ReturnItem[])
            .sort((a, b) => a.slNo - b.slNo)
            .map(item => ({
              'Order': request.docNumber,
              'Date': format(new Date(request.form.date), 'dd/MM/yyyy'),
              'Department': request.form.department,
              'Returned By': request.form.requestedBy,
              'SL No': item.slNo,
              'Item Code': item.itemCode,
              'Description': item.description,
              'UOM': item.uom,
              'Qty Returned': item.qtyReturned,
              'Qty Received': item.qtyReceived,
              'Remarks': item.remarks,
              'Submitted At': format(new Date(request.submittedAt), 'dd/MM/yyyy HH:mm'),
            }))
        );
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
          { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 8 },
          { wch: 15 }, { wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
          { wch: 20 }, { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Material Return');
      }
    }

    const fileName = type === 'all' 
      ? `All_Requests_${dateRangeText}.xlsx`
      : `${typeLabels[type].replace(' ', '_')}_${dateRangeText}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
  };

  const getExportCounts = () => {
    const filtered = getFilteredRequestsForExport();
    return {
      rawMaterial: filtered.filter(r => r.type === 'raw-material').length,
      generalSupplies: filtered.filter(r => r.type === 'general-supplies').length,
      materialReturn: filtered.filter(r => r.type === 'material-return').length,
      total: filtered.length,
    };
  };

  const exportCounts = getExportCounts();

  const renderItemsTable = (request: SubmittedRequest) => {
    if (request.type === 'material-return') {
      const items = request.items as ReturnItem[];
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SL</TableHead>
              <TableHead>Item Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Qty Returned</TableHead>
              <TableHead>Qty Received</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.slNo}</TableCell>
                <TableCell>{item.itemCode}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.uom}</TableCell>
                <TableCell>{item.qtyReturned}</TableCell>
                <TableCell>{item.qtyReceived}</TableCell>
                <TableCell>{item.remarks}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    const items = request.items as RequestItem[];
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SL</TableHead>
            <TableHead>Item Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead>Req Qty</TableHead>
            <TableHead>Issued Qty</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.slNo}</TableCell>
              <TableCell>{item.itemCode}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell>{item.uom}</TableCell>
              <TableCell>{item.requestedQty}</TableCell>
              <TableCell>{item.issuedQty}</TableCell>
              <TableCell>{item.remainingQty}</TableCell>
              <TableCell>{item.remarks}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Request History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by doc number, department, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="raw-material">Raw Material</SelectItem>
                <SelectItem value="general-supplies">General Supplies</SelectItem>
                <SelectItem value="material-return">Material Return</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
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
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
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
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
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

          {/* Results Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doc Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {submittedRequests.length === 0
                        ? 'No requests submitted yet'
                        : 'No requests match your filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">{request.docNumber}</TableCell>
                      <TableCell>
                        <Badge variant={typeBadgeVariant[request.type]} className="gap-1">
                          {typeIcons[request.type]}
                          {typeLabels[request.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(request.form.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{request.form.department || '-'}</TableCell>
                      <TableCell>{request.form.requestedBy || '-'}</TableCell>
                      <TableCell>{request.items.length} items</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(request.submittedAt), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRequest(request)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadPDF(request)}
                            title="Download Request PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {request.type !== 'material-return' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadDeliveryNote(request)}
                              title="Download Delivery Note"
                              className="text-primary hover:text-primary"
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Export to Excel Section */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export Records to Excel
              {(dateFrom || dateTo) && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Filtered by date range)
                </span>
              )}
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToExcel('raw-material')}
                disabled={exportCounts.rawMaterial === 0}
                className="gap-2"
              >
                <Package className="h-4 w-4" />
                Raw Material ({exportCounts.rawMaterial})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToExcel('general-supplies')}
                disabled={exportCounts.generalSupplies === 0}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                General Supplies ({exportCounts.generalSupplies})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToExcel('material-return')}
                disabled={exportCounts.materialReturn === 0}
                className="gap-2"
              >
                <Undo2 className="h-4 w-4" />
                Material Return ({exportCounts.materialReturn})
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => exportToExcel('all')}
                disabled={exportCounts.total === 0}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export All ({exportCounts.total})
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Total: {filteredRequests.length} requests</span>
            <span>•</span>
            <span>
              Raw Material: {filteredRequests.filter((r) => r.type === 'raw-material').length}
            </span>
            <span>•</span>
            <span>
              General Supplies: {filteredRequests.filter((r) => r.type === 'general-supplies').length}
            </span>
            <span>•</span>
            <span>
              Material Return: {filteredRequests.filter((r) => r.type === 'material-return').length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge variant={typeBadgeVariant[selectedRequest.type]} className="gap-1">
                    {typeIcons[selectedRequest.type]}
                    {typeLabels[selectedRequest.type]}
                  </Badge>
                  <span className="font-mono">{selectedRequest.docNumber}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Form Details */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date:</span>{' '}
                    {format(new Date(selectedRequest.form.date), 'dd/MM/yyyy')}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Department:</span>{' '}
                    {selectedRequest.form.department || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">ASWAQ Number:</span>{' '}
                    {selectedRequest.form.aswaqNumber || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requested By:</span>{' '}
                    {selectedRequest.form.requestedBy || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Approved By:</span>{' '}
                    {selectedRequest.form.approvedBy || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Issued By:</span>{' '}
                    {selectedRequest.form.issuedBy || '-'}
                  </div>
                </div>

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  {renderItemsTable(selectedRequest)}
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <Button onClick={() => handleDownloadPDF(selectedRequest)} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
