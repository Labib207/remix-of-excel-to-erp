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
import { useCloudRequests, useDeleteCloudRequest, useUpdateApprovalStatus, getRequestType, type CloudRequest, type ApprovalStatus } from '@/hooks/useCloudRequests';

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
  const updateApprovalStatus = useUpdateApprovalStatus();
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

        if (searchQuery.trim()) {
          const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
          const haystack = [
            request.request_no,
            request.department || '',
            request.requested_by || '',
            request.order_no || '',
            ...(request.items || []).flatMap(item => [item.description || '', item.item_code || '']),
          ].join(' ').toLowerCase();
          // Every typed word must appear somewhere (case-insensitive, in any order)
          if (!tokens.every(t => haystack.includes(t))) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime());
  }, [cloudRequests, searchQuery, typeFilter, dateFrom, dateTo]);

  const buildPdfArgs = (request: CloudRequest) => {
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
    return { reqType, items, form };
  };

  const handleDownloadPDF = (request: CloudRequest) => {
    const { reqType, items, form } = buildPdfArgs(request);
    if (reqType === 'raw-material') {
      exportRawMaterialRequestPDF(form, items, request.request_no);
    } else if (reqType === 'general-supplies') {
      exportGeneralSuppliesRequestPDF(form, items, request.request_no);
    } else {
      exportMaterialReturnSlipPDF(form, items, request.request_no);
    }
  };

  const handlePrintPDF = (request: CloudRequest) => {
    const { reqType, items, form } = buildPdfArgs(request);
    if (reqType === 'raw-material') {
      exportRawMaterialRequestPDF(form, items, request.request_no, 'print');
    } else if (reqType === 'general-supplies') {
      exportGeneralSuppliesRequestPDF(form, items, request.request_no, 'print');
    } else {
      exportMaterialReturnSlipPDF(form, items, request.request_no, 'print');
    }
  };

  const handleEdit = (request: CloudRequest) => {
    if (!onEdit) return;
    const reqType = getRequestType(request.request_no);
    const transformed = {
      id: request.id,
      docNumber: request.request_no,
      type: reqType,
      form: {
        date: request.request_date,
        department: request.department || '',
        orderId: request.order_id || '',
        orderName: request.order_no || '',
        requestedBy: request.requested_by || '',
        approvedBy: '',
        issuedBy: '',
        aswaqNumber: '',
      },
      items: (request.items || []).map((item, idx) => ({
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
        requirementId: (item as any).requirement_id,
      })),
    };
    onEdit(transformed);
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
      // Only include approved requests in exports (hold/not_approved are display-only)
      if ((request.approval_status || 'approved') !== 'approved') return false;
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
          'Approval': request.approval_status || 'approved',
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
          'Approval': request.approval_status || 'approved',
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
      <Card className="min-w-0">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <FileText className="h-5 w-5" />
            Request History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by doc number, department, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
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
          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2 sm:flex">
              <span className="text-sm text-muted-foreground">From:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal sm:w-[140px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-2 sm:flex">
              <span className="text-sm text-muted-foreground">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal sm:w-[140px]">
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
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} className="w-full sm:w-auto">
                Clear Dates
              </Button>
            )}
          </div>

          {/* Results Table */}
          <div className="rounded-lg border overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Doc Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Submitted / Updated</TableHead>
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
                        <TableCell>
                          <Select
                            value={(request.approval_status || 'approved') as ApprovalStatus}
                            onValueChange={(val) => {
                              updateApprovalStatus.mutate(
                                { requestId: request.id, approvalStatus: val as ApprovalStatus },
                                {
                                  onSuccess: () => toast.success(`Marked as ${val.replace('_', ' ')}`),
                                  onError: () => toast.error('Failed to update approval status'),
                                }
                              );
                            }}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="not_approved">Not Approved</SelectItem>
                              <SelectItem value="hold">Hold</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{(request.items || []).length} items</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {(() => {
                            const sub = request.submitted_at ? format(new Date(request.submitted_at), 'dd/MM/yyyy HH:mm') : '-';
                            const hasUpdate = request.updated_at && request.submitted_at &&
                              Math.abs(new Date(request.updated_at).getTime() - new Date(request.submitted_at).getTime()) > 60_000;
                            return (
                              <div className="flex flex-col leading-tight">
                                <span><span className="opacity-70">Sub:</span> {sub}</span>
                                {hasUpdate && (
                                  <span className="text-primary"><span className="opacity-70">Upd:</span> {format(new Date(request.updated_at), 'dd/MM/yyyy HH:mm')}</span>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(request)} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {onEdit && (
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(request)} title="Edit Request">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handlePrintPDF(request)} title="Print Request">
                              <Printer className="h-4 w-4" />
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
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
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
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
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
        <DialogContent className="max-h-[80vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-4xl">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <Badge variant={typeBadgeVariant[getRequestType(selectedRequest.request_no)]} className="gap-1">
                    {typeIcons[getRequestType(selectedRequest.request_no)]}
                    {typeLabels[getRequestType(selectedRequest.request_no)]}
                  </Badge>
                  <span className="font-mono">{selectedRequest.request_no}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 sm:gap-4">
                  <div><span className="text-muted-foreground">Date:</span> {format(new Date(selectedRequest.request_date), 'dd/MM/yyyy')}</div>
                  <div><span className="text-muted-foreground">Department:</span> {selectedRequest.department || '-'}</div>
                  <div><span className="text-muted-foreground">Order:</span> <span className="font-semibold">{selectedRequest.order_no || '-'}</span></div>
                  <div><span className="text-muted-foreground">Requested By:</span> {selectedRequest.requested_by || '-'}</div>
                  {selectedRequest.submitted_at && (
                    <div><span className="text-muted-foreground">Submitted:</span> {format(new Date(selectedRequest.submitted_at), 'dd/MM/yyyy HH:mm')}</div>
                  )}
                  {selectedRequest.updated_at && selectedRequest.submitted_at &&
                    Math.abs(new Date(selectedRequest.updated_at).getTime() - new Date(selectedRequest.submitted_at).getTime()) > 60_000 && (
                    <div className="text-primary"><span className="text-muted-foreground">Last Updated:</span> {format(new Date(selectedRequest.updated_at), 'dd/MM/yyyy HH:mm')}</div>
                  )}
                  {selectedRequest.notes && (
                    <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {selectedRequest.notes}</div>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  {renderItemsTable(selectedRequest)}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => handlePrintPDF(selectedRequest)} className="gap-2">
                    <Printer className="h-4 w-4" /> Print
                  </Button>
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
