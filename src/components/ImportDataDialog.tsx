import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCuttingStore } from '@/store/cuttingStore';
import { Order, SIZES } from '@/types/cutting';

interface ImportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Example JSON structure for user reference
const exampleJson = `{
  "order": {
    "client": "ROYAL SAUDI GROUND FORCE",
    "style": "BDU NO4(B)",
    "width_cm": 145,
    "total_qty": 3000,
    "sizes_qty": {
      "SS": 76, "SR": 87, "SL": 92,
      "MS": 303, "MR": 315, "ML": 316,
      "LS": 318, "LR": 321, "LL": 327,
      "XLS": 207, "XLR": 207, "XLL": 209,
      "XXLS": 79, "XXLR": 76, "XXLL": 67
    }
  },
  "fabric": {
    "top_total_m": 6426.26,
    "top_request_m": 6566.96,
    "fusing_total_m": 579.77
  }
}`;

export const ImportDataDialog = ({ open, onOpenChange }: ImportDataDialogProps) => {
  const { toast } = useToast();
  const { addOrder, addFabricCalculation } = useCuttingStore();
  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const validateAndParseJson = (input: string) => {
    try {
      const data = JSON.parse(input);
      
      // Validate required fields
      if (!data.order) {
        throw new Error('Missing "order" object in JSON');
      }
      if (!data.order.client) {
        throw new Error('Missing "client" in order');
      }
      if (!data.order.style) {
        throw new Error('Missing "style" in order');
      }
      if (!data.order.sizes_qty || Object.keys(data.order.sizes_qty).length === 0) {
        throw new Error('Missing or empty "sizes_qty" in order');
      }

      return data;
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error('Invalid JSON format. Please check your syntax.');
      }
      throw e;
    }
  };

  const handleImportJson = () => {
    try {
      setImportStatus('idle');
      setErrorMessage('');

      const data = validateAndParseJson(jsonInput);

      // Calculate total from sizes
      const sizesQty = data.order.sizes_qty;
      const totalQty = Object.values(sizesQty).reduce((sum: number, val) => sum + (val as number), 0);

      // Create order
      const newOrder: Order = {
        id: `order-${Date.now()}`,
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        customer: data.order.client,
        styleNo: data.order.style,
        styleName: data.order.style_name || data.order.style,
        shade: data.order.shade || 'X',
        totalQty: data.order.total_qty || totalQty,
        sizeQuantities: sizesQty,
        fabricWidth: data.order.width_cm || 145,
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: data.order.delivery_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
      };

      addOrder(newOrder);

      // If fabric data is provided, create fabric calculations
      if (data.fabric) {
        const METERS_TO_YARDS = 1.0936133;

        if (data.fabric.top_total_m) {
          addFabricCalculation({
            id: `fc-top-${Date.now()}`,
            orderId: newOrder.id,
            fabricType: 'TOP',
            totalMeters: data.fabric.top_total_m,
            totalYards: data.fabric.top_total_m * METERS_TO_YARDS,
            wastagePercent: 1,
            requestWithAllowance: data.fabric.top_request_m || data.fabric.top_total_m * 1.01,
            receivedMeters: 0,
            usedMeters: 0,
            balance: 0,
            remarks: 'Imported from JSON',
          });
        }

        if (data.fabric.fusing_total_m) {
          addFabricCalculation({
            id: `fc-fusing-${Date.now()}`,
            orderId: newOrder.id,
            fabricType: 'FUSING',
            totalMeters: data.fabric.fusing_total_m,
            totalYards: data.fabric.fusing_total_m * METERS_TO_YARDS,
            wastagePercent: 1,
            requestWithAllowance: data.fabric.fusing_total_m * 1.01,
            receivedMeters: 0,
            usedMeters: 0,
            balance: 0,
            remarks: 'Imported from JSON',
          });
        }
      }

      setImportStatus('success');
      toast({ title: 'Data imported successfully!' });
      
      // Clear and close after success
      setTimeout(() => {
        setJsonInput('');
        setImportStatus('idle');
        onOpenChange(false);
      }, 1500);

    } catch (error) {
      setImportStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Import failed');
      toast({ title: 'Import failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const loadExample = () => {
    setJsonInput(exampleJson);
    setImportStatus('idle');
    setErrorMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Data
          </DialogTitle>
          <DialogDescription>
            Import order details, size ratios, and fabric data from JSON or Excel format.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="json" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="json" className="flex gap-2">
              <FileJson className="h-4 w-4" />
              JSON Import
            </TabsTrigger>
            <TabsTrigger value="excel" className="flex gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Paste JSON Data</Label>
                <Button variant="outline" size="sm" onClick={loadExample}>
                  Load Example
                </Button>
              </div>
              <Textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setImportStatus('idle');
                  setErrorMessage('');
                }}
                placeholder="Paste your JSON data here..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            {/* Status Messages */}
            {importStatus === 'error' && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                    <div>
                      <p className="font-medium text-destructive">Import Error</p>
                      <p className="text-sm text-muted-foreground">{errorMessage}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {importStatus === 'success' && (
              <Card className="border-success/50 bg-success/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    <div>
                      <p className="font-medium text-success">Import Successful!</p>
                      <p className="text-sm text-muted-foreground">Order and fabric data have been imported.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Example Format Card */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">Expected JSON Format:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <code className="bg-background px-1 rounded">order.client</code> - Customer name</li>
                  <li>• <code className="bg-background px-1 rounded">order.style</code> - Style number</li>
                  <li>• <code className="bg-background px-1 rounded">order.width_cm</code> - Fabric width (default: 145)</li>
                  <li>• <code className="bg-background px-1 rounded">order.sizes_qty</code> - Object with size codes and quantities</li>
                  <li>• <code className="bg-background px-1 rounded">fabric.top_total_m</code> - Total TOP fabric in meters (optional)</li>
                  <li>• <code className="bg-background px-1 rounded">fabric.fusing_total_m</code> - Total FUSING fabric in meters (optional)</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="excel" className="space-y-4">
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="pt-6 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium mb-2">Excel Import Coming Soon</p>
                <p className="text-sm text-muted-foreground mb-4">
                  For now, please use JSON import. Convert your Excel data to JSON format.
                </p>
                <div className="text-left bg-background p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">How to convert Excel to JSON:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Open your Excel file</li>
                    <li>Use online converter (e.g., convertcsv.com)</li>
                    <li>Or export as CSV then convert to JSON</li>
                    <li>Paste the JSON in the JSON Import tab</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImportJson} 
            disabled={!jsonInput.trim() || importStatus === 'success'}
            className="gradient-primary text-primary-foreground"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
