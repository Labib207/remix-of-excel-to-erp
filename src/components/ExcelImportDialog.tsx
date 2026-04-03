import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDbOrders } from '@/hooks/useDbOrders';
import { useDbCutPlans } from '@/hooks/useDbCutPlans';
import { cloudInsert, generateId } from '@/lib/cloudDb';
import { LayRecord } from '@/types/cutting';

interface ExcelRow {
  [key: string]: string | number;
}

const METERS_TO_YARDS = 1.0936133;

export const ExcelImportDialog = () => {
  const { data: orders = [] } = useDbOrders();
  const { data: cutPlans = [] } = useDbCutPlans();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [previewData, setPreviewData] = useState<ExcelRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [selectedCutPlan, setSelectedCutPlan] = useState('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

  const orderCutPlans = cutPlans.filter(cp => cp.orderId === selectedOrder);

  const resetState = () => {
    setFileName('');
    setSheetNames([]);
    setSelectedSheet('');
    setPreviewData([]);
    setHeaders([]);
    setWorkbook(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        
        // Auto-select first sheet
        if (wb.SheetNames.length > 0) {
          loadSheet(wb, wb.SheetNames[0]);
        }
      } catch (error) {
        toast({
          title: 'Error reading file',
          description: 'Please upload a valid Excel file',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    setSelectedSheet(sheetName);
    const sheet = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' });
    
    if (jsonData.length > 0) {
      setHeaders(Object.keys(jsonData[0]));
      setPreviewData(jsonData.slice(0, 10)); // Preview first 10 rows
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (workbook) {
      loadSheet(workbook, sheetName);
    }
  };

  const importLayRecords = async () => {
    if (!selectedCutPlan || !workbook || !selectedSheet) {
      toast({
        title: 'Please select a cut plan',
        description: 'Select an order and cut plan to import lay records',
        variant: 'destructive',
      });
      return;
    }

    const sheet = workbook.Sheets[selectedSheet];
    const allData = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' });
    const cp = cutPlans.find(c => c.id === selectedCutPlan);
    
    if (!cp) return;

    let importedCount = 0;

    allData.forEach((row, index) => {
      // Try to map common column names to our fields
      const rollNo = String(row['Roll No'] || row['ROLL NO'] || row['RollNo'] || row['roll_no'] || `R${index + 1}`);
      const systemRollLength = Number(row['System Length'] || row['Sys Length'] || row['System Roll Length'] || row['system_length'] || 0);
      const actualLays = Number(row['Actual Lays'] || row['Act Lays'] || row['Lays'] || row['actual_lays'] || 0);
      const markerLength = Number(row['Marker Length'] || row['Marker L'] || row['marker_length'] || cp.markerLength);
      const overlapYards = Number(row['Overlap'] || row['overlap'] || row['Overlap Yards'] || 0);
      const damage = Number(row['Damage'] || row['damage'] || 0);
      const rollShortageIncrease = Number(row['Shortage'] || row['Roll Shortage'] || row['shortage'] || 0);
      const rollEnd = Number(row['Roll End'] || row['roll_end'] || 0);
      const bigEnd = Number(row['Big End'] || row['big_end'] || 0);
      const unusableRollEnd = Number(row['Unusable'] || row['Unusable Roll End'] || 0);
      const remarks = String(row['Remarks'] || row['remarks'] || row['Notes'] || '');

      // Calculate derived values
      const layedMts = actualLays * markerLength;
      const totalUsage = layedMts + overlapYards;

      // Only import if we have meaningful data
      if (actualLays > 0 || systemRollLength > 0) {
        const layRecord: LayRecord = {
          id: `lay-import-${Date.now()}-${index}`,
          cutPlanId: selectedCutPlan,
          cutNo: cp.cutNo,
          shade: cp.shade,
          rollNo,
          systemRollLength,
          actualLays,
          markerLength,
          layedMts,
          overlapYards,
          rollShortageIncrease,
          rollEndNextPly1st: 0,
          damage,
          rollEndNextPly2nd: 0,
          recutReturn: 0,
          unusableRollEnd,
          totalUsage,
          rollEnd,
          bigEnd,
          remarks,
        };

        await cloudInsert('lay_records', {
          id: generateId(),
          cut_plan_id: selectedCutPlan,
          cut_no: cp.cutNo,
          shade: cp.shade,
          roll_no: rollNo,
          system_roll_length: systemRollLength,
          actual_lays: actualLays,
          marker_length: markerLength,
          layed_mts: layedMts,
          overlap_yards: overlapYards,
          roll_shortage_increase: rollShortageIncrease,
          roll_end_next_ply_1st: 0,
          damage,
          roll_end_next_ply_2nd: 0,
          recut_return: 0,
          unusable_roll_end: unusableRollEnd,
          total_usage: totalUsage,
          roll_end: rollEnd,
          big_end: bigEnd,
          remarks,
        });
        importedCount++;
      }
    });

    toast({
      title: 'Import successful!',
      description: `Imported ${importedCount} lay records from Excel`,
    });

    setIsOpen(false);
    resetState();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Lay Records from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload Excel File</Label>
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              {fileName ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{fileName}</p>
                    <p className="text-sm text-muted-foreground">Click to change file</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">Click to upload Excel file</p>
                  <p className="text-sm text-muted-foreground">Supports .xlsx, .xls, .csv</p>
                </div>
              )}
            </div>
          </div>

          {/* Sheet & Order Selection */}
          {sheetNames.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Select Sheet</Label>
                <Select value={selectedSheet} onValueChange={handleSheetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Order</Label>
                <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.orderNumber} - {o.styleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Cut Plan</Label>
                <Select value={selectedCutPlan} onValueChange={setSelectedCutPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cut plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderCutPlans.map((cp) => (
                      <SelectItem key={cp.id} value={cp.id}>
                        Cut #{cp.cutNo} - {cp.plies} plies
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Column Mapping Info */}
          {headers.length > 0 && (
            <div className="space-y-2">
              <Label>Detected Columns</Label>
              <div className="flex flex-wrap gap-2">
                {headers.map((h) => (
                  <Badge key={h} variant="secondary">{h}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Auto-maps columns like "Roll No", "Actual Lays", "Marker Length", "Overlap", "Damage", etc.
              </p>
            </div>
          )}

          {/* Data Preview */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>Data Preview (first 10 rows)</Label>
              <div className="border rounded-lg overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {headers.map((h) => (
                        <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => (
                      <TableRow key={i}>
                        {headers.map((h) => (
                          <TableCell key={h} className="text-xs font-mono whitespace-nowrap">
                            {String(row[h])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Import Button */}
          {previewData.length > 0 && (
            <Button 
              onClick={importLayRecords} 
              className="w-full gradient-primary text-primary-foreground"
              disabled={!selectedCutPlan}
            >
              <Check className="mr-2 h-4 w-4" />
              Import Lay Records
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
