import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '@/assets/logo.png';
import type { StationeryItem, StationeryTxn } from '@/hooks/useStationery';

export interface StationeryHandoverDocument {
  number: string;
  date: string;
  reference: string;
  notes: string;
  handoverBy: string;
  handoverTo: string;
  transactions: StationeryTxn[];
}

const loadLogo = () => new Promise<string | null>((resolve) => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) return resolve(null);
    context.drawImage(image, 0, 0);
    resolve(canvas.toDataURL('image/png'));
  };
  image.onerror = () => resolve(null);
  image.src = logoImage;
});

const safeFileName = (value: string) => value.replace(/[^a-z0-9-_]+/gi, '-');

async function buildDocument(handover: StationeryHandoverDocument, items: StationeryItem[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const itemById = new Map(items.map(item => [item.id, item]));
  const logo = await loadLogo();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setDrawColor(40);
  doc.setLineWidth(0.35);
  doc.rect(margin, 12, pageWidth - margin * 2, 273);
  if (logo) doc.addImage(logo, 'PNG', margin + 5, 17, 35, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('GHOUSH - Stock Management', pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(13);
  doc.text('STATIONERY HANDOVER NOTE', pageWidth / 2, 31, { align: 'center' });
  doc.setLineWidth(0.2);
  doc.line(margin, 39, pageWidth - margin, 39);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Handover No: ${handover.number}`, margin + 5, 47);
  doc.text(`Date: ${handover.date ? new Date(`${handover.date}T00:00:00`).toLocaleDateString('en-GB') : ''}`, pageWidth - margin - 5, 47, { align: 'right' });
  doc.text(`Reference: ${handover.reference || '-'}`, margin + 5, 54);

  autoTable(doc, {
    startY: 60,
    margin: { left: margin + 5, right: margin + 5, bottom: 54 },
    head: [['SL', 'Item Code', 'Description', 'Qty', 'UOM']],
    body: handover.transactions.map((transaction, index) => {
      const item = itemById.get(transaction.itemId);
      return [index + 1, item?.itemCode || '', item?.description || '(deleted item)', transaction.qty, item?.uom || ''];
    }),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, lineColor: [80, 80, 80], lineWidth: 0.15, textColor: [20, 20, 20] },
    headStyles: { fillColor: [45, 55, 65], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 34 }, 2: { cellWidth: 77 }, 3: { cellWidth: 20, halign: 'right' }, 4: { cellWidth: 20 } },
  });

  const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 75;
  const notesY = Math.min(Math.max(tableEnd + 10, 170), 215);
  doc.setFont('helvetica', 'bold');
  doc.text('Remarks:', margin + 5, notesY);
  doc.setFont('helvetica', 'normal');
  const notes = doc.splitTextToSize(handover.notes || '-', pageWidth - margin * 2 - 30);
  doc.text(notes, margin + 25, notesY);

  const signatureY = 258;
  doc.line(margin + 12, signatureY, margin + 72, signatureY);
  doc.line(pageWidth - margin - 72, signatureY, pageWidth - margin - 12, signatureY);
  doc.setFont('helvetica', 'bold');
  doc.text('Handover By', margin + 42, signatureY + 6, { align: 'center' });
  doc.text('Handover To', pageWidth - margin - 42, signatureY + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(handover.handoverBy || '', margin + 42, signatureY - 3, { align: 'center' });
  doc.text(handover.handoverTo || '', pageWidth - margin - 42, signatureY - 3, { align: 'center' });

  return doc;
}

export async function downloadStationeryHandover(handover: StationeryHandoverDocument, items: StationeryItem[]) {
  const doc = await buildDocument(handover, items);
  doc.save(`${safeFileName(handover.number || 'stationery-handover')}.pdf`);
}

export async function printStationeryHandover(handover: StationeryHandoverDocument, items: StationeryItem[]) {
  const doc = await buildDocument(handover, items);
  doc.autoPrint();
  const url = doc.output('bloburl') as unknown as string;
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.src = url;
  frame.onload = () => setTimeout(() => frame.contentWindow?.print(), 250);
  document.body.appendChild(frame);
  setTimeout(() => {
    frame.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}