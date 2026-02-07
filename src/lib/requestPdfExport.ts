import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '@/assets/logo.png';

interface RequestItem {
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

const getNextDocNumber = (prefix: string): string => {
  const key = `docNumber_${prefix}`;
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearKey = `${key}_${currentYear}`;
  
  // Get the last used number for this prefix and year
  const stored = localStorage.getItem(yearKey);
  let counter = 1;
  
  if (stored) {
    counter = parseInt(stored) + 1;
  }
  
  // Save the new counter
  localStorage.setItem(yearKey, counter.toString());
  
  // Format: PREFIX-XX-YYYY (e.g., RMR-01-2026)
  return `${prefix}-${String(counter).padStart(2, '0')}-${currentYear}`;
};

const loadLogoAsBase64 = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = logoImage;
  });
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB');
};

export const exportRawMaterialRequestPDF = async (form: RequestForm, items: RequestItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docNumber = existingDocNumber || getNextDocNumber('DOC');
  const issueNumber = `ISS-${docNumber.split('-')[1]}`;
  
  // Outer border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Header section with logo and title
  let headerY = 18;
  
  // Add logo on left
  try {
    const logoBase64 = await loadLogoAsBase64();
    doc.addImage(logoBase64, 'PNG', 15, 15, 35, 20);
  } catch (error) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GHOUSH', 20, 25);
    doc.setFontSize(6);
    doc.text('MILITARY & SAFETY UNIFORMS', 20, 30);
  }

  // Title - RAW MATERIAL REQUEST (next to logo)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RAW MATERIAL REQUEST', 55, 28);

  // Header bottom line
  const headerBottom = 40;
  doc.setLineWidth(0.3);
  doc.line(10, headerBottom, pageWidth - 10, headerBottom);

  // Document ID and Issue Number row (table format)
  const docIdRowY = headerBottom;
  const docIdRowHeight = 10;
  
  // Document ID label and value
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Document ID', 15, docIdRowY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(docNumber, 50, docIdRowY + 7);
  
  // Vertical divider
  doc.line(pageWidth / 2, docIdRowY, pageWidth / 2, docIdRowY + docIdRowHeight);
  
  // Issue Number label and value
  doc.setFont('helvetica', 'normal');
  doc.text('Issue Number', pageWidth / 2 + 5, docIdRowY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(issueNumber, pageWidth / 2 + 40, docIdRowY + 7);
  
  doc.line(10, docIdRowY + docIdRowHeight, pageWidth - 10, docIdRowY + docIdRowHeight);

  // Date row
  const dateRowY = docIdRowY + docIdRowHeight;
  const dateRowHeight = 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date:  ${formatDate(form.date)}`, 15, dateRowY + 6);
  doc.line(10, dateRowY + dateRowHeight, pageWidth - 10, dateRowY + dateRowHeight);

  // Department row
  const deptRowY = dateRowY + dateRowHeight;
  const deptRowHeight = 8;
  doc.text(`Department:  ${form.department}`, 15, deptRowY + 6);
  doc.line(10, deptRowY + deptRowHeight, pageWidth - 10, deptRowY + deptRowHeight);

  // Table starting position
  const tableStartY = deptRowY + deptRowHeight;

  // Prepare table rows - ensure minimum 10 rows + 3 additional empty rows for manual notes
  const tableRows = items.length > 0 
    ? items.map(item => [
        item.slNo.toString(),
        item.itemCode,
        item.description,
        item.uom,
        item.requestedQty > 0 ? item.requestedQty.toString() : '',
        item.issuedQty > 0 ? item.issuedQty.toString() : '',
        item.remainingQty !== 0 ? item.remainingQty.toString() : '',
        item.remarks
      ])
    : [];
  
  // Pad to minimum 12 rows for proper layout
  const minRows = Math.max(12, items.length + 3);
  while (tableRows.length < minRows) {
    tableRows.push(['', '', '', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: tableStartY,
    head: [['SL No', 'ITEM CODE', 'DESCRIPTION', 'UOM', 'REQUESTED\nQUANTITY', 'ISSUED\nQUANTITY', 'REMAINING\nQUANTITY', 'Remarks for Merchandize']],
    body: tableRows,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      minCellHeight: 8,
      valign: 'middle'
    },
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 12
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 45 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 26 }
    },
    margin: { left: 10, right: 10 },
    tableWidth: pageWidth - 20
  });

  // Get the final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY;

  // Signature section - 4 columns
  const sigY = Math.max(finalY + 5, pageHeight - 55);
  const sigBoxWidth = (pageWidth - 20) / 4;
  const sigBoxHeight = 35;

  // Draw signature boxes
  doc.setLineWidth(0.3);
  
  // Box 1 - Requested By
  doc.rect(10, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Requested By', 10 + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  // Signature line and labels
  doc.setLineWidth(0.2);
  doc.line(10 + 5, sigY + 22, 10 + sigBoxWidth - 5, sigY + 22);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 10 + sigBoxWidth / 2, sigY + 27, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Line Leader', 10 + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Box 2 - Approved By
  doc.setLineWidth(0.3);
  doc.rect(10 + sigBoxWidth, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Approved By', 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  doc.setLineWidth(0.2);
  doc.line(10 + sigBoxWidth + 5, sigY + 22, 10 + sigBoxWidth * 2 - 5, sigY + 22);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 27, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Production Manager', 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Box 3 - ASWAQ Transaction Report Number
  doc.setLineWidth(0.3);
  doc.rect(10 + sigBoxWidth * 2, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ASWAQ Transaction Report Number', 10 + sigBoxWidth * 2 + sigBoxWidth / 2, sigY + 6, { align: 'center' });

  // Box 4 - Issued By
  doc.rect(10 + sigBoxWidth * 3, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Issued By', 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  doc.setLineWidth(0.2);
  doc.line(10 + sigBoxWidth * 3 + 5, sigY + 22, 10 + sigBoxWidth * 4 - 5, sigY + 22);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 27, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Warehouse In Charge', 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Fill in form values if provided
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (form.requestedBy) {
    doc.text(form.requestedBy, 10 + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }
  if (form.approvedBy) {
    doc.text(form.approvedBy, 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }
  if (form.aswaqNumber) {
    doc.text(form.aswaqNumber, 10 + sigBoxWidth * 2 + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }
  if (form.issuedBy) {
    doc.text(form.issuedBy, 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }

  doc.save(`Raw_Material_Request_${docNumber}.pdf`);
};

export const exportGeneralSuppliesRequestPDF = async (form: RequestForm, items: RequestItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docNumber = existingDocNumber || getNextDocNumber('DOC');
  const issueNumber = `ISS-${docNumber.split('-')[1]}`;
  
  // Outer border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Header section with logo and title
  try {
    const logoBase64 = await loadLogoAsBase64();
    doc.addImage(logoBase64, 'PNG', 15, 15, 35, 20);
  } catch (error) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GHOUSH', 20, 25);
  }

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GENERAL SUPPLIES REQUEST', 55, 28);

  // Header bottom line
  const headerBottom = 40;
  doc.setLineWidth(0.3);
  doc.line(10, headerBottom, pageWidth - 10, headerBottom);

  // Document ID and Issue Number row
  const docIdRowY = headerBottom;
  const docIdRowHeight = 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Document ID', 15, docIdRowY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(docNumber, 50, docIdRowY + 7);
  
  doc.line(pageWidth / 2, docIdRowY, pageWidth / 2, docIdRowY + docIdRowHeight);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Issue Number', pageWidth / 2 + 5, docIdRowY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(issueNumber, pageWidth / 2 + 40, docIdRowY + 7);
  
  doc.line(10, docIdRowY + docIdRowHeight, pageWidth - 10, docIdRowY + docIdRowHeight);

  // Date row
  const dateRowY = docIdRowY + docIdRowHeight;
  const dateRowHeight = 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date:  ${formatDate(form.date)}`, 15, dateRowY + 6);
  doc.line(10, dateRowY + dateRowHeight, pageWidth - 10, dateRowY + dateRowHeight);

  // Department row
  const deptRowY = dateRowY + dateRowHeight;
  const deptRowHeight = 8;
  doc.text(`Department:  ${form.department}`, 15, deptRowY + 6);
  doc.line(10, deptRowY + deptRowHeight, pageWidth - 10, deptRowY + deptRowHeight);

  // Table
  const tableStartY = deptRowY + deptRowHeight;

  const tableRows = items.length > 0 
    ? items.map(item => [
        item.slNo.toString(),
        item.itemCode,
        item.description,
        item.uom,
        item.requestedQty > 0 ? item.requestedQty.toString() : '',
        item.issuedQty > 0 ? item.issuedQty.toString() : '',
        item.remainingQty !== 0 ? item.remainingQty.toString() : '',
        item.remarks
      ])
    : [];
  
  const minRows = Math.max(12, items.length + 3);
  while (tableRows.length < minRows) {
    tableRows.push(['', '', '', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: tableStartY,
    head: [['SL No', 'ITEM CODE', 'DESCRIPTION', 'UOM', 'REQUESTED\nQUANTITY', 'ISSUED\nQUANTITY', 'REMAINING\nQUANTITY', 'Remarks for Procurement']],
    body: tableRows,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      minCellHeight: 8,
      valign: 'middle'
    },
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 12
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 45 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 26 }
    },
    margin: { left: 10, right: 10 },
    tableWidth: pageWidth - 20
  });

  // Signature section
  const finalY = (doc as any).lastAutoTable.finalY;
  const sigY = Math.max(finalY + 5, pageHeight - 55);
  const sigBoxWidth = (pageWidth - 20) / 4;
  const sigBoxHeight = 35;

  doc.setLineWidth(0.3);
  
  // Box 1 - Requested By
  doc.rect(10, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Requested By', 10 + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  doc.setLineWidth(0.2);
  doc.line(10 + 5, sigY + 22, 10 + sigBoxWidth - 5, sigY + 22);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 10 + sigBoxWidth / 2, sigY + 27, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Line Leader', 10 + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Box 2 - Approved By
  doc.setLineWidth(0.3);
  doc.rect(10 + sigBoxWidth, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Approved By', 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  doc.setLineWidth(0.2);
  doc.line(10 + sigBoxWidth + 5, sigY + 22, 10 + sigBoxWidth * 2 - 5, sigY + 22);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 27, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Line Manager', 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Box 3 - ASWAQ
  doc.setLineWidth(0.3);
  doc.rect(10 + sigBoxWidth * 2, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ASWAQ Transaction Report Number', 10 + sigBoxWidth * 2 + sigBoxWidth / 2, sigY + 6, { align: 'center' });

  // Box 4 - Issued By
  doc.rect(10 + sigBoxWidth * 3, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Issued By', 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  doc.setLineWidth(0.2);
  doc.line(10 + sigBoxWidth * 3 + 5, sigY + 22, 10 + sigBoxWidth * 4 - 5, sigY + 22);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 27, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Warehouse In Charge', 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Fill in form values
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (form.requestedBy) {
    doc.text(form.requestedBy, 10 + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }
  if (form.approvedBy) {
    doc.text(form.approvedBy, 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }
  if (form.aswaqNumber) {
    doc.text(form.aswaqNumber, 10 + sigBoxWidth * 2 + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }
  if (form.issuedBy) {
    doc.text(form.issuedBy, 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }

  doc.save(`General_Supplies_Request_${docNumber}.pdf`);
};

export const exportMaterialReturnSlipPDF = async (form: RequestForm, items: ReturnItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docNumber = existingDocNumber || getNextDocNumber('DOC');
  const issueNumber = `ISS-${docNumber.split('-')[1]}`;
  
  // Outer border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Header section with logo and title
  try {
    const logoBase64 = await loadLogoAsBase64();
    doc.addImage(logoBase64, 'PNG', 15, 15, 35, 20);
  } catch (error) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GHOUSH', 20, 25);
  }

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MATERIAL RETURN SLIP', 55, 28);

  // Header bottom line
  const headerBottom = 40;
  doc.setLineWidth(0.3);
  doc.line(10, headerBottom, pageWidth - 10, headerBottom);

  // Document ID and Issue Number row
  const docIdRowY = headerBottom;
  const docIdRowHeight = 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Document ID', 15, docIdRowY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(docNumber, 50, docIdRowY + 7);
  
  doc.line(pageWidth / 2, docIdRowY, pageWidth / 2, docIdRowY + docIdRowHeight);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Issue Number', pageWidth / 2 + 5, docIdRowY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(issueNumber, pageWidth / 2 + 40, docIdRowY + 7);
  
  doc.line(10, docIdRowY + docIdRowHeight, pageWidth - 10, docIdRowY + docIdRowHeight);

  // Date row
  const dateRowY = docIdRowY + docIdRowHeight;
  const dateRowHeight = 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Date:  ${formatDate(form.date)}`, 15, dateRowY + 6);
  doc.line(10, dateRowY + dateRowHeight, pageWidth - 10, dateRowY + dateRowHeight);

  // Department row
  const deptRowY = dateRowY + dateRowHeight;
  const deptRowHeight = 8;
  doc.text(`Department:  ${form.department}`, 15, deptRowY + 6);
  doc.line(10, deptRowY + deptRowHeight, pageWidth - 10, deptRowY + deptRowHeight);

  // Table
  const tableStartY = deptRowY + deptRowHeight;

  const tableRows = items.length > 0 
    ? items.map(item => [
        item.slNo.toString(),
        item.itemCode,
        item.description,
        item.uom,
        item.qtyReturned > 0 ? item.qtyReturned.toString() : '',
        item.qtyReceived > 0 ? item.qtyReceived.toString() : '',
        item.remarks
      ])
    : [];
  
  const minRows = Math.max(12, items.length + 3);
  while (tableRows.length < minRows) {
    tableRows.push(['', '', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: tableStartY,
    head: [['SL No', 'ITEM CODE', 'DESCRIPTION', 'UOM', 'QUANTITY\nRETURNED', 'QUANTITY\nRECEIVED', 'Remarks']],
    body: tableRows,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      minCellHeight: 8,
      valign: 'middle'
    },
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 12
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 55 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
      6: { cellWidth: 20 }
    },
    margin: { left: 10, right: 10 },
    tableWidth: pageWidth - 20
  });

  // Signature section
  const finalY = (doc as any).lastAutoTable.finalY;
  const sigY = Math.max(finalY + 5, pageHeight - 55);
  const sigBoxWidth = (pageWidth - 20) / 4;
  const sigBoxHeight = 35;

  doc.setLineWidth(0.3);
  
  // Box 1 - Returned By
  doc.rect(10, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Returned By', 10 + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  doc.setLineWidth(0.2);
  doc.line(10 + 5, sigY + 22, 10 + sigBoxWidth - 5, sigY + 22);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 10 + sigBoxWidth / 2, sigY + 27, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Line Leader', 10 + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Box 2 - Approved By
  doc.setLineWidth(0.3);
  doc.rect(10 + sigBoxWidth, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Approved By', 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  doc.setLineWidth(0.2);
  doc.line(10 + sigBoxWidth + 5, sigY + 22, 10 + sigBoxWidth * 2 - 5, sigY + 22);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 27, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Line Manager', 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Box 3 - ASWAQ
  doc.setLineWidth(0.3);
  doc.rect(10 + sigBoxWidth * 2, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ASWAQ Transaction Report Number', 10 + sigBoxWidth * 2 + sigBoxWidth / 2, sigY + 6, { align: 'center' });

  // Box 4 - Received By
  doc.rect(10 + sigBoxWidth * 3, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Received By', 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  doc.setLineWidth(0.2);
  doc.line(10 + sigBoxWidth * 3 + 5, sigY + 22, 10 + sigBoxWidth * 4 - 5, sigY + 22);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 27, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Warehouse In Charge', 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Fill in form values
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (form.requestedBy) {
    doc.text(form.requestedBy, 10 + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }
  if (form.approvedBy) {
    doc.text(form.approvedBy, 10 + sigBoxWidth + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }
  if (form.aswaqNumber) {
    doc.text(form.aswaqNumber, 10 + sigBoxWidth * 2 + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }
  if (form.issuedBy) {
    doc.text(form.issuedBy, 10 + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 16, { align: 'center' });
  }

  doc.save(`Material_Return_Slip_${docNumber}.pdf`);
};

// Empty form exports for manual use
export const exportEmptyRawMaterialPDF = async (): Promise<void> => {
  const emptyForm: RequestForm = {
    date: '',
    department: '',
    requestedBy: '',
    approvedBy: '',
    issuedBy: '',
    aswaqNumber: '',
  };
  await exportRawMaterialRequestPDF(emptyForm, [], 'RMR-__-____');
};

export const exportEmptyGeneralSuppliesPDF = async (): Promise<void> => {
  const emptyForm: RequestForm = {
    date: '',
    department: '',
    requestedBy: '',
    approvedBy: '',
    issuedBy: '',
    aswaqNumber: '',
  };
  await exportGeneralSuppliesRequestPDF(emptyForm, [], 'GSR-__-____');
};

export const exportEmptyMaterialReturnPDF = async (): Promise<void> => {
  const emptyForm: RequestForm = {
    date: '',
    department: '',
    requestedBy: '',
    approvedBy: '',
    issuedBy: '',
    aswaqNumber: '',
  };
  await exportMaterialReturnSlipPDF(emptyForm, [], 'MRS-__-____');
};
