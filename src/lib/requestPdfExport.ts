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
  orderName?: string;
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

// Helper to draw page header for multi-page support
const drawPageHeader = (
  doc: jsPDF,
  logoBase64: string | null,
  title: string,
  docNumber: string,
  issueNumber: string,
  form: RequestForm,
  marginLeft: number,
  contentWidth: number,
  pageWidth: number
): number => {
  const headerTop = 10;
  const headerHeight = 30;
  
  // Outer border for this page
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, 10, contentWidth, pageHeight - 20);
  
  // Add logo on left
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', marginLeft + 5, headerTop + 5, 45, 22);
  } else {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('GHOUSH', marginLeft + 10, headerTop + 18);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('MILITARY & SAFETY UNIFORMS', marginLeft + 10, headerTop + 24);
  }

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, marginLeft + 60, headerTop + 20);

  // Header bottom line
  const headerBottom = headerTop + headerHeight;
  doc.setLineWidth(0.3);
  doc.line(marginLeft, headerBottom, pageWidth - marginLeft, headerBottom);

  // Document ID and Issue Number row
  const docIdRowY = headerBottom;
  const docIdRowHeight = 10;
  const halfWidth = contentWidth / 2;
  
  doc.setLineWidth(0.3);
  doc.line(marginLeft + halfWidth, docIdRowY, marginLeft + halfWidth, docIdRowY + docIdRowHeight);
  doc.line(marginLeft + 35, docIdRowY, marginLeft + 35, docIdRowY + docIdRowHeight);
  doc.line(marginLeft + halfWidth + 35, docIdRowY, marginLeft + halfWidth + 35, docIdRowY + docIdRowHeight);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Document ID', marginLeft + 3, docIdRowY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(docNumber, marginLeft + 38, docIdRowY + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Issue Number', marginLeft + halfWidth + 3, docIdRowY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(issueNumber, marginLeft + halfWidth + 38, docIdRowY + 7);
  
  doc.line(marginLeft, docIdRowY + docIdRowHeight, pageWidth - marginLeft, docIdRowY + docIdRowHeight);

  // Date row
  const dateRowY = docIdRowY + docIdRowHeight;
  const dateRowHeight = 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Date:', marginLeft + 3, dateRowY + 5.5);
  doc.text(formatDate(form.date), marginLeft + 20, dateRowY + 5.5);
  doc.line(marginLeft, dateRowY + dateRowHeight, pageWidth - marginLeft, dateRowY + dateRowHeight);

  // Department row
  const deptRowY = dateRowY + dateRowHeight;
  const deptRowHeight = 8;
  doc.text('Department:', marginLeft + 3, deptRowY + 5.5);
  doc.text(form.department || '', marginLeft + 35, deptRowY + 5.5);
  doc.line(marginLeft, deptRowY + deptRowHeight, pageWidth - marginLeft, deptRowY + deptRowHeight);

  // Order / PO row
  const orderRowY = deptRowY + deptRowHeight;
  const orderRowHeight = 8;
  doc.text('Order / PO:', marginLeft + 3, orderRowY + 5.5);
  doc.text(form.orderName || '', marginLeft + 32, orderRowY + 5.5);
  doc.line(marginLeft, orderRowY + orderRowHeight, pageWidth - marginLeft, orderRowY + orderRowHeight);

  return orderRowY + orderRowHeight; // Return table start Y
};

