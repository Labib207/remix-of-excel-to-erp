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
  const key = `docNumber_pdf_${prefix}`;
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
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB');
};

const addHeader = async (doc: jsPDF, title: string, docNumber: string): Promise<void> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, 190);

  // Add logo
  try {
    const logoBase64 = await loadLogoAsBase64();
    doc.addImage(logoBase64, 'PNG', 15, 15, 50, 25);
  } catch (error) {
    console.error('Failed to load logo:', error);
    // Fallback to text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('GHOUSH', 20, 28);
  }

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const titleX = title === 'RAW MATERIAL REQUEST' ? 95 : 
                 title === 'GENERAL SUPPLIES REQUEST' ? 85 : 105;
  doc.text(title, titleX, 30);

  // Document info line
  doc.setLineWidth(0.3);
  doc.line(15, 42, pageWidth - 15, 42);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Document ID: ${docNumber}`, 15, 48);
  doc.text('Issue Number', 180, 48);
  doc.setFont('helvetica', 'normal');
  doc.text('GAU-VER 01-JAN-2024', 210, 48);
};

const addFormInfo = (doc: jsPDF, form: RequestForm): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setLineWidth(0.3);
  doc.line(15, 52, pageWidth - 15, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Date: ${formatDate(form.date)}`, 15, 58);
  doc.line(15, 62, pageWidth - 15, 62);
  doc.text(`Department: ${form.department}`, 15, 68);
  doc.line(15, 72, pageWidth - 15, 72);
};

const addSignatures = (
  doc: jsPDF, 
  type: 'raw' | 'general' | 'return'
): void => {
  const signatureY = 165;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  if (type === 'return') {
    doc.text('Returned By', 30, signatureY);
  } else {
    doc.text('Requested By', 30, signatureY);
  }
  doc.text('Approved By', 100, signatureY);
  doc.text('ASWAQ Transaction Report Number', 160, signatureY);
  if (type === 'return') {
    doc.text('Received By', 245, signatureY);
  } else {
    doc.text('Issued By', 245, signatureY);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Name & Signature', 30, signatureY + 15);
  doc.text('Name & Signature', 100, signatureY + 15);
  doc.text('Name & Signature', 245, signatureY + 15);
  
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Line Leader', 30, signatureY + 22);
  doc.text(type === 'raw' ? 'Production Manager' : 'Line Manager', 100, signatureY + 22);
  doc.text(type === 'return' ? 'Warehouse Incharge' : 'Warehouse In Charge', 245, signatureY + 22);

  // Lines for signatures
  doc.setLineWidth(0.2);
  doc.line(25, signatureY + 12, 70, signatureY + 12);
  doc.line(95, signatureY + 12, 140, signatureY + 12);
  doc.line(155, signatureY + 12, 230, signatureY + 12);
  doc.line(240, signatureY + 12, 280, signatureY + 12);
};

export const exportRawMaterialRequestPDF = async (form: RequestForm, items: RequestItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const docNumber = existingDocNumber || getNextDocNumber('RMR');
  
  await addHeader(doc, 'RAW MATERIAL REQUEST', docNumber);
  addFormInfo(doc, form);

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

  addSignatures(doc, 'raw');
  doc.save(`Raw_Material_Request_${docNumber}.pdf`);
};

export const exportGeneralSuppliesRequestPDF = async (form: RequestForm, items: RequestItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const docNumber = existingDocNumber || getNextDocNumber('GSR');
  
  await addHeader(doc, 'GENERAL SUPPLIES REQUEST', docNumber);
  addFormInfo(doc, form);

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

  addSignatures(doc, 'general');
  doc.save(`General_Supplies_Request_${docNumber}.pdf`);
};

export const exportMaterialReturnSlipPDF = async (form: RequestForm, items: ReturnItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const docNumber = existingDocNumber || getNextDocNumber('MRS');
  
  await addHeader(doc, 'MATERIAL RETURN SLIP', docNumber);
  addFormInfo(doc, form);

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

  addSignatures(doc, 'return');
  doc.save(`Material_Return_Slip_${docNumber}.pdf`);
};
