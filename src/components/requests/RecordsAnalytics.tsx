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
import { 
  Search, 
  Download, 
  FileText, 
  Package, 
  Undo2, 
  Eye, 
  CalendarIcon,
  BarChart3,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  Upload,
  ExternalLink,
  Trash2,
  CheckCheck
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useRequestStore } from '@/store/requestStore';
import { useDbOrders } from '@/hooks/useDbOrders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  exportRawMaterialRequestPDF,
  exportGeneralSuppliesRequestPDF,
  exportMaterialReturnSlipPDF,
} from '@/lib/requestPdfExport';
import * as XLSX from 'xlsx';

interface RequestItem {
  id: string;
  slNo: number;
  itemCode: string;
  description: string;
  uom: string;
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

// Extended form type that may include orderId from runtime
interface RequestFormExtended {
  date: string;
  department: string;
  orderId?: string;
  orderName?: string;
  requestedBy: string;
  approvedBy: string;
  issuedBy: string;
  aswaqNumber: string;
}

interface SubmittedRequestExtended {
  id: string;
  type: 'raw-material' | 'general-supplies' | 'material-return';
  docNumber: string;
  form: RequestFormExtended;
  items: (RequestItem | ReturnItem)[];
  submittedAt: string;
  isExternal?: boolean;
  approvalStatus?: 'pending' | 'approved';
  trNumber?: string;
  approvedAt?: string;
}

const typeLabels: Record<string, string> = {
  'raw-material': 'Raw Material',
  'general-supplies': 'General Supplies',
  'material-return': 'Material Return',
};

const typeBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  'raw-material': 'default',
  'general-supplies': 'secondary',
  'material-return': 'outline',
};

// Material type categories based on item code prefixes
const materialCategories: Record<string, string[]> = {
  'Fabric': ['FAB', 'SHE', 'LIN', 'FUS'],
  'Thread': ['THR'],
  'Buttons': ['BTN'],
  'Zippers': ['ZIP'],
  'Velcro': ['VEL'],
  'Elastic': ['ELA'],
  'Labels': ['LBL'],
  'Accessories': ['TAB', 'WEB', 'BKL', 'CRD', 'STP', 'PAD', 'RIV'],
};

const getMaterialCategory = (itemCode: string): string => {
  const prefix = itemCode.split('-')[0]?.toUpperCase() || '';
  for (const [category, prefixes] of Object.entries(materialCategories)) {
    if (prefixes.includes(prefix)) {
      return category;
    }
  }
  return 'Other';
};

