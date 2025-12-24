import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CutPlan, LaySheet, Bundle, BundleGuide, Order, SIZES } from '@/types/cutting';
import logoImage from '@/assets/logo.png';

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// Cache for logo base64
let logoBase64Cache: string | null = null;

const loadLogoAsBase64 = (): Promise<string> => {
  return new Promise((resolve) => {
    if (logoBase64Cache) {
      resolve(logoBase64Cache);
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      logoBase64Cache = canvas.toDataURL('image/png');
      resolve(logoBase64Cache);
    };
    img.onerror = () => resolve('');
    img.src = logoImage;
  });
};

const addHeader = async (doc: jsPDF, title: string, subtitle?: string) => {
  const logo = await loadLogoAsBase64();
  
  // Add logo
  if (logo) {
    doc.addImage(logo, 'PNG', 14, 8, 25, 20);
  }
  
  // Title next to logo
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 45, 18);
  
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 45, 25);
  }
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.width - 14, 15, { align: 'right' });
  
  // Company name
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('GHOUSH - Military & Safety Uniforms', doc.internal.pageSize.width - 14, 20, { align: 'right' });
  doc.setTextColor(0, 0, 0);
};

const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNumber} of ${totalPages}`, doc.internal.pageSize.width / 2, pageHeight - 10, { align: 'center' });
  doc.text('GHOUSH - Adeem Uniform Factory', 14, pageHeight - 10);
};

export const exportCutPlanPDF = async (cutPlan: CutPlan, order: Order) => {
  const doc = new jsPDF();
  
  await addHeader(doc, `Cut Plan #${cutPlan.cutNo}`, `Order: ${order.orderNumber} | Style: ${order.styleNo}`);
  
  // Details table
  autoTable(doc, {
    startY: 35,
    head: [['Field', 'Value', 'Field', 'Value']],
    body: [
      ['Order No', order.orderNumber, 'Cut No', cutPlan.cutNo.toString()],
      ['Customer', order.customer, 'Shade', cutPlan.shade],
      ['Style', `${order.styleNo} - ${order.styleName}`, 'Date', cutPlan.date],
      ['Plies', cutPlan.plies.toString(), 'Status', cutPlan.status],
      ['Marker Length', `${cutPlan.markerLength} m`, 'Lay Length', `${cutPlan.layLength} m`],
      ['Fabric Width', `${order.fabricWidth} cm`, 'Fabric Used', `${cutPlan.fabricUsed.toFixed(2)} m`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    styles: { fontSize: 9 },
  });
  
  // Size quantities table
  const sizesWithQty = SIZES.filter(s => cutPlan.sizes[s.code] > 0);
  const sizeHeaders = sizesWithQty.map(s => s.code);
  const sizeValues = sizesWithQty.map(s => cutPlan.sizes[s.code].toString());
  
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Size Quantities', ...sizeHeaders, 'TOTAL']],
    body: [['Qty', ...sizeValues, cutPlan.totalQty.toString()]],
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold' },
    styles: { fontSize: 9, halign: 'center' },
  });
  
  // Summary box
  const summaryY = doc.lastAutoTable.finalY + 15;
  doc.setFillColor(240, 249, 255);
  doc.rect(14, summaryY, doc.internal.pageSize.width - 28, 25, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 20, summaryY + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Quantity: ${cutPlan.totalQty} pcs`, 20, summaryY + 16);
  doc.text(`Unit Consumption: ${(cutPlan.fabricUsed / cutPlan.totalQty).toFixed(4)} m/pc`, 100, summaryY + 16);
  
  addFooter(doc, 1, 1);
  doc.save(`CutPlan_${cutPlan.cutNo}_${order.orderNumber}.pdf`);
};

export const exportLaySheetPDF = async (laySheet: LaySheet, cutPlan: CutPlan, order: Order) => {
  const doc = new jsPDF();
  
  await addHeader(doc, `Lay Sheet #${laySheet.layNo}`, `Cut Plan #${cutPlan.cutNo} | Order: ${order.orderNumber}`);
  
  autoTable(doc, {
    startY: 35,
    head: [['Field', 'Value', 'Field', 'Value']],
    body: [
      ['Lay No', laySheet.layNo.toString(), 'Cut No', cutPlan.cutNo.toString()],
      ['Order No', order.orderNumber, 'Style', order.styleNo],
      ['Customer', order.customer, 'Shade', cutPlan.shade],
      ['No. of Plies', laySheet.plies.toString(), 'Lay Length', `${laySheet.layLength} m`],
      ['Fabric Roll', laySheet.fabricRoll || '-', 'Fabric Width', `${order.fabricWidth} cm`],
      ['Operator', laySheet.operator || '-', 'Time', laySheet.startTime ? `${laySheet.startTime} - ${laySheet.endTime || '...'}` : '-'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    styles: { fontSize: 10 },
  });
  
  // Size quantities from cut plan
  const sizesWithQty = SIZES.filter(s => cutPlan.sizes[s.code] > 0);
  
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Size', 'Quantity per Ply', 'Total (× Plies)']],
    body: sizesWithQty.map(s => [
      s.code,
      '1',
      (cutPlan.sizes[s.code]).toString()
    ]),
    foot: [['TOTAL', '-', cutPlan.totalQty.toString()]],
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold' },
    footStyles: { fillColor: [229, 231, 235], fontStyle: 'bold' },
    styles: { fontSize: 9, halign: 'center' },
  });
  
  // Fabric calculation
  const fabricTotal = laySheet.plies * laySheet.layLength;
  const summaryY = doc.lastAutoTable.finalY + 15;
  doc.setFillColor(240, 249, 255);
  doc.rect(14, summaryY, doc.internal.pageSize.width - 28, 20, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Fabric Required:', 20, summaryY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${laySheet.plies} plies × ${laySheet.layLength}m = ${fabricTotal.toFixed(2)} meters`, 70, summaryY + 12);
  
  addFooter(doc, 1, 1);
  doc.save(`LaySheet_${laySheet.layNo}_Cut${cutPlan.cutNo}.pdf`);
};

export const exportBundleGuidePDF = async (guides: BundleGuide[], cutPlan: CutPlan, order: Order) => {
  const doc = new jsPDF();
  
  await addHeader(doc, `Bundle Guide - Cut #${cutPlan.cutNo}`, `Order: ${order.orderNumber} | Style: ${order.styleNo}`);
  
  autoTable(doc, {
    startY: 35,
    head: [['Order', 'Style', 'Shade', 'Cut No', 'Total Qty']],
    body: [[order.orderNumber, order.styleNo, cutPlan.shade, cutPlan.cutNo.toString(), cutPlan.totalQty.toString()]],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    styles: { fontSize: 9, halign: 'center' },
  });
  
  // Bundle guide table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Size', 'Total Qty', 'Bundle Size', 'Full Bundles', 'Remainder', 'Total Bundles']],
    body: guides.map(g => [
      g.size,
      g.totalQty.toString(),
      g.bundleSize.toString(),
      Math.floor(g.totalQty / g.bundleSize).toString(),
      g.remainderQty.toString(),
      g.bundles.toString()
    ]),
    foot: [[
      'TOTAL',
      guides.reduce((sum, g) => sum + g.totalQty, 0).toString(),
      '-',
      guides.reduce((sum, g) => sum + Math.floor(g.totalQty / g.bundleSize), 0).toString(),
      '-',
      guides.reduce((sum, g) => sum + g.bundles, 0).toString()
    ]],
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold' },
    footStyles: { fillColor: [229, 231, 235], fontStyle: 'bold' },
    styles: { fontSize: 9, halign: 'center' },
  });
  
  addFooter(doc, 1, 1);
  doc.save(`BundleGuide_Cut${cutPlan.cutNo}_${order.orderNumber}.pdf`);
};

