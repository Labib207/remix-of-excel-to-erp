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
import { Search, Download, FileText, Package, Undo2, Eye } from 'lucide-react';
import { format } from 'date-fns';
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
} from '@/lib/requestPdfExport';

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

interface RequestForm {
  date: string;
  department: string;
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
  const [selectedRequest, setSelectedRequest] = useState<SubmittedRequest | null>(null);

  const filteredRequests = useMemo(() => {
    return submittedRequests
      .filter((request) => {
        // Type filter
        if (typeFilter !== 'all' && request.type !== typeFilter) {
          return false;
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
  }, [submittedRequests, searchQuery, typeFilter]);

  const handleDownloadPDF = (request: SubmittedRequest) => {
    if (request.type === 'raw-material') {
      exportRawMaterialRequestPDF(request.form, request.items as RequestItem[], request.docNumber);
    } else if (request.type === 'general-supplies') {
      exportGeneralSuppliesRequestPDF(request.form, request.items as RequestItem[], request.docNumber);
    } else {
      exportMaterialReturnSlipPDF(request.form, request.items as ReturnItem[], request.docNumber);
    }
  };

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
          <div className="flex gap-4">
            <div className="relative flex-1">
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
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