export function RecordsAnalytics() {
  const { submittedRequests, addExternalRequest, deleteRequest, approveRequest } = useRequestStore();
  const { data: orders = [] } = useDbOrders();
  
  // Cast requests to extended type (orderId is added at runtime in Requests.tsx)
  const extendedRequests = submittedRequests as unknown as SubmittedRequestExtended[];
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [selectedRequest, setSelectedRequest] = useState<SubmittedRequestExtended | null>(null);
  const [approveTarget, setApproveTarget] = useState<SubmittedRequestExtended | null>(null);
  const [trInput, setTrInput] = useState('');
  const [trError, setTrError] = useState('');


  // Handle Excel import
  const handleExcelImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Try to read from first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          alert('No data found in Excel file');
          return;
        }

        // Group rows by Doc Number to create requests
        const groupedByDoc: Record<string, any[]> = {};
        jsonData.forEach((row: any) => {
          const docNumber = row['Doc Number'] || row['Order'] || `EXT-${Date.now()}`;
          if (!groupedByDoc[docNumber]) {
            groupedByDoc[docNumber] = [];
          }
          groupedByDoc[docNumber].push(row);
        });

        let importedCount = 0;
        Object.entries(groupedByDoc).forEach(([docNumber, rows]) => {
          const firstRow = rows[0];
          
          // Parse date from various formats
          let dateStr = firstRow['Date'] || new Date().toISOString();
          if (typeof dateStr === 'string' && dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              // Assume DD/MM/YYYY format
              dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }

          const items: RequestItem[] = rows.map((row, index) => ({
            id: Math.random().toString(36).substr(2, 9),
            slNo: row['SL No'] || row['SL'] || index + 1,
            itemCode: row['Item Code'] || '',
            description: row['Description'] || '',
            uom: row['UOM'] || 'PCS',
            requestedQty: parseFloat(row['Requested Qty'] || row['Req Qty'] || 0) || 0,
            issuedQty: parseFloat(row['Issued Qty'] || row['Issued'] || 0) || 0,
            remainingQty: parseFloat(row['Remaining Qty'] || row['Remaining'] || 0) || 0,
            remarks: row['Remarks'] || '',
          }));

          addExternalRequest({
            type: 'raw-material',
            docNumber: `${docNumber}`,
            form: {
              date: dateStr,
              department: firstRow['Department'] || '',
              orderId: firstRow['Order ID'] || undefined,
              orderName: firstRow['Order'] || firstRow['Customer'] || undefined,
              requestedBy: firstRow['Requested By'] || '',
              approvedBy: firstRow['Approved By'] || '',
              issuedBy: firstRow['Issued By'] || '',
              aswaqNumber: firstRow['ASWAQ Number'] || '',
            },
            items,
          });
          importedCount++;
        });

        alert(`Successfully imported ${importedCount} record(s) from Excel`);
        
        // Reset file input
        event.target.value = '';
      } catch (error) {
        console.error('Error importing Excel:', error);
        alert('Failed to import Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Get unique order IDs from submitted requests
  const orderOptions = useMemo(() => {
    const orderIds = new Set<string>();
    extendedRequests.forEach(req => {
      if (req.form.orderId) {
        orderIds.add(req.form.orderId);
      }
    });
    return Array.from(orderIds).map(id => {
      const order = orders.find(o => o.id === id);
      return {
        id,
        label: order ? `${order.orderNumber} - ${order.customer}` : id
      };
    });
  }, [extendedRequests, orders]);

  // Filter raw material requests only
  const rawMaterialRequests = useMemo(() => {
    return extendedRequests.filter(r => r.type === 'raw-material');
  }, [extendedRequests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return rawMaterialRequests
      .filter((request) => {
        // Order filter
        if (orderFilter !== 'all' && request.form.orderId !== orderFilter) {
          return false;
        }

        // Source filter (internal vs external)
        if (sourceFilter !== 'all') {
          if (sourceFilter === 'external' && !request.isExternal) return false;
          if (sourceFilter === 'internal' && request.isExternal) return false;
        }

        // Material type filter
        if (materialTypeFilter !== 'all') {
          const hasMatchingMaterial = (request.items as RequestItem[]).some(item => 
            getMaterialCategory(item.itemCode) === materialTypeFilter
          );
          if (!hasMatchingMaterial) return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
          const items = request.items as RequestItem[];
          const totalRequested = items.reduce((sum, i) => sum + i.requestedQty, 0);
          const totalIssued = items.reduce((sum, i) => sum + i.issuedQty, 0);
          const isComplete = totalIssued >= totalRequested && totalRequested > 0;
          const isPending = totalIssued === 0;
          const isPartial = totalIssued > 0 && totalIssued < totalRequested;

          if (statusFilter === 'completed' && !isComplete) return false;
          if (statusFilter === 'pending' && !isPending) return false;
          if (statusFilter === 'partial' && !isPartial) return false;
        }

        // Approval filter (Pending / Approved)
        if (approvalFilter !== 'all') {
          const isApproved = request.approvalStatus === 'approved';
          if (approvalFilter === 'approved' && !isApproved) return false;
          if (approvalFilter === 'pending' && isApproved) return false;
        }



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
          const matchesItems = request.items.some(
            (item) =>
              item.itemCode.toLowerCase().includes(query) ||
              item.description.toLowerCase().includes(query)
          );
          // Match order
          const order = orders.find(o => o.id === request.form.orderId);
          const matchesOrder = order ? 
            order.orderNumber.toLowerCase().includes(query) ||
            order.customer.toLowerCase().includes(query) : false;
          
          return matchesDocNumber || matchesDepartment || matchesItems || matchesOrder;
        }

        return true;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [rawMaterialRequests, searchQuery, orderFilter, materialTypeFilter, statusFilter, approvalFilter, sourceFilter, dateFrom, dateTo, orders]);

  // Calculate analytics
  const analytics = useMemo(() => {
    let totalRequested = 0;
    let totalIssued = 0;
    let fabricConsumption = 0; // in meters
    let completedRequests = 0;
    let pendingRequests = 0;
    let partialRequests = 0;

    filteredRequests.forEach(request => {
      const items = request.items as RequestItem[];
      const reqTotal = items.reduce((sum, i) => sum + i.requestedQty, 0);
      const issTotal = items.reduce((sum, i) => sum + i.issuedQty, 0);
      
      totalRequested += reqTotal;
      totalIssued += issTotal;

      // Count fabric consumption (items with MTR/YRD UOM)
      items.forEach(item => {
        if (item.uom.toUpperCase() === 'MTR' || item.uom.toUpperCase() === 'METER' || item.uom.toUpperCase() === 'M') {
          fabricConsumption += item.issuedQty || item.requestedQty;
        } else if (item.uom.toUpperCase() === 'YRD' || item.uom.toUpperCase() === 'YARD') {
          // Convert yards to meters
          fabricConsumption += (item.issuedQty || item.requestedQty) * 0.9144;
        }
      });

      // Status counts
      if (issTotal >= reqTotal && reqTotal > 0) {
        completedRequests++;
      } else if (issTotal === 0) {
        pendingRequests++;
      } else {
        partialRequests++;
      }
    });

    return {
      totalRequested,
      totalIssued,
      fabricConsumption: Math.round(fabricConsumption * 100) / 100,
      completedRequests,
      pendingRequests,
      partialRequests,
      totalRequests: filteredRequests.length,
      fulfillmentRate: totalRequested > 0 ? Math.round((totalIssued / totalRequested) * 100) : 0,
    };
  }, [filteredRequests]);

  const handleDownloadPDF = (request: SubmittedRequestExtended) => {
    exportRawMaterialRequestPDF(request.form as any, request.items as RequestItem[], request.docNumber);
  };

  const exportToExcel = () => {
    if (filteredRequests.length === 0) return;

    const wb = XLSX.utils.book_new();
    const dateRangeText = dateFrom && dateTo 
      ? `${format(dateFrom, 'dd-MM-yyyy')}_to_${format(dateTo, 'dd-MM-yyyy')}`
      : format(new Date(), 'yyyy-MM-dd');
    
    const data = filteredRequests.flatMap(request => {
      const order = orders.find(o => o.id === request.form.orderId);
      return (request.items as RequestItem[]).map(item => ({
        'Doc Number': request.docNumber,
        'Order': order ? order.orderNumber : '-',
        'Customer': order ? order.customer : '-',
        'Date': format(new Date(request.form.date), 'dd/MM/yyyy'),
        'Department': request.form.department,
        'Item Code': item.itemCode,
        'Description': item.description,
        'Material Type': getMaterialCategory(item.itemCode),
        'UOM': item.uom,
        'Requested Qty': item.requestedQty,
        'Issued Qty': item.issuedQty,
        'Remaining Qty': item.remainingQty,
        'Status': item.issuedQty >= item.requestedQty ? 'Completed' : item.issuedQty > 0 ? 'Partial' : 'Pending',
        'Remarks': item.remarks,
        'Submitted At': format(new Date(request.submittedAt), 'dd/MM/yyyy HH:mm'),
      }));
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
      { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Raw Material Records');

    // Add summary sheet
    const summaryData = [
      { 'Metric': 'Total Requests', 'Value': analytics.totalRequests },
      { 'Metric': 'Total Requested Qty', 'Value': analytics.totalRequested },
      { 'Metric': 'Total Issued Qty', 'Value': analytics.totalIssued },
      { 'Metric': 'Fulfillment Rate', 'Value': `${analytics.fulfillmentRate}%` },
      { 'Metric': 'Fabric Consumption (MTR)', 'Value': analytics.fabricConsumption },
      { 'Metric': 'Completed Requests', 'Value': analytics.completedRequests },
      { 'Metric': 'Pending Requests', 'Value': analytics.pendingRequests },
      { 'Metric': 'Partial Requests', 'Value': analytics.partialRequests },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    XLSX.writeFile(wb, `Raw_Material_Records_${dateRangeText}.xlsx`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setOrderFilter('all');
    setMaterialTypeFilter('all');
    setStatusFilter('all');
    setApprovalFilter('all');
    setSourceFilter('all');
    setDateFrom(startOfMonth(new Date()));
    setDateTo(endOfMonth(new Date()));
  };

  const handleDeleteRequest = (request: SubmittedRequestExtended) => {
    if (confirm(`Are you sure you want to delete record "${request.docNumber}"?`)) {
      deleteRequest(request.id);
    }
  };

  const renderItemsTable = (request: SubmittedRequestExtended) => {
    const items = request.items as RequestItem[];
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SL</TableHead>
            <TableHead>Item Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead>Req Qty</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isComplete = item.issuedQty >= item.requestedQty && item.requestedQty > 0;
            const isPartial = item.issuedQty > 0 && item.issuedQty < item.requestedQty;
            return (
              <TableRow key={item.id}>
                <TableCell>{item.slNo}</TableCell>
                <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {getMaterialCategory(item.itemCode)}
                  </Badge>
                </TableCell>
                <TableCell>{item.uom}</TableCell>
                <TableCell>{item.requestedQty}</TableCell>
                <TableCell>{item.issuedQty}</TableCell>
                <TableCell>{item.remainingQty}</TableCell>
                <TableCell>
                  <Badge variant={isComplete ? 'default' : isPartial ? 'secondary' : 'outline'}>
                    {isComplete ? 'Complete' : isPartial ? 'Partial' : 'Pending'}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{analytics.totalRequests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <TrendingUp className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Qty Requested</p>
                  <p className="text-2xl font-bold">{analytics.totalRequested.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Issued: {analytics.totalIssued.toLocaleString()} ({analytics.fulfillmentRate}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent rounded-lg">
                  <Package className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fabric Consumption</p>
                  <p className="text-2xl font-bold">{analytics.fabricConsumption.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Meters</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex gap-2 text-sm">
                    <span className="text-primary">{analytics.completedRequests} Done</span>
                    <span className="text-muted-foreground">{analytics.partialRequests} Partial</span>
                    <span className="text-muted-foreground">{analytics.pendingRequests} Pending</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter Raw Material Records
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by doc number, order, item code, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-3">
              <Select value={orderFilter} onValueChange={setOrderFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="All Orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  {orderOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={materialTypeFilter} onValueChange={setMaterialTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Material Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.keys(materialCategories).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Approval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Approvals</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved (TR)</SelectItem>
                </SelectContent>
              </Select>



              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[130px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[130px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'dd/MM/yy') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>

              <div className="ml-auto">
                <Button onClick={exportToExcel} variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Records ({filteredRequests.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleExcelImport}
                  />
                </label>
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doc #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        No records found matching your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => {
                      const items = request.items as RequestItem[];
                      const totalReq = items.reduce((sum, i) => sum + i.requestedQty, 0);
                      const totalIss = items.reduce((sum, i) => sum + i.issuedQty, 0);
                      const isComplete = totalIss >= totalReq && totalReq > 0;
                      const isPartial = totalIss > 0 && totalIss < totalReq;
                      const order = orders.find(o => o.id === request.form.orderId);

                      const isApproved = request.approvalStatus === 'approved';

                      return (
                        <TableRow
                          key={request.id}
                          className={
                            !isApproved
                              ? 'bg-destructive/5 hover:bg-destructive/10'
                              : request.isExternal ? 'bg-accent/50' : ''
                          }
                        >
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              {request.docNumber}
                              {request.isExternal && (
                                <Badge variant="secondary" className="text-xs">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  External
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{format(new Date(request.form.date), 'dd/MM/yy')}</TableCell>
                          <TableCell>
                            {order ? (
                              <span className="text-sm">{order.orderNumber}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{request.form.department || '-'}</TableCell>
                          <TableCell>{items.length}</TableCell>
                          <TableCell>{totalReq}</TableCell>
                          <TableCell>{totalIss}</TableCell>
                          <TableCell>
                            <Badge variant={isComplete ? 'default' : isPartial ? 'secondary' : 'outline'}>
                              {isComplete ? 'Complete' : isPartial ? 'Partial' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
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
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {request.isExternal && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteRequest(request)}
                                  title="Delete External Record"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
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
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedRequest.docNumber} - Raw Material Request
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-medium">{format(new Date(selectedRequest.form.date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Department:</span>
                    <p className="font-medium">{selectedRequest.form.department || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requested By:</span>
                    <p className="font-medium">{selectedRequest.form.requestedBy || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>
                    <p className="font-medium">{format(new Date(selectedRequest.submittedAt), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  {renderItemsTable(selectedRequest)}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => handleDownloadPDF(selectedRequest)}>
                    <Download className="h-4 w-4 mr-2" />
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
