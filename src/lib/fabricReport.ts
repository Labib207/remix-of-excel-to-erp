import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, CutPlan, FabricCalculation } from '@/types/cutting';
import logoImage from '@/assets/logo.png';

// Conversion factor: meters to yards (exact)
export const METERS_TO_YARDS = 1.0936133;

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

const getNextDocNumber = (prefix: string): string => {
  const key = `ghoush_doc_counter_${prefix}`;
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
  const counterKey = `${key}_${yearMonth}`;
  
  let counter = parseInt(localStorage.getItem(counterKey) || '0', 10);
  counter++;
  localStorage.setItem(counterKey, counter.toString());
  
  return `${prefix}-${yearMonth}-${counter.toString().padStart(5, '0')}`;
};

export interface FabricSummary {
  type: 'TOP' | 'FUSING' | 'TAB';
  totalMeters: number;
  totalYards: number;
  wastagePercent: number;
  requestWithAllowance: number;
  requestInYards: number;
}

export const calculateFabricSummary = (
  cutPlans: CutPlan[],
  calculations: FabricCalculation[],
  orderId?: string
): FabricSummary[] => {
  // Filter by order if specified
  const filteredCutPlans = orderId 
    ? cutPlans.filter(cp => cp.orderId === orderId)
    : cutPlans;
  const filteredCalcs = orderId
    ? calculations.filter(c => c.orderId === orderId)
    : calculations;

  // Calculate TOP from cut plans
  const topTotalMeters = filteredCutPlans.reduce((sum, cp) => sum + cp.fabricUsed, 0);
  const topWastage = 1; // 1% default
  const topRequest = topTotalMeters * (1 + topWastage / 100);

  const summaries: FabricSummary[] = [
    {
      type: 'TOP',
      totalMeters: topTotalMeters,
      totalYards: topTotalMeters * METERS_TO_YARDS,
      wastagePercent: topWastage,
      requestWithAllowance: topRequest,
      requestInYards: topRequest * METERS_TO_YARDS,
    }
  ];

  // Add FUSING and TAB from fabric calculations
  ['FUSING', 'TAB'].forEach((type) => {
    const typeCalcs = filteredCalcs.filter(c => c.fabricType === type);
    if (typeCalcs.length > 0) {
      const totalMeters = typeCalcs.reduce((sum, c) => sum + c.totalMeters, 0);
      const avgWastage = typeCalcs.reduce((sum, c) => sum + c.wastagePercent, 0) / typeCalcs.length || 1;
      const request = totalMeters * (1 + avgWastage / 100);
      
      summaries.push({
        type: type as 'FUSING' | 'TAB',
        totalMeters,
        totalYards: totalMeters * METERS_TO_YARDS,
        wastagePercent: avgWastage,
        requestWithAllowance: request,
        requestInYards: request * METERS_TO_YARDS,
      });
    }
  });

  return summaries;
};

export const exportFabricRequestPDF = async (
  order: Order,
  cutPlans: CutPlan[],
  calculations: FabricCalculation[]
) => {
  const doc = new jsPDF();
  const logo = await loadLogoAsBase64();
  const docNumber = getNextDocNumber('FR');

  // Header
  if (logo) {
    doc.addImage(logo, 'PNG', 14, 8, 25, 20);
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FABRIC REQUEST REPORT', 45, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Document: ${docNumber}`, 45, 26);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 14, 18, { align: 'right' });

  // Order Details
  autoTable(doc, {
    startY: 38,
    body: [
      ['ORDER NO:', order.orderNumber, 'CUSTOMER:', order.customer],
      ['STYLE:', `${order.styleNo} - ${order.styleName}`, 'FABRIC WIDTH:', `${order.fabricWidth} cm`],
      ['TOTAL QTY:', order.totalQty.toLocaleString() + ' pcs', 'SHADE:', order.shade],
    ],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 50 },
    },
  });

  // Calculate summaries
  const summaries = calculateFabricSummary(cutPlans, calculations, order.id);

  // Fabric Summary Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FABRIC REQUIREMENT SUMMARY', 14, doc.lastAutoTable.finalY + 15);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [['FABRIC TYPE', 'TOTAL (m)', 'TOTAL (yd)', 'WASTAGE %', 'REQUEST (m)', 'REQUEST (yd)']],
    body: summaries.map(s => [
      s.type,
      s.totalMeters.toFixed(2),
      s.totalYards.toFixed(2),
      `${s.wastagePercent}%`,
      s.requestWithAllowance.toFixed(2),
      s.requestInYards.toFixed(2),
    ]),
    foot: [[
      'TOTAL',
      summaries.reduce((sum, s) => sum + s.totalMeters, 0).toFixed(2),
      summaries.reduce((sum, s) => sum + s.totalYards, 0).toFixed(2),
      '-',
      summaries.reduce((sum, s) => sum + s.requestWithAllowance, 0).toFixed(2),
      summaries.reduce((sum, s) => sum + s.requestInYards, 0).toFixed(2),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [229, 231, 235], fontStyle: 'bold' },
    styles: { fontSize: 10, halign: 'center' },
  });

  // Cut Plans Detail
  const orderCutPlans = cutPlans.filter(cp => cp.orderId === order.id);
  if (orderCutPlans.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CUT PLANS DETAIL', 14, doc.lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['CUT #', 'SHADE', 'PLIES', 'MARKER (m)', 'LAY LENGTH (m)', 'FABRIC USED (m)', 'TOTAL QTY']],
      body: orderCutPlans.map(cp => [
        cp.cutNo.toString(),
        cp.shade,
        cp.plies.toString(),
        cp.markerLength.toFixed(2),
        cp.layLength.toFixed(4),
        cp.fabricUsed.toFixed(2),
        cp.totalQty.toString(),
      ]),
      foot: [[
        'TOTAL',
        '-',
        orderCutPlans.reduce((sum, cp) => sum + cp.plies, 0).toString(),
        '-',
        '-',
        orderCutPlans.reduce((sum, cp) => sum + cp.fabricUsed, 0).toFixed(2),
        orderCutPlans.reduce((sum, cp) => sum + cp.totalQty, 0).toString(),
      ]],
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold', halign: 'center' },
      footStyles: { fillColor: [229, 231, 235], fontStyle: 'bold' },
      styles: { fontSize: 9, halign: 'center' },
    });
  }

  // Conversion Note
  const noteY = doc.lastAutoTable.finalY + 15;
  doc.setFillColor(240, 249, 255);
  doc.rect(14, noteY, doc.internal.pageSize.width - 28, 20, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Conversion: 1 meter = 1.0936133 yards', 20, noteY + 8);
  doc.text('Wastage allowance: 1% (default) added to base requirement', 20, noteY + 14);

  // Signature Section
  const sigY = noteY + 30;
  autoTable(doc, {
    startY: sigY,
    body: [
      ['Prepared By:', '_______________', 'Approved By:', '_______________'],
      ['Date:', '_______________', 'Date:', '_______________'],
    ],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      2: { fontStyle: 'bold', cellWidth: 30 },
    },
  });

  // Footer
  doc.setFontSize(8);
  doc.text('GHOUSH - Adeem Uniform Factory', 14, doc.internal.pageSize.height - 10);
  doc.text(docNumber, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });

  doc.save(`FabricRequest_${order.orderNumber}_${docNumber}.pdf`);
};
