import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCuttingStore } from '@/store/cuttingStore';
import { SIZES, MarkerPlan, Order } from '@/types/cutting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Printer, Ruler, FileText, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MarkerPlans = () => {
  const { orders, markerPlans, cutPlans, addMarkerPlan, addCutPlan, addLaySheet } = useCuttingStore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerPlan | null>(null);
  
  // Form state
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [markerLength, setMarkerLength] = useState<number>(12.5);
  const [efficiency, setEfficiency] = useState<number>(85);
  const [sizeRatios, setSizeRatios] = useState<Record<string, number>>({});

  const getOrder = (orderId: string) => orders.find(o => o.id === orderId);
  const getCutPlansForMarker = (markerId: string) => cutPlans.filter(cp => cp.markerId === markerId);

  const handleCreateMarker = () => {
    if (!selectedOrder) {
      toast({ title: 'Please select an order', variant: 'destructive' });
      return;
    }

    const order = getOrder(selectedOrder);
    if (!order) return;

    const markerNo = markerPlans.filter(m => m.orderId === selectedOrder).length + 1;
    const newMarker: MarkerPlan = {
      id: `m-${Date.now()}`,
      orderId: selectedOrder,
      markerNo,
      markerLength,
      fabricWidth: order.fabricWidth,
      efficiency,
      sizes: sizeRatios,
      createdAt: new Date().toISOString().split('T')[0]
    };

    addMarkerPlan(newMarker);
    setIsDialogOpen(false);
    setSizeRatios({});
    toast({ title: `Marker Plan #${markerNo} created!` });
  };

  const generateCutPlanFromMarker = (marker: MarkerPlan) => {
    const order = getOrder(marker.orderId);
    if (!order) return;

    const cutNo = cutPlans.length + 1;
    const plies = 100;
    const layLength = marker.markerLength + 0.0254;
    const fabricUsed = plies * layLength;

    const sizes: Record<string, number> = {};
    Object.entries(marker.sizes).forEach(([size, ratio]) => {
      sizes[size] = ratio * plies;
    });

    const totalQty = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);

    const newCutPlan = {
      id: `cp-${Date.now()}`,
      orderId: marker.orderId,
      markerId: marker.id,
      cutNo,
      shade: order.shade,
      plies,
      markerLength: marker.markerLength,
      layLength,
      sizes,
      totalQty,
      fabricUsed,
      date: new Date().toISOString().split('T')[0],
      status: 'planned' as const
    };

    addCutPlan(newCutPlan);

    // Auto-generate lay sheet
    addLaySheet({
      id: `ls-${Date.now()}`,
      cutPlanId: newCutPlan.id,
      layNo: 1,
      plies,
      layLength,
      fabricRoll: `ROLL-${String(cutNo).padStart(3, '0')}`
    });

    toast({ title: `Cut Plan #${cutNo} & Lay Sheet generated!` });
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Marker Plans</h1>
            <p className="text-muted-foreground">Create marker ratios and generate connected cut plans</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                New Marker Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Marker Plan</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Order</Label>
                    <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select order" />
                      </SelectTrigger>
                      <SelectContent>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.orderNumber} - {order.styleName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Marker Length (m)</Label>
                    <Input 
                      type="number" 
                      value={markerLength}
                      onChange={(e) => setMarkerLength(Number(e.target.value))}
                      step={0.01}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Efficiency (%)</Label>
                  <Input 
                    type="number" 
                    value={efficiency}
                    onChange={(e) => setEfficiency(Number(e.target.value))}
                    max={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Size Ratios (pieces per marker)</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {SIZES.map((size) => (
                      <div key={size.code} className="space-y-1">
                        <Label className="text-xs font-mono">{size.code}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={sizeRatios[size.code] || 0}
                          onChange={(e) => setSizeRatios(prev => ({
                            ...prev,
                            [size.code]: Number(e.target.value)
                          }))}
                          className="text-center font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleCreateMarker} className="gradient-primary text-primary-foreground">
                  Create Marker Plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Workflow Indicator */}
        <Card className="shadow-card bg-gradient-to-r from-primary/5 to-success/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-muted-foreground">Order</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">Marker Plan</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Cut Plan + Lay Sheet</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Bundle Guide</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Bundle Tags</span>
            </div>
          </CardContent>
        </Card>

        {/* Marker Plans Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {markerPlans.map((marker) => {
            const order = getOrder(marker.orderId);
            const connectedCutPlans = getCutPlansForMarker(marker.id);
            
            return (
              <Card key={marker.id} className="shadow-card">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Ruler className="h-4 w-4 text-primary" />
                          Marker #{marker.markerNo}
                        </CardTitle>
                        <Badge variant="outline">{order?.orderNumber}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{order?.styleName}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedMarker(marker)}
                    >
                      <FileText className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3 mb-4">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Marker Length</p>
                      <p className="font-mono font-bold">{marker.markerLength}m</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Fabric Width</p>
                      <p className="font-mono font-bold">{marker.fabricWidth}cm</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Efficiency</p>
                      <p className="font-mono font-bold text-success">{marker.efficiency}%</p>
                    </div>
                  </div>

                  {/* Size Ratios */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Size Ratio</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(marker.sizes).filter(([_, qty]) => qty > 0).map(([size, qty]) => (
                        <Badge key={size} variant="secondary" className="font-mono">
                          {size}: {qty}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Connected Cut Plans */}
                  <div className="border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Connected Cut Plans:</span>
                        {connectedCutPlans.length > 0 ? (
                          connectedCutPlans.map(cp => (
                            <Badge key={cp.id} className="bg-success/10 text-success border-success/20">
                              Cut #{cp.cutNo}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => generateCutPlanFromMarker(marker)}
                        className="gradient-primary text-primary-foreground"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Generate Cut Plan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Marker Detail Modal */}
        {selectedMarker && (
          <Dialog open={!!selectedMarker} onOpenChange={() => setSelectedMarker(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Ruler className="h-5 w-5 text-primary" />
                  Marker Plan #{selectedMarker.markerNo}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Header Info */}
                <div className="grid grid-cols-4 gap-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Order</p>
                    <p className="font-medium">{getOrder(selectedMarker.orderId)?.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Marker Length</p>
                    <p className="font-mono font-bold">{selectedMarker.markerLength}m</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fabric Width</p>
                    <p className="font-mono font-bold">{selectedMarker.fabricWidth}cm</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Efficiency</p>
                    <p className="font-mono font-bold text-success">{selectedMarker.efficiency}%</p>
                  </div>
                </div>

                {/* Size Ratio Table */}
                <div>
                  <h4 className="font-semibold mb-3">Size Ratio (per marker)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-muted">
                          {SIZES.map((size) => (
                            <th key={size.code} className="px-2 py-2 text-center font-mono text-xs font-medium border-r border-border last:border-r-0">
                              {size.code}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-medium text-xs bg-primary/10">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-background">
                          {SIZES.map((size) => (
                            <td key={size.code} className="px-2 py-2 text-center font-mono border-r border-border last:border-r-0">
                              {selectedMarker.sizes[size.code] || 0}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-mono font-bold bg-primary/10">
                            {Object.values(selectedMarker.sizes).reduce((sum, v) => sum + v, 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setSelectedMarker(null)}>
                    Close
                  </Button>
                  <Button className="gradient-primary text-primary-foreground">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Marker Plan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
};

export default MarkerPlans;
