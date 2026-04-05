import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, PackageSearch } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ItemRow {
  date: string;
  requestNo: string;
  orderNo: string;
  type: string;
  color: string;
  size: string;
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

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      // Fetch matching request_items
      const { data: items, error: itemsErr } = await supabase
        .from('request_items')
        .select('*')
        .ilike('description', `%${search.trim()}%`);

      if (itemsErr) throw itemsErr;
      if (!items || items.length === 0) {
        setResults([]);
        return;
      }

      // Get unique request_ids
      const requestIds = [...new Set(items.map(i => i.request_id).filter(Boolean))];
      
      // Fetch requests
      const { data: requests } = await supabase
        .from('requests')
        .select('id, request_no, request_date, order_id')
        .in('id', requestIds);

      // Fetch orders for order numbers
      const orderIds = [...new Set((requests || []).map(r => r.order_id).filter(Boolean))];
      let ordersMap: Record<string, string> = {};
      if (orderIds.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, order_no')
          .in('id', orderIds);
        (orders || []).forEach(o => { ordersMap[o.id] = o.order_no; });
      }

      const requestMap = new Map((requests || []).map(r => [r.id, r]));

      const rows: ItemRow[] = items.map(item => {
        const req = requestMap.get(item.request_id || '');
        const requestNo = req?.request_no || '—';
        return {
          date: req?.request_date || item.created_at?.split('T')[0] || '',
          requestNo,
          orderNo: req?.order_id ? (ordersMap[req.order_id] || '—') : '—',
          type: getRequestType(requestNo),
          color: item.color || '—',
          size: item.size || '—',
          requestedQty: Number(item.requested_qty) || 0,
          issuedQty: Number(item.issued_qty) || 0,
        };
      });

      // Sort by date
      rows.sort((a, b) => a.date.localeCompare(b.date));
      setResults(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalRequested = results.reduce((s, r) => s + r.requestedQty, 0);
  const totalIssued = results.reduce((s, r) => s + r.issuedQty, 0);

  // Category totals
  const categoryTotals = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = { requested: 0, issued: 0 };
    acc[r.type].requested += r.requestedQty;
    acc[r.type].issued += r.issuedQty;
    return acc;
  }, {} as Record<string, { requested: number; issued: number }>);

  return (
    <Card className="shadow-card border-primary/20">
      <CardContent className="py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <PackageSearch className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Custom Item Report</p>
            <p className="text-xs text-muted-foreground">Search any item to see all request & issue history</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Search item description (e.g. Zipper, Button)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="max-w-md"
          />
          <Button onClick={handleSearch} disabled={loading || !search.trim()} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
            Search
          </Button>
        </div>

        {searched && results.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground py-4 text-center">No records found for "{search}"</p>
        )}

        {results.length > 0 && (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Request #</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Size</TableHead>
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
                      <TableCell className="text-xs">{row.color}</TableCell>
                      <TableCell className="text-xs">{row.size}</TableCell>
                      <TableCell className="text-right font-mono">{row.requestedQty}</TableCell>
                      <TableCell className="text-right font-mono">{row.issuedQty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(categoryTotals).map(([type, totals]) => (
                <div key={type} className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground">{type}</p>
                  <p className="text-sm">Requested: <span className="font-mono font-bold">{totals.requested}</span></p>
                  <p className="text-sm">Issued: <span className="font-mono font-bold">{totals.issued}</span></p>
                </div>
              ))}
              <div className="rounded-lg border p-3 bg-primary/5 border-primary/20">
                <p className="text-xs font-medium text-primary">Grand Total</p>
                <p className="text-sm">Requested: <span className="font-mono font-bold">{totalRequested}</span></p>
                <p className="text-sm">Issued: <span className="font-mono font-bold">{totalIssued}</span></p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
