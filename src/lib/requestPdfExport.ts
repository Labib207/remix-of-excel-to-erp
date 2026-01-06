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
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB');
};

export const exportRawMaterialRequestPDF = async (form: RequestForm, items: RequestItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docNumber = existingDocNumber || getNextDocNumber('RMR');
  
  // Outer border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

  // Add logo on left
  try {
    const logoBase64 = await loadLogoAsBase64();
    doc.addImage(logoBase64, 'PNG', 10, 8, 45, 22);
  } catch (error) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('GHOUSH', 15, 20);
  }

  // Title - RAW MATERIAL REQUEST (center-right area)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RAW MATERIAL REQUEST', 115, 18);
  
  // Subtitle
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('MILITARY & SAFETY UNIFORMS', 60, 25);
  doc.text('UNIFORM FACTORY', 60, 29);

  // Document ID and Issue Number line
  doc.setLineWidth(0.3);
  doc.line(10, 33, pageWidth - 10, 33);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Document ID: ${docNumber}`, 12, 39);
  doc.text('Issue Number', 180, 39);
  doc.setFont('helvetica', 'normal');
  doc.text('GAU-VER 01-JAN-2024', 210, 39);
  
  doc.line(10, 42, pageWidth - 10, 42);

  // Date row
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(form.date)}`, 12, 48);
  doc.line(10, 51, pageWidth - 10, 51);

  // Department row
  doc.text(`Department: ${form.department}`, 12, 57);
  doc.line(10, 60, pageWidth - 10, 60);

  // Table - ensure minimum 10 rows
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
  
  // Pad to minimum 10 rows
  while (tableRows.length < 10) {
    tableRows.push(['', '', '', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: 62,
    head: [['SL No', 'ITEM CODE', 'DESCRIPTION', 'UOM', 'REQUESTED\nQUANTITY', 'ISSUED\nQUANTITY', 'REMAINING\nQUANTITY', 'Remarks for Merchandize']],
    body: tableRows,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      minCellHeight: 6
    },
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 10
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 65 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 28, halign: 'center' },
      6: { cellWidth: 28, halign: 'center' },
      7: { cellWidth: 55 }
    },
    margin: { left: 10, right: 10 }
  });

  // Signature section at bottom
  const sigY = 158;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Requested By', 25, sigY);
  doc.text('Approved By', 95, sigY);
  doc.text('ASWAQ Transaction Report Number', 155, sigY);
  doc.text('Issued By', 250, sigY);

  // Signature lines
  doc.setLineWidth(0.2);
  doc.line(20, sigY + 12, 70, sigY + 12);
  doc.line(90, sigY + 12, 140, sigY + 12);
  doc.line(150, sigY + 12, 230, sigY + 12);
  doc.line(245, sigY + 12, 285, sigY + 12);

  // Labels under signature lines
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 25, sigY + 17);
  doc.text('Name & Signature', 95, sigY + 17);
  doc.text('Name & Signature', 250, sigY + 17);
  
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Line Leader', 25, sigY + 23);
  doc.text('Production Manager', 95, sigY + 23);
  doc.text('Warehouse In Charge', 250, sigY + 23);

  // Fill in form values if provided
  if (form.requestedBy) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.requestedBy, 25, sigY + 8);
  }
  if (form.approvedBy) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.approvedBy, 95, sigY + 8);
  }
  if (form.aswaqNumber) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.aswaqNumber, 155, sigY + 8);
  }
  if (form.issuedBy) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.issuedBy, 250, sigY + 8);
  }

  doc.save(`Raw_Material_Request_${docNumber}.pdf`);
};

