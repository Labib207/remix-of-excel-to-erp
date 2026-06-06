import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, Upload, FileSpreadsheet, ClipboardPaste } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CatalogItem, normalizeText } from '@/hooks/useMaterialCatalog';

interface ParsedRow {
  rowNo: number;
  description: string;
  itemCode: string;
  uom: string;
  status: 'ready' | 'duplicate' | 'invalid';
  reason?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: CatalogItem[];
}

const HEADER_KEYS = ['description', 'item code', 'itemcode', 'uom', 'unit'];

function isHeaderRow(cells: string[]): boolean {
  const joined = cells.map(c => (c || '').toString().toLowerCase()).join('|');
  return HEADER_KEYS.some(k => joined.includes(k));
}

function parseText(text: string): { description: string; itemCode: string; uom: string }[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    const parts = line.includes('\t') ? line.split('\t') : line.split(',');
    const cells = parts.map(p => p.trim());
    return {
      description: cells[0] || '',
      itemCode: cells[1] || '',
      uom: cells[2] || '',
    };
  });
}

export function BulkAddItemsDialog({ open, onOpenChange, existing }: Props) {
  const qc = useQueryClient();
  const [pasteText, setPasteText] = useState('');
  const [rawRows, setRawRows] = useState<{ description: string; itemCode: string; uom: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const existingDescSet = useMemo(
    () => new Set(existing.map(i => normalizeText(i.description).toLowerCase())),
    [existing],
  );

  const parsed: ParsedRow[] = useMemo(() => {
    const seenInBatch = new Set<string>();
    return rawRows.map((r, i) => {
      const description = normalizeText(r.description);
      const itemCode = normalizeText(r.itemCode);
      const uom = normalizeText(r.uom) || 'pcs';
      const rowNo = i + 1;
      if (!description) {
        return { rowNo, description, itemCode, uom, status: 'invalid', reason: 'Missing description' };
      }
      const key = description.toLowerCase();
      if (existingDescSet.has(key)) {
        return { rowNo, description, itemCode, uom, status: 'duplicate', reason: 'Already in catalog' };
      }
      if (seenInBatch.has(key)) {
        return { rowNo, description, itemCode, uom, status: 'duplicate', reason: 'Duplicate in this batch' };
      }
      seenInBatch.add(key);
      return { rowNo, description, itemCode, uom, status: 'ready' };
    });
  }, [rawRows, existingDescSet]);

  const counts = useMemo(() => ({
    ready: parsed.filter(p => p.status === 'ready').length,
    duplicate: parsed.filter(p => p.status === 'duplicate').length,
    invalid: parsed.filter(p => p.status === 'invalid').length,
  }), [parsed]);

  const handlePastePreview = () => {
    const rows = parseText(pasteText);
    // strip header row if detected
    if (rows.length && isHeaderRow([rows[0].description, rows[0].itemCode, rows[0].uom])) {
      rows.shift();
    }
    setRawRows(rows);
  };

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    let dataRows = aoa;
    if (dataRows.length && isHeaderRow(dataRows[0].map(c => String(c)))) {
      dataRows = dataRows.slice(1);
    }
    const rows = dataRows
      .map(r => ({
        description: String(r[0] ?? '').trim(),
        itemCode: String(r[1] ?? '').trim(),
        uom: String(r[2] ?? '').trim(),
      }))
      .filter(r => r.description || r.itemCode);
    setRawRows(rows);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Description', 'Item Code', 'UOM'],
      ['Button 4-Hole 20L', 'BTN-001', 'pcs'],
      ['Polyester Thread Black', 'THR-BLK', 'cone'],
    ]);
    ws['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Items');
    XLSX.writeFile(wb, 'item-catalog-template.xlsx');
  };

  const runImport = async () => {
    const ready = parsed.filter(p => p.status === 'ready');
    if (ready.length === 0) {
      toast.error('Nothing to import');
      return;
    }
    setImporting(true);
    setProgress({ done: 0, total: ready.length });
    let added = 0;
    let failed = 0;
    // Sequential async processing (project rule)
    for (let i = 0; i < ready.length; i++) {
      const r = ready[i];
      try {
        const { error } = await supabase.from('material_catalog').insert({
          description: r.description,
          item_code: r.itemCode || r.description.slice(0, 20).toUpperCase(),
          uom: r.uom || 'pcs',
        });
        if (error) throw error;
        added++;
      } catch (e) {
        failed++;
      }
      setProgress({ done: i + 1, total: ready.length });
    }
    setImporting(false);
    qc.invalidateQueries({ queryKey: ['material_catalog'] });
    const skipped = counts.duplicate + counts.invalid;
    toast.success(
      `Added ${added} item${added === 1 ? '' : 's'}` +
      (skipped ? ` · Skipped ${skipped}` : '') +
      (failed ? ` · Failed ${failed}` : ''),
    );
    setPasteText('');
    setRawRows([]);
    onOpenChange(false);
  };

  const reset = () => {
    setPasteText('');
    setRawRows([]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add Items</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="paste" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste" className="gap-2">
              <ClipboardPaste className="h-4 w-4" /> Paste from Excel
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Upload .xlsx / .csv
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <Label>Paste rows from Excel (Description, Item Code, UOM)</Label>
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1">
                <Download className="h-3 w-3" /> Template
              </Button>
            </div>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'Button 4-Hole 20L\tBTN-001\tpcs\nPolyester Thread Black\tTHR-BLK\tcone'}
              className="font-mono text-xs h-40"
            />
            <Button onClick={handlePastePreview} disabled={!pasteText.trim()} className="w-full">
              Preview Rows
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <Label>Upload Excel or CSV (first sheet, columns: Description, Item Code, UOM)</Label>
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1">
                <Download className="h-3 w-3" /> Template
              </Button>
            </div>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/50">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to select .xlsx or .csv file</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
            </label>
          </TabsContent>
        </Tabs>

        {parsed.length > 0 && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="default">{counts.ready} ready</Badge>
              {counts.duplicate > 0 && <Badge variant="secondary">{counts.duplicate} duplicate</Badge>}
              {counts.invalid > 0 && <Badge variant="destructive">{counts.invalid} invalid</Badge>}
            </div>
            <div className="rounded-md border max-h-72 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-32">Item Code</TableHead>
                    <TableHead className="w-20">UOM</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.map((r) => (
                    <TableRow key={r.rowNo}>
                      <TableCell className="px-3 py-2">{r.rowNo}</TableCell>
                      <TableCell className="px-3 py-2">{r.description || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="px-3 py-2 text-muted-foreground">{r.itemCode || 'auto'}</TableCell>
                      <TableCell className="px-3 py-2">{r.uom}</TableCell>
                      <TableCell className="px-3 py-2">
                        {r.status === 'ready' && <Badge variant="default">Ready</Badge>}
                        {r.status === 'duplicate' && <Badge variant="secondary" title={r.reason}>Duplicate</Badge>}
                        {r.status === 'invalid' && <Badge variant="destructive" title={r.reason}>Invalid</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-4">
          <div className="text-sm text-muted-foreground">
            {importing && `Importing ${progress.done} / ${progress.total}…`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={runImport} disabled={importing || counts.ready === 0}>
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Import {counts.ready} item{counts.ready === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