export const exportBundleTagsPDF = async (bundles: Bundle[], cutPlan: CutPlan, order: Order) => {
  const doc = new jsPDF();
  const logo = await loadLogoAsBase64();
  
  // Tags layout: 2 columns, 4 rows per page = 8 tags per page
  const tagWidth = 90;
  const tagHeight = 65;
  const marginX = 15;
  const marginY = 15;
  const gapX = 5;
  const gapY = 5;
  
  let currentPage = 1;
  const totalPages = Math.ceil(bundles.length / 8);
  
  bundles.forEach((bundle, index) => {
    if (index > 0 && index % 8 === 0) {
      addFooter(doc, currentPage, totalPages);
      doc.addPage();
      currentPage++;
    }
    
    const positionOnPage = index % 8;
    const col = positionOnPage % 2;
    const row = Math.floor(positionOnPage / 2);
    
    const x = marginX + col * (tagWidth + gapX);
    const y = marginY + row * (tagHeight + gapY);
    
    // Tag border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(x, y, tagWidth, tagHeight);
    
    // Header bar with logo
    doc.setFillColor(59, 130, 246);
    doc.rect(x, y, tagWidth, 14, 'F');
    
    // Add small logo in header
    if (logo) {
      doc.addImage(logo, 'PNG', x + 2, y + 2, 10, 10);
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`BUNDLE #${bundle.bundleNo}`, x + tagWidth / 2 + 5, y + 9, { align: 'center' });
    
    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    const contentY = y + 20;
    const lineHeight = 7;
    
    doc.text(`Order: ${order.orderNumber}`, x + 4, contentY);
    doc.text(`Cut: ${bundle.cutNo}`, x + tagWidth - 4, contentY, { align: 'right' });
    
    doc.text(`Style: ${order.styleNo}`, x + 4, contentY + lineHeight);
    doc.text(`Shade: ${bundle.shade}`, x + tagWidth - 4, contentY + lineHeight, { align: 'right' });
    
    // Size - large and bold
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(bundle.size, x + tagWidth / 2, contentY + lineHeight * 2.5, { align: 'center' });
    
    // Part and quantity
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Part: ${bundle.part}`, x + 4, contentY + lineHeight * 3.5);
    doc.text(`Qty: ${bundle.quantity}`, x + tagWidth - 4, contentY + lineHeight * 3.5, { align: 'right' });
    
    // Ply range and Serial range
    doc.setFontSize(8);
    doc.text(`Ply: ${bundle.plyStart || 1}-${bundle.plyEnd || bundle.quantity}`, x + 4, contentY + lineHeight * 4.5);
    doc.text(`S/N: ${bundle.startNo}-${bundle.endNo}`, x + tagWidth - 4, contentY + lineHeight * 4.5, { align: 'right' });
  });
  
  addFooter(doc, currentPage, totalPages);
  doc.save(`BundleTags_Cut${cutPlan.cutNo}_${order.orderNumber}.pdf`);
};

export const exportAllBundleTagsByPart = async (bundles: Bundle[], cutPlan: CutPlan, order: Order) => {
  const logo = await loadLogoAsBase64();
  
  // Group bundles by part
  const bundlesByPart = bundles.reduce((acc, bundle) => {
    if (!acc[bundle.part]) acc[bundle.part] = [];
    acc[bundle.part].push(bundle);
    return acc;
  }, {} as Record<string, Bundle[]>);
  
  // Export each part separately
  Object.entries(bundlesByPart).forEach(([part, partBundles]) => {
    const doc = new jsPDF();
    const tagWidth = 90;
    const tagHeight = 65;
    const marginX = 15;
    const marginY = 15;
    const gapX = 5;
    const gapY = 5;
    
    let currentPage = 1;
    const totalPages = Math.ceil(partBundles.length / 8);
    
    // Add title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Part: ${part}`, 14, 10);
    
    partBundles.forEach((bundle, index) => {
      if (index > 0 && index % 8 === 0) {
        addFooter(doc, currentPage, totalPages);
        doc.addPage();
        currentPage++;
      }
      
      const positionOnPage = index % 8;
      const col = positionOnPage % 2;
      const row = Math.floor(positionOnPage / 2);
      
      const x = marginX + col * (tagWidth + gapX);
      const y = marginY + row * (tagHeight + gapY);
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(x, y, tagWidth, tagHeight);
      
      // Header with logo
      doc.setFillColor(59, 130, 246);
      doc.rect(x, y, tagWidth, 14, 'F');
      
      if (logo) {
        doc.addImage(logo, 'PNG', x + 2, y + 2, 10, 10);
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`BUNDLE #${bundle.bundleNo}`, x + tagWidth / 2 + 5, y + 9, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      const contentY = y + 20;
      const lineHeight = 7;
      
      doc.text(`Order: ${order.orderNumber}`, x + 4, contentY);
      doc.text(`Cut: ${bundle.cutNo}`, x + tagWidth - 4, contentY, { align: 'right' });
      
      doc.text(`Style: ${order.styleNo}`, x + 4, contentY + lineHeight);
      doc.text(`Shade: ${bundle.shade}`, x + tagWidth - 4, contentY + lineHeight, { align: 'right' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(bundle.size, x + tagWidth / 2, contentY + lineHeight * 2.5, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Part: ${bundle.part}`, x + 4, contentY + lineHeight * 3.5);
      doc.text(`Qty: ${bundle.quantity}`, x + tagWidth - 4, contentY + lineHeight * 3.5, { align: 'right' });
      
      doc.setFontSize(8);
      doc.text(`Ply: ${bundle.plyStart || 1}-${bundle.plyEnd || bundle.quantity}`, x + 4, contentY + lineHeight * 4.5);
      doc.text(`S/N: ${bundle.startNo}-${bundle.endNo}`, x + tagWidth - 4, contentY + lineHeight * 4.5, { align: 'right' });
    });
    
    addFooter(doc, currentPage, totalPages);
    doc.save(`BundleTags_${part}_Cut${cutPlan.cutNo}.pdf`);
  });
};
