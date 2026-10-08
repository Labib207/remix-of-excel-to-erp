import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '@/assets/logo.png';
import {
  CustomerOrder, Sample, SampleDispatch, ORDER_STAGES, stageHistory, formatDuration, fmtDate, fmtDateTime,
} from '@/hooks/useCustomerSamples';

const loadLogo = () => new Promise<string | null>((resolve) => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    if (!ctx) return resolve(null);
    ctx.drawImage(img, 0, 0);
    resolve(c.toDataURL('image/png'));
  };
  img.onerror = () => resolve(null);
  img.src = logoImage;
});

type Doc = jsPDF & { lastAutoTable?: { finalY: number } };

async function frame(title: string, orientation: 'portrait' | 'landscape' = 'portrait') {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' }) as Doc;
  const logo = await loadLogo();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(40); doc.setLineWidth(0.35);
  doc.rect(14, 12, w - 28, h - 24);
  if (logo) doc.addImage(logo, 'PNG', 19, 17, 35, 17);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('GHOUSH - Stock Management', w / 2, 22, { align: 'center' });
  doc.setFontSize(13); doc.text(title, w / 2, 31, { align: 'center' });
  doc.setLineWidth(0.2); doc.line(14, 39, w - 14, 39);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  return { doc, w, h };
}

const tableStyle = {
  theme: 'grid' as const,
  styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, lineColor: [80, 80, 80] as [number, number, number], lineWidth: 0.15, textColor: [20, 20, 20] as [number, number, number] },
  headStyles: { fillColor: [45, 55, 65] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const },
};

function signatures(doc: Doc, w: number, h: number, left: string, right: string, leftName = '', rightName = '') {
  const y = h - 30;
  doc.line(26, y, 86, y); doc.line(w - 86, y, w - 26, y);
  doc.setFont('helvetica', 'bold');
  doc.text(left, 56, y + 6, { align: 'center' });
  doc.text(right, w - 56, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(leftName, 56, y - 3, { align: 'center' });
  doc.text(rightName, w - 56, y - 3, { align: 'center' });
}

function output(doc: jsPDF, name: string, mode: 'download' | 'print') {
  if (mode === 'download') { doc.save(`${name.replace(/[^a-z0-9-_]+/gi, '-')}.pdf`); return; }
  doc.autoPrint();
  const url = doc.output('bloburl') as unknown as string;
  const f = document.createElement('iframe');
  Object.assign(f.style, { position: 'fixed', width: '0', height: '0', border: '0' });
  f.src = url;
  f.onload = () => setTimeout(() => f.contentWindow?.print(), 250);
  document.body.appendChild(f);
  setTimeout(() => { f.remove(); URL.revokeObjectURL(url); }, 60_000);
}

export async function customerDeliveryNote(o: CustomerOrder, mode: 'download' | 'print') {
  const { doc, w, h } = await frame('CUSTOMER DELIVERY ACKNOWLEDGMENT');
  doc.text(`Order No: ${o.order_no}`, 19, 47);
  doc.text(`Delivery Date: ${fmtDate(o.delivery_date)}`, w - 19, 47, { align: 'right' });
  doc.text(`Customer: ${o.customer_name}`, 19, 54);
  doc.text(`Mobile: ${o.mobile || '-'}`, w - 19, 54, { align: 'right' });
  doc.text(`Order Date: ${fmtDate(o.order_date)}`, 19, 61);
  doc.text(`Deadline: ${fmtDate(o.deadline)}`, w - 19, 61, { align: 'right' });
  autoTable(doc, {
    ...tableStyle, startY: 68, margin: { left: 19, right: 19 },
    head: [['SL', 'Style / Description', 'Quantity', 'Remarks']],
    body: [[1, o.style || '-', String(o.quantity), o.remarks || '']],
    columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 2: { cellWidth: 28, halign: 'right' }, 3: { cellWidth: 60 } },
    bodyStyles: { minCellHeight: 40 },
  });
  const y = (doc.lastAutoTable?.finalY ?? 120) + 10;
  doc.text('Received the above goods in good condition.', 19, y);
  signatures(doc, w, h, 'Delivered By', 'Received By', '', o.received_by || '');
  output(doc, `DN-${o.order_no}`, mode);
}

export async function orderStageReport(orders: CustomerOrder[], mode: 'download' | 'print') {
  const { doc } = await frame('CUSTOMER ORDER STAGE DURATION REPORT', 'landscape');
  const body: (string | number)[][] = [];
  orders.forEach(o => {
    const hist = stageHistory(o);
    ORDER_STAGES.slice(0, -1).forEach((name, i) => {
      const e = hist.find(x => x.stage === i);
      body.push([
        i === 0 ? o.order_no : '', i === 0 ? o.customer_name : '', name,
        fmtDateTime(e?.started_at), e?.completed_at ? fmtDateTime(e.completed_at) : (e ? 'In progress' : '-'),
        e ? formatDuration(e.started_at, e.completed_at) : '-', e?.remark || '',
      ]);
    });
    body.push(['', '', 'Delivered', '', fmtDate(o.delivery_date), '', o.deadline ? `Deadline ${fmtDate(o.deadline)}` : '']);
  });
  autoTable(doc, {
    ...tableStyle, startY: 45, margin: { left: 19, right: 19, bottom: 20 },
    head: [['Order', 'Customer', 'Stage', 'Started', 'Completed', 'Duration', 'Remark']],
    body,
  });
  output(doc, 'order-stage-report', mode);
}

export async function sampleGatePass(d: SampleDispatch, s: Sample | undefined, mode: 'download' | 'print') {
  const { doc, w, h } = await frame('SAMPLE OUTWARD GATE PASS');
  doc.text(`Gate Pass No: ${d.gate_pass_no}`, 19, 47);
  doc.text(`Date Sent: ${fmtDate(d.sent_date)}`, w - 19, 47, { align: 'right' });
  doc.text(`Sent To: ${d.sent_to}`, 19, 54);
  doc.text(`Mobile: ${d.mobile || '-'}`, w - 19, 54, { align: 'right' });
  doc.text(`Purpose: ${d.purpose || '-'}`, 19, 61);
  doc.text(`Expected Return: ${fmtDate(d.expected_return)}`, w - 19, 61, { align: 'right' });
  autoTable(doc, {
    ...tableStyle, startY: 68, margin: { left: 19, right: 19 },
    head: [['SL', 'Sample Ref', 'Style Name', 'Description', 'Qty']],
    body: [[1, s?.ref_no || '', s?.style_name || '', s?.description || '', String(d.qty)]],
    columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 32 }, 4: { cellWidth: 18, halign: 'right' } },
  });
  let y = (doc.lastAutoTable?.finalY ?? 90) + 12;
  if (d.status !== 'out') {
    doc.setFont('helvetica', 'bold'); doc.text('Return Details', 19, y); doc.setFont('helvetica', 'normal');
    y += 7;
    doc.text(`Status: ${d.status === 'returned' ? 'Returned' : 'Kept by client'}   Date: ${fmtDate(d.return_date)}   By: ${d.returned_by || '-'}   Condition: ${d.return_condition || '-'}`, 19, y);
    if (d.return_remarks) doc.text(`Remarks: ${d.return_remarks}`, 19, y + 7);
  }
  signatures(doc, w, h, 'Dispatched By', 'Received By', d.dispatched_by || '', d.sent_to);
  output(doc, d.gate_pass_no, mode);
}