// Helper to draw signature section on every page
const drawSignatureSection = (
  doc: jsPDF,
  form: RequestForm,
  marginLeft: number,
  contentWidth: number,
  sigY: number,
  type: 'raw' | 'general' | 'return' = 'raw'
): void => {
  const sigBoxWidth = contentWidth / 4;
  const sigBoxHeight = 35;

  doc.setLineWidth(0.3);
  
  for (let i = 0; i < 4; i++) {
    doc.rect(marginLeft + (sigBoxWidth * i), sigY, sigBoxWidth, sigBoxHeight);
  }

  // Box 1 - Requested By / Returned By
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const box1Title = type === 'return' ? 'Returned By' : 'Requested By';
  doc.text(box1Title, marginLeft + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  doc.setLineWidth(0.2);
  const sigLineY = sigY + 20;
  doc.line(marginLeft + 5, sigLineY, marginLeft + sigBoxWidth - 5, sigLineY);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text('Name & Signature', marginLeft + sigBoxWidth / 2, sigLineY + 5, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Line Leader', marginLeft + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Box 2 - Approved By
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Approved By', marginLeft + sigBoxWidth + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  doc.setLineWidth(0.2);
  doc.line(marginLeft + sigBoxWidth + 5, sigLineY, marginLeft + sigBoxWidth * 2 - 5, sigLineY);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text('Name & Signature', marginLeft + sigBoxWidth + sigBoxWidth / 2, sigLineY + 5, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const box2Role = type === 'raw' ? 'Production Manager' : 'Line Manager';
  doc.text(box2Role, marginLeft + sigBoxWidth + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Box 3 - ASWAQ Transaction Report Number
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ASWAQ Transaction Report Number', marginLeft + sigBoxWidth * 2 + sigBoxWidth / 2, sigY + 6, { align: 'center' });

  // Box 4 - Issued By / Received By
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const box4Title = type === 'return' ? 'Received By' : 'Issued By';
  doc.text(box4Title, marginLeft + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 6, { align: 'center' });
  
  doc.setLineWidth(0.2);
  doc.line(marginLeft + sigBoxWidth * 3 + 5, sigLineY, marginLeft + sigBoxWidth * 4 - 5, sigLineY);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text('Name & Signature', marginLeft + sigBoxWidth * 3 + sigBoxWidth / 2, sigLineY + 5, { align: 'center' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Warehouse In Charge', marginLeft + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 32, { align: 'center' });

  // Fill in form values if provided
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (form.requestedBy) {
    doc.text(form.requestedBy, marginLeft + sigBoxWidth / 2, sigY + 15, { align: 'center' });
  }
  if (form.approvedBy) {
    doc.text(form.approvedBy, marginLeft + sigBoxWidth + sigBoxWidth / 2, sigY + 15, { align: 'center' });
  }
  if (form.aswaqNumber) {
    doc.text(form.aswaqNumber, marginLeft + sigBoxWidth * 2 + sigBoxWidth / 2, sigY + 15, { align: 'center' });
  }
  if (form.issuedBy) {
    doc.text(form.issuedBy, marginLeft + sigBoxWidth * 3 + sigBoxWidth / 2, sigY + 15, { align: 'center' });
  }
};

export const exportRawMaterialRequestPDF = async (form: RequestForm, items: RequestItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docNumber = existingDocNumber || getNextDocNumber('DOC');
  const issueNumber = `ISS-${docNumber.split('-')[1]}`;
  
  const marginLeft = 10;
  const marginRight = 10;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const sigBoxHeight = 35;
  const sigY = pageHeight - 10 - sigBoxHeight; // Signature at bottom of each page
  
  // Load logo once
  let logoBase64: string | null = null;
  try {
    logoBase64 = await loadLogoAsBase64();
  } catch (error) {
    logoBase64 = null;
  }

  // Draw initial header and signature
  const tableStartY = drawPageHeader(doc, logoBase64, 'RAW MATERIAL REQUEST', docNumber, issueNumber, form, marginLeft, contentWidth, pageWidth);
  drawSignatureSection(doc, form, marginLeft, contentWidth, sigY, 'raw');

  // Prepare table rows
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
  
  // Pad to minimum 8 rows for proper layout (fits on single page)
  const minRows = items.length > 0 ? Math.max(8, items.length + 3) : 8;
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
      lineWidth: 0.3,
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
      1: { cellWidth: 35 },
      2: { cellWidth: 70 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 28, halign: 'center' },
      6: { cellWidth: 30, halign: 'center' },
      7: { cellWidth: 49 }
    },
    margin: { left: marginLeft, right: marginRight, top: 76, bottom: sigBoxHeight + 15 },
    tableWidth: contentWidth,
    didDrawPage: (data) => {
      // Draw header and signature on each new page
      if (data.pageNumber > 1) {
        drawPageHeader(doc, logoBase64, 'RAW MATERIAL REQUEST', docNumber, issueNumber, form, marginLeft, contentWidth, pageWidth);
        drawSignatureSection(doc, form, marginLeft, contentWidth, sigY, 'raw');
      }
    }
  });

  doc.save(`Raw_Material_Request_${docNumber}.pdf`);
};

export const exportGeneralSuppliesRequestPDF = async (form: RequestForm, items: RequestItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docNumber = existingDocNumber || getNextDocNumber('DOC');
  const issueNumber = `ISS-${docNumber.split('-')[1]}`;
  
  const marginLeft = 10;
  const contentWidth = pageWidth - marginLeft * 2;
  const sigBoxHeight = 35;
  const sigY = pageHeight - 10 - sigBoxHeight; // Signature at bottom of each page
  
  // Load logo once
  let logoBase64: string | null = null;
  try {
    logoBase64 = await loadLogoAsBase64();
  } catch (error) {
    logoBase64 = null;
  }

  // Draw initial header and signature
  const tableStartY = drawPageHeader(doc, logoBase64, 'GENERAL SUPPLIES REQUEST', docNumber, issueNumber, form, marginLeft, contentWidth, pageWidth);
  drawSignatureSection(doc, form, marginLeft, contentWidth, sigY, 'general');

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
  
  // Pad to minimum 8 rows for proper layout (fits on single page)
  const minRows = items.length > 0 ? Math.max(8, items.length + 3) : 8;
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
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 70 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 28, halign: 'center' },
      6: { cellWidth: 30, halign: 'center' },
      7: { cellWidth: 49 }
    },
    margin: { left: marginLeft, right: marginLeft, top: 76, bottom: sigBoxHeight + 15 },
    tableWidth: contentWidth,
    didDrawPage: (data) => {
      // Draw header and signature on each new page
      if (data.pageNumber > 1) {
        drawPageHeader(doc, logoBase64, 'GENERAL SUPPLIES REQUEST', docNumber, issueNumber, form, marginLeft, contentWidth, pageWidth);
        drawSignatureSection(doc, form, marginLeft, contentWidth, sigY, 'general');
      }
    }
  });

  doc.save(`General_Supplies_Request_${docNumber}.pdf`);
};

