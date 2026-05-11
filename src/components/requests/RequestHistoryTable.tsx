import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Download, FileText, Package, Undo2, Eye, FileSpreadsheet, CalendarIcon, Truck, Trash2, Edit, Printer, Loader2 } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  exportRawMaterialRequestPDF,
  exportGeneralSuppliesRequestPDF,
  exportMaterialReturnSlipPDF,
  exportDeliveryNotePDF,
} from '@/lib/requestPdfExport';
import * as XLSX from 'xlsx';
import { useCloudRequests, useDeleteCloudRequest, getRequestType, type CloudRequest } from '@/hooks/useCloudRequests';

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

export function RequestHistoryTable({ onEdit }: { onEdit?: (request: any) => void }) {
  const { data: cloudRequests = [], isLoading } = useCloudRequests();
  const deleteCloudRequest = useDeleteCloudRequest();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedRequest, setSelectedRequest] = useState<CloudRequest | null>(null);

  const filteredRequests = useMemo(() => {
    return cloudRequests
      .filter((request) => {
        const reqType = getRequestType(request.request_no);
        if (typeFilter !== 'all' && reqType !== typeFilter) return false;

        if (dateFrom || dateTo) {
          const requestDate = new Date(request.request_date);
          if (dateFrom && dateTo) {
            if (!isWithinInterval(requestDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) })) return false;
          } else if (dateFrom) {
            if (requestDate < startOfDay(dateFrom)) return false;
          } else if (dateTo) {
            if (requestDate > endOfDay(dateTo)) return false;
          }
        }

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesDoc = request.request_no.toLowerCase().includes(query);
          const matchesDept = (request.department || '').toLowerCase().includes(query);
          const matchesBy = (request.requested_by || '').toLowerCase().includes(query);
          const matchesOrder = (request.order_no || '').toLowerCase().includes(query);
          const matchesItems = (request.items || []).some(
            item => (item.description || '').toLowerCase().includes(query) ||
                    (item.item_code || '').toLowerCase().includes(query)
          );
          return matchesDoc || matchesDept || matchesBy || matchesOrder || matchesItems;
        }

        return true;
      })
      .sort((a, b) => new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime());
  }, [cloudRequests, searchQuery, typeFilter, dateFrom, dateTo]);

  const handleDownloadPDF = (request: CloudRequest) => {
    const reqType = getRequestType(request.request_no);
    const items = (request.items || []).map((item, idx) => ({
      id: item.id,
      slNo: idx + 1,
      itemCode: item.item_code || '',
      description: item.description || '',
      uom: item.unit || 'pcs',
      requirementQty: item.requested_qty,
      requestedQty: item.requested_qty,
      issuedQty: item.issued_qty || 0,
      remainingQty: item.requested_qty - (item.issued_qty || 0),
      remarks: item.notes || '',
      qtyReturned: item.requested_qty,
      qtyReceived: item.issued_qty || 0,
    }));

    const form = {
      date: request.request_date,
      department: request.department || '',
      orderName: request.order_no || '',
      requestedBy: request.requested_by || '',
      approvedBy: '',
      issuedBy: '',
      aswaqNumber: '',
    };

    if (reqType === 'raw-material') {
      exportRawMaterialRequestPDF(form, items, request.request_no);
    } else if (reqType === 'general-supplies') {
      exportGeneralSuppliesRequestPDF(form, items, request.request_no);
    } else {
      exportMaterialReturnSlipPDF(form, items, request.request_no);
    }
  };

  const handleDownloadDeliveryNote = (request: CloudRequest) => {
    const reqType = getRequestType(request.request_no);
    if (reqType === 'material-return') return;

    const deliveryItems = (request.items || []).map((item, idx) => ({
      slNo: idx + 1,
      description: item.description || '',
      requirementQty: item.requested_qty,
      issuedQty: item.issued_qty || 0,
      balance: item.requested_qty - (item.issued_qty || 0),
      remarks: item.notes || '',
    }));

    exportDeliveryNotePDF(
      {
        orderName: request.order_no || request.request_no,
        date: request.request_date,
        trNo: '',
        line: request.department || '',
      },
      deliveryItems,
      request.request_no
    );
  };

  const getFilteredForExport = () => {
    return cloudRequests.filter((request) => {
      if (dateFrom || dateTo) {
        const requestDate = new Date(request.request_date);
        if (dateFrom && dateTo) {
          if (!isWithinInterval(requestDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) })) return false;
        } else if (dateFrom) {
          if (requestDate < startOfDay(dateFrom)) return false;
        } else if (dateTo) {
          if (requestDate > endOfDay(dateTo)) return false;
        }
      }
      return true;
    });
  };

  const exportToExcel = (type: 'raw-material' | 'general-supplies' | 'material-return' | 'all') => {
    const allFiltered = getFilteredForExport();
    const requests = type === 'all' ? allFiltered : allFiltered.filter(r => getRequestType(r.request_no) === type);

    if (requests.length === 0) return;

    const wb = XLSX.utils.book_new();
    const dateRangeText = dateFrom && dateTo
      ? `${format(dateFrom, 'dd-MM-yyyy')}_to_${format(dateTo, 'dd-MM-yyyy')}`
      : dateFrom ? `from_${format(dateFrom, 'dd-MM-yyyy')}` : dateTo ? `to_${format(dateTo, 'dd-MM-yyyy')}` : format(new Date(), 'yyyy-MM-dd');

    const addSheet = (sheetRequests: CloudRequest[], sheetName: string, isReturn: boolean) => {
      if (sheetRequests.length === 0) return;
      const sorted = [...sheetRequests].sort((a, b) => new Date(a.request_date).getTime() - new Date(b.request_date).getTime());

      const data = sorted.flatMap(request =>
        (request.items || []).map((item, idx) => isReturn ? {
          'Doc Number': request.request_no,
          'Order': request.order_no || '-',
          'Date': format(new Date(request.request_date), 'dd/MM/yyyy'),
          'Department': request.department || '-',
          'Returned By': request.requested_by || '-',
          'SL No': idx + 1,
          'Item Code': item.item_code || '-',
          'Description': item.description || '-',
          'UOM': item.unit || 'pcs',
          'Qty Returned': item.requested_qty,
          'Qty Received': item.issued_qty || 0,
          'Remarks': item.notes || '-',
          'Submitted At': request.submitted_at ? format(new Date(request.submitted_at), 'dd/MM/yyyy HH:mm') : '-',
        } : {
          'Doc Number': request.request_no,
          'Order': request.order_no || '-',
          'Date': format(new Date(request.request_date), 'dd/MM/yyyy'),
          'Department': request.department || '-',
          'Requested By': request.requested_by || '-',
          'SL No': idx + 1,
          'Item Code': item.item_code || '-',
          'Description': item.description || '-',
          'UOM': item.unit || 'pcs',
          'Requested Qty': item.requested_qty,
          'Issued Qty': item.issued_qty || 0,
          'Remaining Qty': item.requested_qty - (item.issued_qty || 0),
          'Remarks': item.notes || '-',
          'Submitted At': request.submitted_at ? format(new Date(request.submitted_at), 'dd/MM/yyyy HH:mm') : '-',
        })
      );

      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    if (type === 'all' || type === 'raw-material') {
      addSheet(allFiltered.filter(r => getRequestType(r.request_no) === 'raw-material'), 'Raw Material', false);
    }
    if (type === 'all' || type === 'general-supplies') {
      addSheet(allFiltered.filter(r => getRequestType(r.request_no) === 'general-supplies'), 'General Supplies', false);
    }
    if (type === 'all' || type === 'material-return') {
      addSheet(allFiltered.filter(r => getRequestType(r.request_no) === 'material-return'), 'Material Return', true);
    }

    const fileName = type === 'all'
      ? `All_Requests_${dateRangeText}.xlsx`
      : `${typeLabels[type].replace(' ', '_')}_${dateRangeText}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getExportCounts = () => {
    const filtered = getFilteredForExport();
    return {
      rawMaterial: filtered.filter(r => getRequestType(r.request_no) === 'raw-material').length,
      generalSupplies: filtered.filter(r => getRequestType(r.request_no) === 'general-supplies').length,
      materialReturn: filtered.filter(r => getRequestType(r.request_no) === 'material-return').length,
      total: filtered.length,
    };
  };

  const exportCounts = getExportCounts();

  const renderItemsTable = (request: CloudRequest) => {
    const reqType = getRequestType(request.request_no);
    const items = request.items || [];

    if (reqType === 'material-return') {
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
            {items.map((item, idx) => (
              <TableRow key={item.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{item.item_code || '-'}</TableCell>
                <TableCell>{item.description || '-'}</TableCell>
                <TableCell>{item.unit || 'pcs'}</TableCell>
                <TableCell>{item.requested_qty}</TableCell>
                <TableCell>{item.issued_qty || 0}</TableCell>
                <TableCell>{item.notes || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

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
          {items.map((item, idx) => (
            <TableRow key={item.id}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell>{item.item_code || '-'}</TableCell>
              <TableCell>{item.description || '-'}</TableCell>
              <TableCell>{item.unit || 'pcs'}</TableCell>
              <TableCell>{item.requested_qty}</TableCell>
              <TableCell>{item.issued_qty || 0}</TableCell>
              <TableCell>{item.requested_qty - (item.issued_qty || 0)}</TableCell>
              <TableCell>{item.notes || '-'}</TableCell>
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
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
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
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {cloudRequests.length === 0 ? 'No requests submitted yet' : 'No requests match your filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => {
                    const reqType = getRequestType(request.request_no);
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">{request.request_no}</TableCell>
                        <TableCell>
                          <Badge variant={typeBadgeVariant[reqType]} className="gap-1">
                            {typeIcons[reqType]}
                            {typeLabels[reqType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={request.order_no || '-'}>
                          {request.order_no || '-'}
                        </TableCell>
                        <TableCell>{format(new Date(request.request_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{request.department || '-'}</TableCell>
                        <TableCell>{request.requested_by || '-'}</TableCell>
                        <TableCell>{(request.items || []).length} items</TableCell>
                        <TableCell className="text-muted-foreground">
                          {request.submitted_at ? format(new Date(request.submitted_at), 'dd/MM/yyyy HH:mm') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(request)} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(request)} title="Download Request PDF">
                              <Download className="h-4 w-4" />
                            </Button>
                            {reqType !== 'material-return' && (
                              <Button variant="ghost" size="icon" onClick={() => handleDownloadDeliveryNote(request)} title="Download Delivery Note" className="text-primary hover:text-primary">
                                <Truck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this request?')) {
                                  deleteCloudRequest.mutate(request.id, {
                                    onSuccess: () => toast.success(`Request ${request.request_no} deleted`),
                                    onError: () => toast.error('Failed to delete request'),
                                  });
                                }
                              }}
                              title="Delete Request"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
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

          {/* Export to Excel Section */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export Records to Excel
              {(dateFrom || dateTo) && (
                <span className="text-xs text-muted-foreground ml-2">(Filtered by date range)</span>
              )}
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => exportToExcel('raw-material')} disabled={exportCounts.rawMaterial === 0} className="gap-2">
                <Package className="h-4 w-4" /> Raw Material ({exportCounts.rawMaterial})
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToExcel('general-supplies')} disabled={exportCounts.generalSupplies === 0} className="gap-2">
                <FileText className="h-4 w-4" /> General Supplies ({exportCounts.generalSupplies})
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToExcel('material-return')} disabled={exportCounts.materialReturn === 0} className="gap-2">
                <Undo2 className="h-4 w-4" /> Material Return ({exportCounts.materialReturn})
              </Button>
              <Button variant="default" size="sm" onClick={() => exportToExcel('all')} disabled={exportCounts.total === 0} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Export All ({exportCounts.total})
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Total: {filteredRequests.length} requests</span>
            <span>•</span>
            <span>Raw Material: {filteredRequests.filter(r => getRequestType(r.request_no) === 'raw-material').length}</span>
            <span>•</span>
            <span>General Supplies: {filteredRequests.filter(r => getRequestType(r.request_no) === 'general-supplies').length}</span>
            <span>•</span>
            <span>Material Return: {filteredRequests.filter(r => getRequestType(r.request_no) === 'material-return').length}</span>
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
                  <Badge variant={typeBadgeVariant[getRequestType(selectedRequest.request_no)]} className="gap-1">
                    {typeIcons[getRequestType(selectedRequest.request_no)]}
                    {typeLabels[getRequestType(selectedRequest.request_no)]}
                  </Badge>
                  <span className="font-mono">{selectedRequest.request_no}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Date:</span> {format(new Date(selectedRequest.request_date), 'dd/MM/yyyy')}</div>
                  <div><span className="text-muted-foreground">Department:</span> {selectedRequest.department || '-'}</div>
                  <div><span className="text-muted-foreground">Order:</span> <span className="font-semibold">{selectedRequest.order_no || '-'}</span></div>
                  <div><span className="text-muted-foreground">Requested By:</span> {selectedRequest.requested_by || '-'}</div>
                  {selectedRequest.notes && (
                    <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {selectedRequest.notes}</div>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  {renderItemsTable(selectedRequest)}
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => handleDownloadPDF(selectedRequest)} className="gap-2">
                    <Download className="h-4 w-4" /> Download PDF
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
