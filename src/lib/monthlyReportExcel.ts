import * as XLSX from 'xlsx';

interface ReportData {
  month: string;
  year: number;
  orders: any[];
  requirements: any[];
  rawMaterialRequests: any[];
  generalRequests: any[];
  returnRequests: any[];
  rawMaterialItems: any[];
  generalItems: any[];
  returnItems: any[];
}

function groupItemsByDescription(items: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const item of items) {
    const key = (item.description || 'Uncategorized').trim().toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

export function generateMonthlyReportExcel(data: ReportData) {
  const wb = XLSX.utils.book_new();

  // ——— 1. SUMMARY SHEET ———
  const summaryRows = [
    ['ADEEM UNIFORM'],
    [`Monthly Summary Report — ${data.month} ${data.year}`],
    [`Generated: ${new Date().toLocaleDateString()}`],
    [],
    ['Category', 'Count', 'Key Metric'],
    ['Orders', data.orders.length, `Total Qty: ${data.orders.reduce((s, o) => s + Number(o.quantity || 0), 0)}`],
    ['Requirements (Trim Chart)', data.requirements.length, `Required: ${data.requirements.reduce((s, r) => s + Number(r.required_qty || 0), 0)} | Received: ${data.requirements.reduce((s, r) => s + Number(r.received_qty || 0), 0)}`],
    ['Raw Material Requests', data.rawMaterialRequests.length, `Items: ${data.rawMaterialItems.length}`],
    ['General Supplies Requests', data.generalRequests.length, `Items: ${data.generalItems.length}`],
    ['Material Return Requests', data.returnRequests.length, `Items: ${data.returnItems.length}`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  setColumnWidths(wsSummary, [30, 12, 40]);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // ——— 2. ORDERS SHEET ———
  if (data.orders.length > 0) {
    const orderRows = [
      ['#', 'Order No', 'Customer', 'Style No', 'Quantity', 'Status', 'Date'],
      ...data.orders.map((o, i) => [
        i + 1, o.order_no, o.customer, o.style_no, o.quantity, o.status, o.order_date || '',
      ]),
    ];
    const wsOrders = XLSX.utils.aoa_to_sheet(orderRows);
    setColumnWidths(wsOrders, [5, 15, 20, 15, 12, 12, 12]);
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');
  }

  // ——— 3. REQUIREMENTS SHEET ———
  if (data.requirements.length > 0) {
    const reqRows = [
      ['#', 'Item Code', 'Description', 'Color', 'Size', 'UOM', 'Required', 'Received', 'Balance'],
      ...data.requirements.map((r, i) => [
        i + 1, r.item_code, r.description || '', r.color || '', r.size || '', r.unit || 'pcs',
        Number(r.required_qty), Number(r.received_qty || 0),
        r.balance_qty != null ? Number(r.balance_qty) : Number(r.required_qty) - Number(r.received_qty || 0),
      ]),
    ];
    const wsReq = XLSX.utils.aoa_to_sheet(reqRows);
    setColumnWidths(wsReq, [5, 12, 25, 12, 10, 8, 12, 12, 12]);
    XLSX.utils.book_append_sheet(wb, wsReq, 'Requirements');
  }

  // ——— 4-6. REQUEST SECTIONS with item categorization ———
  const requestSections = [
    { sheetName: 'Raw Material', requests: data.rawMaterialRequests, items: data.rawMaterialItems },
    { sheetName: 'General Supplies', requests: data.generalRequests, items: data.generalItems },
    { sheetName: 'Material Return', requests: data.returnRequests, items: data.returnItems },
  ];

  for (const section of requestSections) {
    if (section.requests.length === 0) continue;

    const rows: any[][] = [];

    // Request summary
    rows.push(['REQUEST SUMMARY']);
    rows.push(['#', 'Request No', 'Date', 'Department', 'Status', 'Items', 'Total Qty']);
    for (let i = 0; i < section.requests.length; i++) {
      const r = section.requests[i];
      const items = section.items.filter(it => it.request_id === r.id);
      const totalQty = items.reduce((s: number, it: any) => s + Number(it.requested_qty || 0), 0);
      rows.push([i + 1, r.request_no, r.request_date, r.department || '', r.status, items.length, totalQty]);
    }

    rows.push([]);
    rows.push(['ITEM CATEGORY BREAKDOWN']);
    rows.push(['#', 'Item Description', 'Colors', 'Sizes', 'UOM', 'Lines', 'Total Req Qty', 'Total Issued']);

    const grouped = groupItemsByDescription(section.items);
    let idx = 1;
    for (const [, items] of Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))) {
      const totalReq = items.reduce((s, it) => s + Number(it.requested_qty || 0), 0);
      const totalIssued = items.reduce((s, it) => s + Number(it.issued_qty || 0), 0);
      const displayDesc = items[0].description || 'Uncategorized';
      const colors = [...new Set(items.map(it => it.color).filter(Boolean))].join(', ');
      const sizes = [...new Set(items.map(it => it.size).filter(Boolean))].join(', ');
      rows.push([idx++, displayDesc, colors || '-', sizes || '-', items[0].unit || 'pcs', items.length, totalReq, totalIssued]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    setColumnWidths(ws, [5, 25, 15, 12, 8, 8, 14, 14]);
    XLSX.utils.book_append_sheet(wb, ws, section.sheetName);
  }

  XLSX.writeFile(wb, `Monthly-Report-${data.month}-${data.year}.xlsx`);
}
