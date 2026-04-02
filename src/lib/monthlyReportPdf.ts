import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// Group items by normalized description for categorization
function groupItemsByDescription(items: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const item of items) {
    const key = (item.description || 'Uncategorized').trim().toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export function generateMonthlyReportPdf(data: ReportData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ADEEM UNIFORM', pageW / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(12);
  doc.text(`Monthly Summary Report — ${data.month} ${data.year}`, pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageW / 2, y, { align: 'center' });
  y += 8;

  // Summary box
  const totalReqQty = data.requirements.reduce((s, r) => s + Number(r.required_qty || 0), 0);
  const totalRecQty = data.requirements.reduce((s, r) => s + Number(r.received_qty || 0), 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Count', 'Key Metric']],
    body: [
      ['Orders', String(data.orders.length), `Total Qty: ${data.orders.reduce((s, o) => s + Number(o.quantity || 0), 0)}`],
      ['Requirements (Trim Chart)', String(data.requirements.length), `Required: ${totalReqQty} | Received: ${totalRecQty}`],
      ['Raw Material Requests', String(data.rawMaterialRequests.length), `Items: ${data.rawMaterialItems.length}`],
      ['General Supplies Requests', String(data.generalRequests.length), `Items: ${data.generalItems.length}`],
      ['Material Return Requests', String(data.returnRequests.length), `Items: ${data.returnItems.length}`],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 65, 107], fontStyle: 'bold', fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ——— ORDERS ———
  if (data.orders.length > 0) {
    y = checkPage(doc, y, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('1. ORDERS', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Order No', 'Customer', 'Style No', 'Quantity', 'Status', 'Date']],
      body: data.orders.map((o, i) => [
        i + 1, o.order_no, o.customer, o.style_no, o.quantity, o.status, o.order_date || '',
      ]),
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: [41, 65, 107], fontStyle: 'bold', fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ——— REQUIREMENTS ———
  if (data.requirements.length > 0) {
    y = checkPage(doc, y, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('2. REQUIREMENTS (TRIM CHART)', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Item Code', 'Description', 'Color', 'Size', 'UOM', 'Required', 'Received', 'Balance']],
      body: data.requirements.map((r, i) => [
        i + 1, r.item_code, r.description || '', r.color || '', r.size || '', r.unit || 'pcs',
        r.required_qty, r.received_qty || 0,
        r.balance_qty ?? (Number(r.required_qty) - Number(r.received_qty || 0)),
      ]),
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: [41, 65, 107], fontStyle: 'bold', fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ——— REQUEST SECTIONS (with item categorization) ———
  const requestSections = [
    { title: '3. RAW MATERIAL REQUESTS', requests: data.rawMaterialRequests, items: data.rawMaterialItems },
    { title: '4. GENERAL SUPPLIES REQUESTS', requests: data.generalRequests, items: data.generalItems },
    { title: '5. MATERIAL RETURN REQUESTS', requests: data.returnRequests, items: data.returnItems },
  ];

  for (const section of requestSections) {
    if (section.requests.length > 0) {
      y = checkPage(doc, y, 30);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, 14, y);
      y += 2;

      // Request summary table
      autoTable(doc, {
        startY: y,
        head: [['#', 'Request No', 'Date', 'Department', 'Status', 'Items', 'Total Qty']],
        body: section.requests.map((r, i) => {
          const items = section.items.filter(it => it.request_id === r.id);
          const totalQty = items.reduce((s: number, it: any) => s + Number(it.requested_qty || 0), 0);
          return [i + 1, r.request_no, r.request_date, r.department || '', r.status, items.length, totalQty];
        }),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 65, 107], fontStyle: 'bold', fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      // Category-wise item breakdown
      if (section.items.length > 0) {
        const grouped = groupItemsByDescription(section.items);
        const categoryRows: any[][] = [];
        let idx = 1;
        for (const [desc, items] of Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))) {
          const totalReq = items.reduce((s, it) => s + Number(it.requested_qty || 0), 0);
          const totalIssued = items.reduce((s, it) => s + Number(it.issued_qty || 0), 0);
          const displayDesc = items[0].description || 'Uncategorized';
          const colors = [...new Set(items.map(it => it.color).filter(Boolean))].join(', ');
          const sizes = [...new Set(items.map(it => it.size).filter(Boolean))].join(', ');
          categoryRows.push([idx++, displayDesc, colors || '-', sizes || '-', items[0].unit || 'pcs', items.length, totalReq, totalIssued]);
        }

        y = checkPage(doc, y, 20);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('Item Category Breakdown:', 14, y);
        y += 2;

        autoTable(doc, {
          startY: y,
          head: [['#', 'Item Description', 'Colors', 'Sizes', 'UOM', 'Lines', 'Total Req Qty', 'Total Issued']],
          body: categoryRows,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [70, 100, 140], fontStyle: 'bold', fontSize: 7.5 },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    }
  }

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${p} of ${totalPages}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    doc.text('Adeem Uniform — Confidential', 14, doc.internal.pageSize.getHeight() - 8);
  }

  doc.save(`Monthly-Report-${data.month}-${data.year}.pdf`);
}

function checkPage(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 15) {
    doc.addPage();
    return 15;
  }
  return y;
}
