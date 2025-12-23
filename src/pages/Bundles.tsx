import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCuttingStore } from '@/store/cuttingStore';
import { SIZES, Bundle } from '@/types/cutting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Printer, Package, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PARTS = [
  'FRONT', 'BACK', 'SLEEVE', 'COLLAR', 'POCKET', 'FLAP',
  'L FRONT', 'R FRONT', 'FRT SLV', 'BCK SLV', 'U.COLLAR', 'T COLLER',
  'SIDE BACK', 'ELBOW PKT', 'BTTM PKT', 'BT PKT FLAP', 'PEN.PKT',
  'FRNT PLKT', 'SH TOP TAB', 'SH INNR TAB', 'SLNT PKT', 'BA PKT BG'
];

const Bundles = () => {
  const { cutPlans, orders, bundles, addBundles } = useCuttingStore();
  const { toast } = useToast();
  
  const [selectedCutPlan, setSelectedCutPlan] = useState<string>('');
  const [bundleSize, setBundleSize] = useState<number>(50);

  const generateBundles = () => {
    const cutPlan = cutPlans.find(cp => cp.id === selectedCutPlan);
    if (!cutPlan) {
      toast({ title: 'Please select a cut plan', variant: 'destructive' });
      return;
    }

    const newBundles: Bundle[] = [];
    let bundleNo = bundles.length + 1;

    Object.entries(cutPlan.sizes).forEach(([size, qty]) => {
      if (qty <= 0) return;
      
      let remaining = qty;
      let startNo = 1;

      while (remaining > 0) {
        const bundleQty = Math.min(remaining, bundleSize);
        
        PARTS.slice(0, 6).forEach(part => {
          newBundles.push({
            id: `${Date.now()}-${bundleNo}-${part}`,
            cutPlanId: cutPlan.id,
            bundleNo,
            size,
            part,
            quantity: bundleQty,
            startNo,
            endNo: startNo + bundleQty - 1,
            shade: cutPlan.shade
          });
        });

        startNo += bundleQty;
        remaining -= bundleQty;
        bundleNo++;
      }
    });

    addBundles(newBundles);
    toast({ title: `Generated ${newBundles.length} bundle tags` });
  };

  const order = orders[0];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Bundle Tags</h1>
            <p className="text-muted-foreground">Generate and manage bundle tags for production</p>
          </div>
        </div>

        {/* Generator Card */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Bundle Generator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Cut Plan</Label>
                <Select value={selectedCutPlan} onValueChange={setSelectedCutPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cut plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {cutPlans.map((cp) => (
                      <SelectItem key={cp.id} value={cp.id}>
                        Cut #{cp.cutNo} - {cp.totalQty} pcs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bundle Size</Label>
                <Input 
                  type="number" 
                  value={bundleSize}
                  onChange={(e) => setBundleSize(Number(e.target.value))}
                  min={1}
                  max={100}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={generateBundles}
                  className="gradient-primary text-primary-foreground"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Bundles
                </Button>
              </div>
              <div className="flex items-end">
                <Button variant="outline">
                  <Printer className="mr-2 h-4 w-4" />
                  Print All Tags
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bundle Tags Preview */}
        {bundles.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Generated Bundle Tags ({bundles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {bundles.slice(0, 12).map((bundle) => (
                  <div 
                    key={bundle.id}
                    className="rounded-lg border-2 border-dashed border-border bg-background p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">BUNDLE TAG</span>
                      <Badge variant="outline" className="font-mono">
                        #{bundle.bundleNo}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Style:</span>
                        <span className="font-medium">{order?.styleName} - {order?.totalQty} QTY</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Part:</span>
                        <span className="font-medium">{bundle.part}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shade:</span>
                        <span className="font-medium">{bundle.shade}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center rounded-md bg-muted py-3">
                      <span className="text-2xl font-bold font-mono">{bundle.size}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">QTY</p>
                        <p className="font-mono font-bold">{bundle.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">S/N Range</p>
                        <p className="font-mono font-medium">{bundle.startNo}-{bundle.endNo}</p>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-border pt-2 text-center">
                      <p className="text-xs text-muted-foreground">...........................SIGNATURE</p>
                    </div>
                  </div>
                ))}
              </div>

              {bundles.length > 12 && (
                <div className="mt-4 text-center">
                  <Button variant="outline">
                    View All {bundles.length} Bundle Tags
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {bundles.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No Bundle Tags</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Select a cut plan and generate bundle tags to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Bundles;
