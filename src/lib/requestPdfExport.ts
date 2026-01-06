import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const stored = localStorage.getItem(key);
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  let counter = 1;
  if (stored) {
    const [storedYearMonth, storedCounter] = stored.split('-');
    if (storedYearMonth === yearMonth) {
      counter = parseInt(storedCounter) + 1;
    }
  }
  
  localStorage.setItem(key, `${yearMonth}-${counter}`);
  return `${prefix}-${String(counter).padStart(2, '0')}-2024`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB');
};

export const exportRawMaterialRequestPDF = (form: RequestForm, items: RequestItem[]): void => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const docNumber = getNextDocNumber('RMR');
  
  // Border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, 190);

  // Header with logo placeholder and title
  doc.setFillColor(34, 139, 34);
  doc.triangle(25, 20, 20, 35, 30, 35, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('GHOUSH', 35, 28);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('MILITARY & SAFETY UNIFORMS', 35, 32);
  doc.text('OF ADEEM UNIFORM FACTORY', 35, 36);

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('RAW MATERIAL REQUEST', 95, 30);

  // Document info line
  doc.setLineWidth(0.3);
  doc.line(15, 42, pageWidth - 15, 42);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Document ID: ${docNumber}`, 15, 48);
  doc.text('Issue Number', 180, 48);
  doc.setFont('helvetica', 'normal');
  doc.text('GAU-VER 01-JAN-2024', 210, 48);

  // Date and Department
  doc.line(15, 52, pageWidth - 15, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(form.date)}`, 15, 58);
  doc.line(15, 62, pageWidth - 15, 62);
  doc.text(`Department: ${form.department}`, 15, 68);
  doc.line(15, 72, pageWidth - 15, 72);

  // Table
  const tableData = items.length > 0 
    ? items.map(item => [
        item.slNo.toString(),
        item.itemCode,
        item.description,
        item.uom,
        item.requestedQty.toString(),
        item.issuedQty.toString(),
        item.remainingQty.toString(),
        item.remarks
      ])
    : Array(10).fill(['', '', '', '', '', '', '', '']);

  autoTable(doc, {
    startY: 74,
    head: [['SL No', 'ITEM CODE', 'DESCRIPTION', 'UOM', 'REQUESTED\nQUANTITY', 'ISSUED\nQUANTITY', 'REMAINING\nQUANTITY', 'Remarks for Merchandize']],
    body: tableData,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 60 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
      6: { cellWidth: 25, halign: 'center' },
      7: { cellWidth: 57 }
    },
    margin: { left: 15, right: 15 }
  });

  // Signatures
  const signatureY = 165;
  
  // Signature boxes
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Requested By', 30, signatureY);
  doc.text('Approved By', 100, signatureY);
  doc.text('ASWAQ Transaction Report Number', 160, signatureY);
  doc.text('Issued By', 245, signatureY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Name & Signature', 30, signatureY + 15);
  doc.text('Name & Signature', 100, signatureY + 15);
  doc.text('Name & Signature', 245, signatureY + 15);
  
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Line Leader', 30, signatureY + 22);
  doc.text('Production Manager', 100, signatureY + 22);
  doc.text('Warehouse In Charge', 245, signatureY + 22);

  // Lines for signatures
  doc.setLineWidth(0.2);
  doc.line(25, signatureY + 12, 70, signatureY + 12);
  doc.line(95, signatureY + 12, 140, signatureY + 12);
  doc.line(155, signatureY + 12, 230, signatureY + 12);
  doc.line(240, signatureY + 12, 280, signatureY + 12);

  doc.save(`Raw_Material_Request_${docNumber}.pdf`);
};

