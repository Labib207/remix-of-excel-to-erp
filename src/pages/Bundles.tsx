import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCuttingStore } from '@/store/cuttingStore';
import { SIZES, CutPlan } from '@/types/cutting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Printer, Package, Tag, FileText, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PARTS = [
  'FRONT', 'BACK', 'SLEEVE', 'COLLAR', 'POCKET', 'FLAP',
  'L FRONT', 'R FRONT', 'FRT SLV', 'BCK SLV', 'U.COLLAR', 'T COLLER',
  'SIDE BACK', 'ELBOW PKT', 'BTTM PKT', 'BT PKT FLAP', 'PEN.PKT',
  'FRNT PLKT', 'SH TOP TAB', 'SH INNR TAB', 'SLNT PKT', 'BA PKT BG'
];

const Bundles = () => {
  const { cutPlans, orders, bundles, bundleGuides, generateDocumentsFromCutPlan } = useCuttingStore();
  const { toast } = useToast();
  
  const [selectedCutPlan, setSelectedCutPlan] = useState<string>('');
  const [bundleSize, setBundleSize] = useState<number>(50);
  const [selectedParts, setSelectedParts] = useState<string[]>(PARTS.slice(0, 6));
  const [showBundleGuide, setShowBundleGuide] = useState<CutPlan | null>(null);
  const [showBundleTags, setShowBundleTags] = useState<CutPlan | null>(null);

  const togglePart = (part: string) => {
    setSelectedParts(prev => 
      prev.includes(part) 
        ? prev.filter(p => p !== part)
        : [...prev, part]
    );
  };

  const generateBundles = () => {
    if (!selectedCutPlan) {
      toast({ title: 'Please select a cut plan', variant: 'destructive' });
      return;
    }
    
    if (selectedParts.length === 0) {
      toast({ title: 'Please select at least one part', variant: 'destructive' });
      return;
    }

    generateDocumentsFromCutPlan(selectedCutPlan, bundleSize, selectedParts);
    toast({ title: 'Bundle Guide & Tags generated successfully!' });
  };

  const getOrder = (orderId: string) => orders.find(o => o.id === orderId);
  const getCutPlan = (id: string) => cutPlans.find(cp => cp.id === id);

  const planGuides = showBundleGuide ? bundleGuides.filter(bg => bg.cutPlanId === showBundleGuide.id) : [];
  const planBundles = showBundleTags ? bundles.filter(b => b.cutPlanId === showBundleTags.id) : [];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Bundle Management</h1>
            <p className="text-muted-foreground">Generate Bundle Guide → Bundle Tags (auto-connected to Cut Plans)</p>
          </div>
        </div>

        {/* Workflow Indicator */}
        <Card className="shadow-card bg-gradient-to-r from-primary/5 to-success/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-muted-foreground">Order</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Marker Plan</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Cut Plan</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">Bundle Guide</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">Bundle Tags</span>
            </div>
          </CardContent>
        </Card>

        {/* Generator Card */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Generate Bundle Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Select Cut Plan</Label>
                <Select value={selectedCutPlan} onValueChange={setSelectedCutPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cut plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {cutPlans.map((cp) => {
                      const order = getOrder(cp.orderId);
                      return (
                        <SelectItem key={cp.id} value={cp.id}>
                          Cut #{cp.cutNo} - {order?.orderNumber} ({cp.totalQty} pcs)
                        </SelectItem>
                      );
                    })}
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
                  className="gradient-primary text-primary-foreground w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Documents
                </Button>
              </div>
            </div>

            {/* Parts Selection */}
            <div className="space-y-2">
              <Label>Select Parts for Bundle Tags</Label>
              <div className="flex flex-wrap gap-2">
                {PARTS.map((part) => (
                  <div 
                    key={part}
                    className={`flex items-center gap-2 rounded-md border px-3 py-1.5 cursor-pointer transition-colors ${
                      selectedParts.includes(part) 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                    onClick={() => togglePart(part)}
                  >
                    <Checkbox 
                      checked={selectedParts.includes(part)}
                      onCheckedChange={() => togglePart(part)}
                    />
                    <span className="text-sm">{part}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cut Plans with Generated Documents */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Cut Plans & Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Cut #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Order</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Sizes</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Guides</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cutPlans.map((plan) => {
                    const order = getOrder(plan.orderId);
                    const guides = bundleGuides.filter(bg => bg.cutPlanId === plan.id);
                    const tags = bundles.filter(b => b.cutPlanId === plan.id);
                    return (
                      <tr key={plan.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono">
                            #{plan.cutNo}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {order?.orderNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-medium">
                          {plan.totalQty}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {Object.keys(plan.sizes).length} sizes
                        </td>
                        <td className="px-4 py-3 text-center">
                          {guides.length > 0 ? (
                            <Badge className="bg-success/10 text-success border-success/20">
                              {guides.length} guides
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">-</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tags.length > 0 ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              {tags.length} tags
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">-</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowBundleGuide(plan)}
                              disabled={guides.length === 0}
                            >
                              <FileText className="mr-1 h-3 w-3" />
                              Guide
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowBundleTags(plan)}
                              disabled={tags.length === 0}
                            >
                              <Tag className="mr-1 h-3 w-3" />
                              Tags
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bundle Guide Modal */}
        {showBundleGuide && (
          <Dialog open={!!showBundleGuide} onOpenChange={() => setShowBundleGuide(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  Bundle Guide - Cut #{showBundleGuide.cutNo}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Header Info */}
                <div className="grid grid-cols-4 gap-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Order</p>
                    <p className="font-medium">{getOrder(showBundleGuide.orderId)?.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Style</p>
                    <p className="font-medium">{getOrder(showBundleGuide.orderId)?.styleNo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cut No</p>
                    <p className="font-mono font-bold">{showBundleGuide.cutNo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Qty</p>
                    <p className="font-mono font-bold text-primary">{showBundleGuide.totalQty}</p>
                  </div>
                </div>

                {/* Bundle Guide Table */}
                <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-4 py-3 text-left font-medium">Size</th>
                      <th className="px-4 py-3 text-right font-medium">Total Qty</th>
                      <th className="px-4 py-3 text-right font-medium">Bundle Size</th>
                      <th className="px-4 py-3 text-right font-medium">Full Bundles</th>
                      <th className="px-4 py-3 text-right font-medium">Remainder</th>
                      <th className="px-4 py-3 text-right font-medium">Total Bundles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {planGuides.map((guide) => (
                      <tr key={guide.id}>
                        <td className="px-4 py-3 font-mono font-bold">{guide.size}</td>
                        <td className="px-4 py-3 text-right font-mono">{guide.totalQty}</td>
                        <td className="px-4 py-3 text-right font-mono">{guide.bundleSize}</td>
                        <td className="px-4 py-3 text-right font-mono">{Math.floor(guide.totalQty / guide.bundleSize)}</td>
                        <td className="px-4 py-3 text-right font-mono text-warning">{guide.remainderQty || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">{guide.bundles}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 font-bold">
                      <td className="px-4 py-3">TOTAL</td>
                      <td className="px-4 py-3 text-right font-mono">{planGuides.reduce((sum, g) => sum + g.totalQty, 0)}</td>
                      <td className="px-4 py-3 text-right">-</td>
                      <td className="px-4 py-3 text-right">-</td>
                      <td className="px-4 py-3 text-right">-</td>
                      <td className="px-4 py-3 text-right font-mono text-primary">{planGuides.reduce((sum, g) => sum + g.bundles, 0)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setShowBundleGuide(null)}>
                    Close
                  </Button>
                  <Button className="gradient-primary text-primary-foreground">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Bundle Guide
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Bundle Tags Modal */}
        {showBundleTags && (
          <Dialog open={!!showBundleTags} onOpenChange={() => setShowBundleTags(null)}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Tag className="h-5 w-5 text-primary" />
                  Bundle Tags - Cut #{showBundleTags.cutNo} ({planBundles.length} tags)
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {planBundles.slice(0, 20).map((bundle) => {
                    const order = getOrder(bundle.orderId);
                    return (
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
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Order:</span>
                            <span className="font-medium">{order?.orderNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cut #:</span>
                            <span className="font-mono">{bundle.cutNo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Part:</span>
                            <span className="font-medium">{bundle.part}</span>
                          </div>
                          <div className="flex justify-between">
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
                    );
                  })}
                </div>

                {planBundles.length > 20 && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Showing 20 of {planBundles.length} tags</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setShowBundleTags(null)}>
                    Close
                  </Button>
                  <Button className="gradient-primary text-primary-foreground">
                    <Printer className="mr-2 h-4 w-4" />
                    Print All Tags
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Empty State */}
        {bundles.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No Bundle Documents</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Select a cut plan and generate bundle documents to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Bundles;
