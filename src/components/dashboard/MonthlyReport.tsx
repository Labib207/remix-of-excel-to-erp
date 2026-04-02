import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileDown, FileSpreadsheet, Calendar, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateMonthlyReportExcel } from '@/lib/monthlyReportExcel';
import { generateMonthlyReportPdf } from '@/lib/monthlyReportPdf';
import { toast } from 'sonner';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

async function fetchMonthData(m: number, y: number) {
  const startDate = new Date(y, m, 1).toISOString();
  const endDate = new Date(y, m + 1, 1).toISOString();

  const [ordersRes, requirementsRes, requestsRes, requestItemsRes] =
    await Promise.all([
      supabase.from('orders').select('*').gte('created_at', startDate).lt('created_at', endDate),
      supabase.from('requirements').select('*').gte('created_at', startDate).lt('created_at', endDate),
      supabase.from('requests').select('*').gte('created_at', startDate).lt('created_at', endDate),
      supabase.from('request_items').select('*').gte('created_at', startDate).lt('created_at', endDate),
    ]);

  const orders = ordersRes.data || [];
  const requirements = requirementsRes.data || [];
  const requests = requestsRes.data || [];
  const requestItems = requestItemsRes.data || [];

  const rawMaterialRequests = requests.filter(r => r.request_no?.startsWith('RM'));
  const generalRequests = requests.filter(r => r.request_no?.startsWith('GS'));
  const returnRequests = requests.filter(r => r.request_no?.startsWith('MR'));

  const getItemsForRequests = (reqs: any[]) => {
    const ids = new Set(reqs.map(r => r.id));
    return requestItems.filter(i => ids.has(i.request_id));
  };

  return {
    month: MONTHS[m],
    year: y,
    orders,
    requirements,
    rawMaterialRequests,
    generalRequests,
    returnRequests,
    rawMaterialItems: getItemsForRequests(rawMaterialRequests),
    generalItems: getItemsForRequests(generalRequests),
    returnItems: getItemsForRequests(returnRequests),
  };
}

export const MonthlyReport = () => {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth()));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState<'excel' | 'pdf' | null>(null);

  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  const handleGenerate = async (format: 'excel' | 'pdf') => {
    setLoading(format);
    try {
      const m = parseInt(month);
      const y = parseInt(year);
      const reportData = await fetchMonthData(m, y);

      if (format === 'excel') {
        generateMonthlyReportExcel(reportData);
      } else {
        generateMonthlyReportPdf(reportData);
      }

      toast.success(`${MONTHS[m]} ${y} ${format === 'excel' ? 'Excel' : 'PDF'} report downloaded`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate report: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="shadow-card border-primary/20">
      <CardContent className="py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Monthly Summary Report</p>
              <p className="text-xs text-muted-foreground">Generate category-wise Excel or PDF report</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => handleGenerate('excel')} disabled={!!loading} size="sm">
              {loading === 'excel' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />}
              Excel
            </Button>
            <Button onClick={() => handleGenerate('pdf')} disabled={!!loading} size="sm" variant="outline">
              {loading === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileDown className="h-4 w-4 mr-1" />}
              PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
