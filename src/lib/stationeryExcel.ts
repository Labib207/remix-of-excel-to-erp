import * as XLSX from 'xlsx';
import type { StationeryItem, StationeryTxn, StockRow } from '@/hooks/useStationery';

function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

function save(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('en-GB') : '');

/** Current stock summary for every stationery item. */
export function exportStationeryStockExcel(rows: StockRow[]) {
  const wb = XLSX.utils.book_new();

  const sheetRows = [
    ['GHOUSH - Stock Management'],
    ['Stationery Stock Summary'],
    [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
    [],
    ['SL No', 'Item Code', 'Description', 'UOM', 'Opening Stock', 'Total In', 'Total Used', 'Balance', 'Min Level', 'Status'],
    ...rows.map((r, i) => [
      i + 1,
      r.itemCode,
      r.description,
      r.uom,
      r.openingStock,
      r.totalIn,
      r.totalOut,
      r.balance,
      r.minStock,
      r.isLow ? 'LOW STOCK' : 'OK',
    ]),
    [],
    ['', '', 'TOTALS', '',
      rows.reduce((s, r) => s + r.openingStock, 0),
      rows.reduce((s, r) => s + r.totalIn, 0),
      rows.reduce((s, r) => s + r.totalOut, 0),
      rows.reduce((s, r) => s + r.balance, 0),
      '', `${rows.filter(r => r.isLow).length} low`,
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  setColumnWidths(ws, [7, 14, 40, 8, 14, 12, 12, 12, 11, 12]);
  XLSX.utils.book_append_sheet(wb, ws, 'Stock Summary');

  save(wb, `stationery-stock-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** Full stock in / stock out history. */
export function exportStationeryHistoryExcel(txns: StationeryTxn[], items: StationeryItem[]) {
  const itemById = new Map(items.map(i => [i.id, i]));
  const wb = XLSX.utils.book_new();

  const sorted = [...txns].sort((a, b) =>
    a.transDate === b.transDate
      ? a.createdAt.localeCompare(b.createdAt)
      : a.transDate.localeCompare(b.transDate)
  );

  const sheetRows = [
    ['GHOUSH - Stock Management'],
    ['Stationery Stock In / Out History'],
    [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
    [],
    ['SL No', 'Date', 'Item Code', 'Description', 'Type', 'Qty', 'UOM', 'Reference', 'Remarks'],
    ...sorted.map((t, i) => {
      const item = itemById.get(t.itemId);
      return [
        i + 1,
        fmtDate(t.transDate),
        item?.itemCode || '',
        item?.description || '(deleted item)',
        t.type === 'in' ? 'STOCK IN' : 'STOCK OUT',
        t.qty,
        item?.uom || '',
        t.reference,
        t.notes,
      ];
    }),
    [],
    ['', '', '', 'TOTALS', 'IN', sorted.filter(t => t.type === 'in').reduce((s, t) => s + t.qty, 0), '', '', ''],
    ['', '', '', '', 'OUT', sorted.filter(t => t.type === 'out').reduce((s, t) => s + t.qty, 0), '', '', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  setColumnWidths(ws, [7, 12, 14, 40, 11, 10, 8, 18, 30]);
  XLSX.utils.book_append_sheet(wb, ws, 'History');

  save(wb, `stationery-history-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