export const exportMaterialReturnSlipPDF = async (form: RequestForm, items: ReturnItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docNumber = existingDocNumber || getNextDocNumber('DOC');
  const issueNumber = `ISS-${docNumber.split('-')[1]}`;
  
  const marginLeft = 10;
  const contentWidth = pageWidth - marginLeft * 2;
  const sigBoxHeight = 35;
  const sigY = pageHeight - 10 - sigBoxHeight; // Signature at bottom of each page
  
  // Load logo once
  let logoBase64: string | null = null;
  try {
    logoBase64 = await loadLogoAsBase64();
  } catch (error) {
    logoBase64 = null;
  }

  // Draw initial header and signature
  const tableStartY = drawPageHeader(doc, logoBase64, 'MATERIAL RETURN SLIP', docNumber, issueNumber, form, marginLeft, contentWidth, pageWidth);
  drawSignatureSection(doc, form, marginLeft, contentWidth, sigY, 'return');

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
  
  // Pad to minimum 8 rows for proper layout (fits on single page)
  const minRows = items.length > 0 ? Math.max(8, items.length + 3) : 8;
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
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 40 },
      2: { cellWidth: 90 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 35, halign: 'center' },
      5: { cellWidth: 35, halign: 'center' },
      6: { cellWidth: 34 }
    },
    margin: { left: marginLeft, right: marginLeft, top: 76, bottom: sigBoxHeight + 15 },
    tableWidth: contentWidth,
    didDrawPage: (data) => {
      // Draw header and signature on each new page
      if (data.pageNumber > 1) {
        drawPageHeader(doc, logoBase64, 'MATERIAL RETURN SLIP', docNumber, issueNumber, form, marginLeft, contentWidth, pageWidth);
        drawSignatureSection(doc, form, marginLeft, contentWidth, sigY, 'return');
      }
    }
  });

  doc.save(`Material_Return_Slip_${docNumber}.pdf`);
};

// Empty form exports for manual use
export const exportEmptyRawMaterialPDF = async (): Promise<void> => {
  const emptyForm: RequestForm = {
    date: '',
    department: '',
    orderName: '',
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
    orderName: '',
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
    orderName: '',
    requestedBy: '',
    approvedBy: '',
    issuedBy: '',
    aswaqNumber: '',
  };
  await exportMaterialReturnSlipPDF(emptyForm, [], 'MRS-__-____');
};