export const exportGeneralSuppliesRequestPDF = async (form: RequestForm, items: RequestItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docNumber = existingDocNumber || getNextDocNumber('GSR');
  
  // Outer border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

  // Add logo on left
  try {
    const logoBase64 = await loadLogoAsBase64();
    doc.addImage(logoBase64, 'PNG', 10, 8, 45, 22);
  } catch (error) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('GHOUSH', 15, 20);
  }

  // Title - GENERAL SUPPLIES REQUEST
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GENERAL SUPPLIES REQUEST', 105, 18);
  
  // Subtitle
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('MILITARY & SAFETY UNIFORMS', 60, 25);
  doc.text('OF ADEEM UNIFORM FACTORY', 60, 29);

  // Document ID and Issue Number line
  doc.setLineWidth(0.3);
  doc.line(10, 33, pageWidth - 10, 33);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Document ID: ${docNumber}`, 12, 39);
  doc.text('Issue Number', 180, 39);
  doc.setFont('helvetica', 'normal');
  doc.text('GAU-VER 01-JAN-2024', 210, 39);
  
  doc.line(10, 42, pageWidth - 10, 42);

  // Date row
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(form.date)}`, 12, 48);
  doc.line(10, 51, pageWidth - 10, 51);

  // Department row
  doc.text(`Department: ${form.department}`, 12, 57);
  doc.line(10, 60, pageWidth - 10, 60);

  // Table
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
  
  while (tableRows.length < 10) {
    tableRows.push(['', '', '', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: 62,
    head: [['SL', 'ITEM CODE', 'DESCRIPTION', 'UOM', 'REQUESTED\nQUANTITY', 'ISSUED\nQUANTITY', 'REMAINING\nQUANTITY', 'Remarks for Procurement']],
    body: tableRows,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      minCellHeight: 6
    },
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 10
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 65 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 28, halign: 'center' },
      6: { cellWidth: 28, halign: 'center' },
      7: { cellWidth: 55 }
    },
    margin: { left: 10, right: 10 }
  });

  // Signature section
  const sigY = 158;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Requested By', 25, sigY);
  doc.text('Approved By', 95, sigY);
  doc.text('ASWAQ Transaction Report Number', 155, sigY);
  doc.text('Issued By', 250, sigY);

  doc.setLineWidth(0.2);
  doc.line(20, sigY + 12, 70, sigY + 12);
  doc.line(90, sigY + 12, 140, sigY + 12);
  doc.line(150, sigY + 12, 230, sigY + 12);
  doc.line(245, sigY + 12, 285, sigY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 25, sigY + 17);
  doc.text('Name & Signature', 95, sigY + 17);
  doc.text('Name & Signature', 250, sigY + 17);
  
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Line Leader', 25, sigY + 23);
  doc.text('Line Manager', 95, sigY + 23);
  doc.text('Warehouse In Charge', 250, sigY + 23);

  if (form.requestedBy) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.requestedBy, 25, sigY + 8);
  }
  if (form.approvedBy) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.approvedBy, 95, sigY + 8);
  }
  if (form.aswaqNumber) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.aswaqNumber, 155, sigY + 8);
  }
  if (form.issuedBy) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.issuedBy, 250, sigY + 8);
  }

  doc.save(`General_Supplies_Request_${docNumber}.pdf`);
};

export const exportMaterialReturnSlipPDF = async (form: RequestForm, items: ReturnItem[], existingDocNumber?: string): Promise<void> => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docNumber = existingDocNumber || getNextDocNumber('MRS');
  
  // Outer border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

  // Add logo on left
  try {
    const logoBase64 = await loadLogoAsBase64();
    doc.addImage(logoBase64, 'PNG', 10, 8, 45, 22);
  } catch (error) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('GHOUSH', 15, 20);
  }

  // Title - MATERIAL RETURN SLIP
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MATERIAL RETURN SLIP', 120, 18);
  
  // Subtitle
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('MILITARY & SAFETY UNIFORMS', 60, 25);

  // Document ID and Issue Number line
  doc.setLineWidth(0.3);
  doc.line(10, 33, pageWidth - 10, 33);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Document ID: ${docNumber}`, 12, 39);
  doc.text('Issue Number', 180, 39);
  doc.setFont('helvetica', 'normal');
  doc.text('GAU-VER 01-JAN-2024', 210, 39);
  
  doc.line(10, 42, pageWidth - 10, 42);

  // Date row
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(form.date)}`, 12, 48);
  doc.line(10, 51, pageWidth - 10, 51);

  // Department row
  doc.text(`Department: ${form.department}`, 12, 57);
  doc.line(10, 60, pageWidth - 10, 60);

  // Table
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
  
  while (tableRows.length < 10) {
    tableRows.push(['', '', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: 62,
    head: [['SL No', 'ITEM CODE', 'DESCRIPTION', 'UOM', 'QUANTITY\nRETURNED', 'QUANTITY\nRECEIVED', 'Remarks']],
    body: tableRows,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      minCellHeight: 6
    },
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 10
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 80 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 35, halign: 'center' },
      5: { cellWidth: 35, halign: 'center' },
      6: { cellWidth: 52 }
    },
    margin: { left: 10, right: 10 }
  });

  // Signature section
  const sigY = 158;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Returned By', 25, sigY);
  doc.text('Approved By', 95, sigY);
  doc.text('ASWAQ Transaction Report Number', 155, sigY);
  doc.text('Received By', 250, sigY);

  doc.setLineWidth(0.2);
  doc.line(20, sigY + 12, 70, sigY + 12);
  doc.line(90, sigY + 12, 140, sigY + 12);
  doc.line(150, sigY + 12, 230, sigY + 12);
  doc.line(245, sigY + 12, 285, sigY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Name & Signature', 25, sigY + 17);
  doc.text('Name & Signature', 95, sigY + 17);
  doc.text('Name & Signature', 250, sigY + 17);
  
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Line Leader', 25, sigY + 23);
  doc.text('Line Manager', 95, sigY + 23);
  doc.text('Warehouse Incharge', 250, sigY + 23);

  if (form.requestedBy) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.requestedBy, 25, sigY + 8);
  }
  if (form.approvedBy) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.approvedBy, 95, sigY + 8);
  }
  if (form.aswaqNumber) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.aswaqNumber, 155, sigY + 8);
  }
  if (form.issuedBy) {
    doc.setFont('helvetica', 'normal');
    doc.text(form.issuedBy, 250, sigY + 8);
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
