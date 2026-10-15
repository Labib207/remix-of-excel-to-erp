import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Sample, SampleDispatch } from '@/hooks/useCustomerSamples';

/** Dedicated sample-note layout; other document formats remain independent. */
export function buildSampleDeliveryNote(
  dispatch: SampleDispatch,
  sample: Sample | undefined,
  logo: string | null,
  formatDate: (value?: string | null) => string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const left = 12;
  const contentWidth = width - 24;
  const title = 'SAMPLE DELIVERY NOTE';
  const framedPages = new Set<number>();

  const drawHeader = () => {
    const page = doc.getCurrentPageInfo().pageNumber;
    if (framedPages.has(page)) return;
    framedPages.add(page);
    doc.setDrawColor(45);
    doc.setTextColor(25);
    doc.setLineWidth(0.3);
    doc.rect(left, 9, contentWidth, height - 18);
    if (logo) doc.addImage(logo, 'PNG', 12, 10, 40, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text(title, width / 2 + 15, 24, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.line(left, 34, width - left, 34);
    autoTable(doc, {
      startY: 34, margin: { left, right: left }, theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2.5, textColor: 25, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: contentWidth * 0.63 }, 1: { cellWidth: contentWidth * 0.37 } },
      body: [
        [`To: ${dispatch.sent_to || '-'}`, `Delivery Note No: ${dispatch.gate_pass_no}`],
        [`Mobile: ${dispatch.mobile || '-'}`, `Date: ${formatDate(dispatch.sent_date)}`],
        [`Purpose: ${dispatch.purpose || '-'}`, `Expected Return: ${formatDate(dispatch.expected_return)}`],
      ],
    });
  };

  // Metadata can wrap; leave the item table below it rather than overlaying it.
  drawHeader();
  const firstHeaderEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 63;
  const description = dispatch.note_description?.trim() || sample?.style_name?.trim() || dispatch.sent_to || '-';
  const body: (string | number)[][] = [
    [1, sample?.ref_no || '-', description, String(dispatch.qty)],
    ...Array.from({ length: 2 }, () => ['', '', '', '']),
  ];
  autoTable(doc, {
    startY: firstHeaderEnd + 2,
    margin: { left, right: left, top: firstHeaderEnd + 2, bottom: 64 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 2.5, lineColor: 70, lineWidth: 0.2, textColor: 25, valign: 'middle', overflow: 'linebreak' },
    headStyles: { fillColor: 242, textColor: 25, fontStyle: 'bold' },
    bodyStyles: { minCellHeight: 8 },
    footStyles: { fillColor: 255, textColor: 25, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 14, halign: 'center' }, 1: { cellWidth: 45 }, 3: { cellWidth: 28, halign: 'center' } },
    head: [['SL', 'SAMPLE REFERENCE', 'ITEM / DESCRIPTION', 'QTY']],
    body,
    foot: [[{ content: 'TOTAL QUANTITY', colSpan: 3, styles: { halign: 'right' } }, String(dispatch.qty)]],
    showFoot: 'lastPage',
    willDrawPage: drawHeader,
  });

  const notes: string[][] = [];
  if (dispatch.reason) notes.push(['Remarks / Reason', dispatch.reason]);
  if (!dispatch.is_custom && dispatch.pass_type === 'sent' && dispatch.status !== 'out') {
    notes.push(['Return Details', `${dispatch.status === 'returned' ? 'Returned' : 'Kept by client'} | Date: ${formatDate(dispatch.return_date)} | By: ${dispatch.returned_by || '-'} | Condition: ${dispatch.return_condition || '-'}`]);
    if (dispatch.return_remarks) notes.push(['Return Remarks', dispatch.return_remarks]);
  }
  if (notes.length) {
    const end = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 135;
    autoTable(doc, {
      startY: end + 3, margin: { left, right: left, top: firstHeaderEnd + 2, bottom: 58 },
      theme: 'plain', body: notes,
      styles: { fontSize: 9, cellPadding: 2, textColor: 25, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 32, fontStyle: 'bold' } },
      willDrawPage: drawHeader,
    });
  }

  const signatureY = height - 49;
  doc.setDrawColor(45);
  doc.line(left, signatureY - 5, width - left, signatureY - 5);
  for (const [x, heading] of [
    [left + 8, 'ISSUED BY'],
    [width / 2 + 20, 'RECEIVED BY'],
  ] as const) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text(heading, x, signatureY + 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Signature:', x, signatureY + 25);
    doc.line(x + 19, signatureY + 26, x + 95, signatureY + 26);
    doc.text('Date:', x, signatureY + 34);
    doc.line(x + 10, signatureY + 35, x + 95, signatureY + 35);
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`Page ${page} of ${pages}`, width - left, height - 5, { align: 'right' });
  }
  return doc;
}