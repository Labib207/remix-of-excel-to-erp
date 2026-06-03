import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, PackageSearch, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';

interface ItemRow {
  date: string;
  requestNo: string;
  orderNo: string;
  type: string;
  itemCode: string;
  description: string;
  color: string;
  size: string;
  unit: string;
  requestedQty: number;
  issuedQty: number;
}

function getRequestType(requestNo: string) {
  if (requestNo?.startsWith('RM')) return 'Raw Material';
  if (requestNo?.startsWith('GS')) return 'General Supplies';
  if (requestNo?.startsWith('MR')) return 'Material Return';
  return 'Other';
}

function getTypeBadgeVariant(type: string) {
  if (type === 'Raw Material') return 'default';
  if (type === 'Material Return') return 'destructive';
  return 'secondary';
}

export function CustomItemReport() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ItemRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [orders, setOrders] = useState<{ id: string; order_no: string }[]>([]);

  // Load orders up front so the order dropdown is ready
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('orders').select('id, order_no').order('order_no');
      setOrders(data || []);
    })();
  }, []);

  const canSearch = search.trim().length > 0 || orderFilter !== 'all';

  const handleSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    setSearched(true);
    try {
      let itemsQuery = supabase.from('request_items').select('*');
      if (search.trim()) {
        itemsQuery = itemsQuery.ilike('description', `%${search.trim()}%`);
      }

      const { data: itemsData } = await itemsQuery;
      const items = itemsData || [];

      const requestIds = [...new Set(items.map(i => i.request_id).filter(Boolean))];

      let requestMap = new Map<string, any>();
      if (requestIds.length > 0) {
        let reqQuery = supabase
          .from('requests')
          .select('id, request_no, request_date, order_id, approval_status')
          .in('id', requestIds);
        if (orderFilter !== 'all') {
          reqQuery = reqQuery.eq('order_id', orderFilter);
        }
        const { data: requests } = await reqQuery;
        (requests || []).forEach(r => {
          if ((r.approval_status || 'approved') === 'approved') {
            requestMap.set(r.id, r);
          }
        });
      }

      const allOrderIds = [
        ...new Set(Array.from(requestMap.values()).map(r => r.order_id).filter(Boolean)),
      ];

      let ordersMap: Record<string, string> = {};
      if (allOrderIds.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, order_no')
          .in('id', allOrderIds);
        (ordersData || []).forEach(o => { ordersMap[o.id] = o.order_no; });
      }

      const rows: ItemRow[] = [];

      items.forEach(item => {
        const req = requestMap.get(item.request_id || '');
        // Drop items whose request isn't approved or isn't in the active order filter
        if (!req) return;
        const requestNo = req?.request_no || '—';
        const rowDate = req?.request_date || item.created_at?.split('T')[0] || '';
        rows.push({
          date: rowDate,
          requestNo,
          orderNo: req?.order_id ? (ordersMap[req.order_id] || '—') : '—',
          type: getRequestType(requestNo),
          itemCode: item.item_code || '—',
          description: item.description || '—',
          color: item.color || '—',
          size: item.size || '—',
          unit: item.unit || 'pcs',
          requestedQty: Number(item.requested_qty) || 0,
          issuedQty: Number(item.issued_qty) || 0,
        });
      });

      // Apply date filters client-side
      const filtered = rows.filter(r => {
        if (dateFrom && r.date < dateFrom) return false;
        if (dateTo && r.date > dateTo) return false;
        return true;
      });

      filtered.sort((a, b) => a.date.localeCompare(b.date));
      setResults(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalRequested = results.reduce((s, r) => s + r.requestedQty, 0);
  const totalIssued = results.reduce((s, r) => s + r.issuedQty, 0);

  const categoryTotals = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = { requested: 0, issued: 0 };
    acc[r.type].requested += r.requestedQty;
    acc[r.type].issued += r.issuedQty;
    return acc;
  }, {} as Record<string, { requested: number; issued: number }>);

  const selectedOrderNo = orders.find(o => o.id === orderFilter)?.order_no || '';

  const handleExportExcel = () => {
    const exportData: any[] = results.map(row => ({
      'Date': row.date ? format(new Date(row.date), 'dd/MM/yyyy') : '—',
      'Request #': row.requestNo,
      'Order #': row.orderNo,
      'Type': row.type,
      'Item Code': row.itemCode,
      'Description': row.description,
      'Color': row.color,
      'Size': row.size,
      'Unit': row.unit,
      'Requested Qty': row.requestedQty,
      'Issued Qty': row.issuedQty,
    }));

    exportData.push({
      'Date': '',
      'Request #': '',
      'Order #': '',
      'Type': 'GRAND TOTAL',
      'Item Code': '',
      'Description': '',
      'Color': '',
      'Size': '',
      'Unit': '',
      'Requested Qty': totalRequested,
      'Issued Qty': totalIssued,
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Item Report');

    const tag = search.trim()
      ? search.trim().replace(/\s+/g, '_')
      : selectedOrderNo
        ? `Order_${selectedOrderNo.replace(/\s+/g, '_')}`
        : 'All';
    const dateRange = dateFrom || dateTo ? `_${dateFrom || 'start'}_to_${dateTo || 'end'}` : '';
    XLSX.writeFile(wb, `Item_Report_${tag}${dateRange}.xlsx`);
  };

  return (
    <Card className="shadow-card border-primary/20">
      <CardContent className="py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <PackageSearch className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Custom Item Report</p>
            <p className="text-xs text-muted-foreground">Search by item or order to see only requested quantities</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search item description (e.g. Zipper, Fabric, Button)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="max-w-md"
            />
            <Button onClick={handleSearch} disabled={loading || !canSearch} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
              Search
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From Date (optional)</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To Date (optional)</label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Order</label>
              <Select value={orderFilter} onValueChange={setOrderFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="All Orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  {orders.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.order_no}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || orderFilter === 'all'}
              variant="secondary"
              size="sm"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
              Find by Order
            </Button>
          </div>
        </div>

        {searched && results.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No requested items found{search.trim() ? ` for "${search}"` : selectedOrderNo ? ` for order ${selectedOrderNo}` : ''}.
          </p>
        )}

        {results.length > 0 && (
          <>
            <div className="flex justify-end">
              <Button onClick={handleExportExcel} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export Excel
              </Button>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Request #</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Requested</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{row.date ? format(new Date(row.date), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{row.requestNo}</TableCell>
                      <TableCell className="font-mono text-xs">{row.orderNo}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(row.type)} className="text-[10px]">
                          {row.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.itemCode}</TableCell>
                      <TableCell className="text-xs">{row.description}</TableCell>
                      <TableCell className="text-xs">{row.color}</TableCell>
                      <TableCell className="text-xs">{row.size}</TableCell>
                      <TableCell className="text-xs">{row.unit}</TableCell>
                      <TableCell className="text-right font-mono">{row.requestedQty}</TableCell>
                      <TableCell className="text-right font-mono">{row.issuedQty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(categoryTotals).map(([type, totals]) => (
                <div key={type} className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground">{type}</p>
                  <p className="text-sm">Requested: <span className="font-mono font-bold">{parseFloat(totals.requested.toFixed(4))}</span></p>
                  <p className="text-sm">Issued: <span className="font-mono font-bold">{parseFloat(totals.issued.toFixed(4))}</span></p>
                </div>
              ))}
              <div className="rounded-lg border p-3 bg-primary/5 border-primary/20">
                <p className="text-xs font-medium text-primary">Grand Total</p>
                <p className="text-sm">Requested: <span className="font-mono font-bold">{parseFloat(totalRequested.toFixed(4))}</span></p>
                <p className="text-sm">Issued: <span className="font-mono font-bold">{parseFloat(totalIssued.toFixed(4))}</span></p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