export const exportGeneralSuppliesRequestPDF = (form: RequestForm, items: RequestItem[]): void => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const docNumber = getNextDocNumber('GSR');
  
  // Border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, 190);

  // Header with logo placeholder and title
  doc.setFillColor(34, 139, 34);
  doc.triangle(25, 20, 20, 35, 30, 35, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('GHOUSH', 35, 28);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('MILITARY & SAFETY UNIFORMS', 35, 32);
  doc.text('OF ADEEM UNIFORM FACTORY', 35, 36);

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('GENERAL SUPPLIES REQUEST', 85, 30);

  // Document info line
  doc.setLineWidth(0.3);
  doc.line(15, 42, pageWidth - 15, 42);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Document ID: ${docNumber}`, 15, 48);
  doc.text('Issue Number', 180, 48);
  doc.setFont('helvetica', 'normal');
  doc.text('GAU-VER 01-JAN-2024', 210, 48);

  // Date and Department
  doc.line(15, 52, pageWidth - 15, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(form.date)}`, 15, 58);
  doc.line(15, 62, pageWidth - 15, 62);
  doc.text(`Department: ${form.department}`, 15, 68);
  doc.line(15, 72, pageWidth - 15, 72);

  // Table
  const tableData = items.length > 0 
    ? items.map(item => [
        item.slNo.toString(),
        item.itemCode,
        item.description,
        item.uom,
        item.requestedQty.toString(),
        item.issuedQty.toString(),
        item.remainingQty.toString(),
        item.remarks
      ])
    : Array(10).fill(['', '', '', '', '', '', '', '']);

  autoTable(doc, {
    startY: 74,
    head: [['SL\nNo', 'ITEM CODE', 'DESCRIPTION', 'UOM', 'REQUESTED\nQUANTITY', 'ISSUED\nQUANTITY', 'REMAINING\nQUANTITY', 'Remarks for Procurement']],
    body: tableData,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 60 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
      6: { cellWidth: 25, halign: 'center' },
      7: { cellWidth: 57 }
    },
    margin: { left: 15, right: 15 }
  });

  // Signatures
  const signatureY = 165;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Requested By', 30, signatureY);
  doc.text('Approved By', 100, signatureY);
  doc.text('ASWAQ Transaction Report Number', 160, signatureY);
  doc.text('Issued By', 245, signatureY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Name & Signature', 30, signatureY + 15);
  doc.text('Name & Signature', 100, signatureY + 15);
  doc.text('Name & Signature', 245, signatureY + 15);
  
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Line Leader', 30, signatureY + 22);
  doc.text('Line Manager', 100, signatureY + 22);
  doc.text('Warehouse In Charge', 245, signatureY + 22);

  // Lines for signatures
  doc.setLineWidth(0.2);
  doc.line(25, signatureY + 12, 70, signatureY + 12);
  doc.line(95, signatureY + 12, 140, signatureY + 12);
  doc.line(155, signatureY + 12, 230, signatureY + 12);
  doc.line(240, signatureY + 12, 280, signatureY + 12);

  doc.save(`General_Supplies_Request_${docNumber}.pdf`);
};

export const exportMaterialReturnSlipPDF = (form: RequestForm, items: ReturnItem[]): void => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const docNumber = getNextDocNumber('MRS');
  
  // Border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, 190);

  // Header with logo placeholder and title
  doc.setFillColor(34, 139, 34);
  doc.triangle(25, 20, 20, 35, 30, 35, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('GHOUSH', 35, 28);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('MILITARY & SAFETY UNIFORMS', 35, 32);
  doc.text('OF ADEEM UNIFORM FACTORY', 35, 36);

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('MATERIAL RETURN SLIP', 105, 30);

  // Document info line
  doc.setLineWidth(0.3);
  doc.line(15, 42, pageWidth - 15, 42);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Document ID: ${docNumber}`, 15, 48);
  doc.text('Issue Number', 180, 48);
  doc.setFont('helvetica', 'normal');
  doc.text('GAU-VER 01-JAN-2024', 210, 48);

  // Date and Department
  doc.line(15, 52, pageWidth - 15, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(form.date)}`, 15, 58);
  doc.line(15, 62, pageWidth - 15, 62);
  doc.text(`Department: ${form.department}`, 15, 68);
  doc.line(15, 72, pageWidth - 15, 72);

  // Table
  const tableData = items.length > 0 
    ? items.map(item => [
        item.slNo.toString(),
        item.itemCode,
        item.description,
        item.uom,
        item.qtyReturned.toString(),
        item.qtyReceived.toString(),
        item.remarks
      ])
    : Array(10).fill(['', '', '', '', '', '', '']);

  autoTable(doc, {
    startY: 74,
    head: [['SL No', 'ITEM CODE', 'DESCRIPTION', 'UOM', 'RETURNED\nQUANTITY', 'RECEIVED\nQUANTITY', 'Remarks']],
    body: tableData,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 70 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' },
      6: { cellWidth: 52 }
    },
    margin: { left: 15, right: 15 }
  });

  // Signatures
  const signatureY = 165;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Returned By', 30, signatureY);
  doc.text('Approved By', 100, signatureY);
  doc.text('ASWAQ Transaction Report Number', 160, signatureY);
  doc.text('Received By', 245, signatureY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Name & Signature', 30, signatureY + 15);
  doc.text('Name & Signature', 100, signatureY + 15);
  doc.text('Name & Signature', 245, signatureY + 15);
  
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Line Leader', 30, signatureY + 22);
  doc.text('Line Manager', 100, signatureY + 22);
  doc.text('Warehouse Incharge', 245, signatureY + 22);

  // Lines for signatures
  doc.setLineWidth(0.2);
  doc.line(25, signatureY + 12, 70, signatureY + 12);
  doc.line(95, signatureY + 12, 140, signatureY + 12);
  doc.line(155, signatureY + 12, 230, signatureY + 12);
  doc.line(240, signatureY + 12, 280, signatureY + 12);

  doc.save(`Material_Return_Slip_${docNumber}.pdf`);
};
