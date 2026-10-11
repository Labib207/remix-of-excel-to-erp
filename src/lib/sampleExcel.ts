import * as XLSX from 'xlsx';
import type { Sample, CustomerOrder } from '@/hooks/useCustomerSamples';
import { typeLabel, statusLabel, actionLabel } from '@/lib/sampleRules';

const d = (v?: string | null) => (v ? new Date(`${v.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US') : '');

export function exportSamplesExcel(samples: Sample[], orders: CustomerOrder[]) {
  const orderById = new Map(orders.map(o => [o.id, o]));
  const header = ['Sample ID', 'Type', 'Style', 'Customer', 'Order', 'Size', 'Color', 'Qty', 'Status', 'Location',
    'Date Made', 'Keep Until', 'Final Action', 'Golden', 'Description', 'Remarks'];
  const rows = samples.map(s => {
    const o = s.order_id ? orderById.get(s.order_id) : undefined;
    return [s.ref_no, typeLabel(s.sample_type), s.style_name, o?.customer_name ?? '', o?.order_no ?? '', s.size ?? '', s.color ?? '',
      Number(s.total_qty), statusLabel(s.status), s.location ?? '', d(s.made_date), d(s.keep_until), actionLabel(s.final_action),
      s.golden ? 'Yes' : 'No', s.description ?? '', s.remarks ?? ''];
  });
  const ws = XLSX.utils.aoa_to_sheet([['GHOUSH - Stock Management'], ['Sample Store List'], [], header, ...rows]);
  ws['!cols'] = [16, 22, 22, 20, 16, 8, 10, 6, 16, 14, 12, 12, 12, 8, 28, 28].map(wch => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Samples');
  XLSX.writeFile(wb, `sample-list-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
