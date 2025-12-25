import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCuttingStore } from '@/store/cuttingStore';
import { SIZES, Ratio, SizeQuantity } from '@/types/cutting';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Calculator, Check, ArrowRight, Trash2, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const RatioPlanning = () => {
  const { orders, ratios, addRatio, updateRatio, deleteRatio, setActiveRatio } = useCuttingStore();
  const { toast } = useToast();
  
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [ratioName, setRatioName] = useState('');
  const [plies, setPlies] = useState(100);
  const [sizeFlags, setSizeFlags] = useState<Record<string, boolean>>({});

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const orderRatios = ratios.filter(r => r.orderId === selectedOrderId);
  const activeRatio = orderRatios.find(r => r.isActive);

  // Get available sizes for the selected order
  const getOrderSizes = () => {
    if (!selectedOrder) return SIZES;
    if (selectedOrder.customSizes && selectedOrder.customSizes.length > 0) {
      return selectedOrder.customSizes;
    }
    return SIZES.filter(s => selectedOrder.sizeQuantities[s.code] > 0);
  };

  const orderSizes = getOrderSizes();

  const initializeCreateRatio = () => {
    const nextNumber = orderRatios.length + 1;
    setRatioName(`RATIO-${nextNumber.toString().padStart(2, '0')}`);
    setPlies(100);
    
    // Initialize flags based on order sizes
    const initialFlags: Record<string, boolean> = {};
    orderSizes.forEach(size => {
      initialFlags[size.code] = true;
    });
    setSizeFlags(initialFlags);
    setIsCreateOpen(true);
  };

  const calculatePlannedQty = (): { plannedQty: SizeQuantity; totalQty: number } => {
    if (!selectedOrder) return { plannedQty: {}, totalQty: 0 };
    
    const plannedQty: SizeQuantity = {};
    let totalQty = 0;
    
    // Count selected sizes
    const selectedSizes = Object.entries(sizeFlags).filter(([_, selected]) => selected);
    const ratioPerSize = selectedSizes.length > 0 ? 1 : 0; // 1 piece per size per ply
    
    selectedSizes.forEach(([sizeCode]) => {
      const qty = ratioPerSize * plies;
      plannedQty[sizeCode] = qty;
      totalQty += qty;
    });
    
    return { plannedQty, totalQty };
  };

  const handleCreateRatio = () => {
    if (!selectedOrder || !ratioName) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const { plannedQty, totalQty } = calculatePlannedQty();
    
    // Convert flags to sizes (1 = included, 0 = excluded)
    const sizes: SizeQuantity = {};
    Object.entries(sizeFlags).forEach(([code, selected]) => {
      sizes[code] = selected ? 1 : 0;
    });

    const newRatio: Ratio = {
      id: `ratio-${Date.now()}`,
      orderId: selectedOrderId,
      ratioNumber: orderRatios.length + 1,
      ratioName,
      sizes,
      plannedQty,
      plies,
      totalQty,
      isActive: orderRatios.length === 0, // First ratio is active by default
    };

    addRatio(newRatio);
    setIsCreateOpen(false);
    toast({ title: `${ratioName} created successfully` });
  };

  const handleSetActive = (ratioId: string) => {
    setActiveRatio(selectedOrderId, ratioId);
    toast({ title: 'Active ratio updated' });
  };

  const handleDeleteRatio = (ratioId: string) => {
    deleteRatio(ratioId);
    toast({ title: 'Ratio deleted' });
  };

  const toggleSizeFlag = (sizeCode: string) => {
    setSizeFlags(prev => ({
      ...prev,
      [sizeCode]: !prev[sizeCode]
    }));
  };

  const { plannedQty: previewPlannedQty, totalQty: previewTotalQty } = calculatePlannedQty();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Ratio Planning</h1>
            <p className="text-muted-foreground">Create and manage size distribution ratios (RATIO-01 to RATIO-11)</p>
          </div>
        </div>

        {/* Workflow Indicator */}
        <Card className="shadow-card bg-gradient-to-r from-primary/5 to-success/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-muted-foreground">Order</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">Ratio Plan</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Marker Plan</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Cut Plan</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Bundle Tags</span>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-2" />

        {/* Order Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Select Order</h2>
            <Separator className="flex-1" />
          </div>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Order</Label>
                  <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.orderNumber} - {order.customer} ({order.totalQty.toLocaleString()} pcs)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedOrderId && (
                  <Button onClick={initializeCreateRatio} className="gradient-primary text-primary-foreground">
                    <Plus className="mr-2 h-4 w-4" />
                    New Ratio
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Info & Size Distribution */}
        {selectedOrder && (
          <>
            <Separator className="my-2" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">Order Size Distribution</h2>
                <Separator className="flex-1" />
              </div>
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    {selectedOrder.orderNumber} - Size Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-muted">
                          {orderSizes.map((size) => (
                            <th key={size.code} className="px-2 py-2 text-center font-mono text-xs font-medium border-r border-border last:border-r-0">
                              {size.code}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-medium text-xs bg-primary/10">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-background">
                          {orderSizes.map((size) => (
                            <td key={size.code} className="px-2 py-2 text-center font-mono border-r border-border last:border-r-0">
                              {selectedOrder.sizeQuantities[size.code] || 0}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-mono font-bold bg-primary/10">
                            {selectedOrder.totalQty.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Ratio Scenarios */}
        {selectedOrderId && (
          <>
            <Separator className="my-2" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">Ratio Scenarios</h2>
                <Badge variant="outline">{orderRatios.length} ratios</Badge>
                <Separator className="flex-1" />
              </div>
              
              {orderRatios.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No ratio scenarios created yet.</p>
                    <p className="text-sm">Click "New Ratio" to create your first ratio plan.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {orderRatios.map((ratio) => (
                    <Card 
                      key={ratio.id} 
                      className={`shadow-card transition-all ${ratio.isActive ? 'ring-2 ring-primary border-primary' : ''}`}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{ratio.ratioName}</span>
                            {ratio.isActive && (
                              <Badge className="bg-success/10 text-success border-success/20">
                                <Check className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {!ratio.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetActive(ratio.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRatio(ratio.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Plies</p>
                            <p className="font-mono font-bold">{ratio.plies}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Qty</p>
                            <p className="font-mono font-bold text-primary">{ratio.totalQty}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sizes Included</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(ratio.sizes)
                              .filter(([_, val]) => val === 1)
                              .map(([code]) => (
                                <Badge key={code} variant="secondary" className="text-xs font-mono">
                                  {code}
                                </Badge>
                              ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Planned Quantities</p>
                          <div className="grid grid-cols-5 gap-1 text-xs">
                            {Object.entries(ratio.plannedQty).slice(0, 10).map(([size, qty]) => (
                              <div key={size} className="text-center bg-muted rounded px-1 py-0.5">
                                <span className="font-mono">{size}: {qty}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Create Ratio Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Create New Ratio Scenario
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ratio Name</Label>
                  <Input 
                    value={ratioName} 
                    onChange={(e) => setRatioName(e.target.value)}
                    placeholder="e.g., RATIO-01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plies per Cut</Label>
                  <Input 
                    type="number"
                    value={plies} 
                    onChange={(e) => setPlies(Number(e.target.value))}
                    min={1}
                  />
                </div>
              </div>

              {/* Size Selection */}
              <div className="space-y-2">
                <Label>Select Sizes to Include</Label>
                <div className="flex flex-wrap gap-2">
                  {orderSizes.map((size) => (
                    <div 
                      key={size.code}
                      className={`flex items-center gap-2 rounded-md border px-3 py-1.5 cursor-pointer transition-colors ${
                        sizeFlags[size.code] 
                          ? 'bg-primary/10 border-primary text-primary' 
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                      onClick={() => toggleSizeFlag(size.code)}
                    >
                      <Checkbox 
                        checked={sizeFlags[size.code] || false}
                        onCheckedChange={() => toggleSizeFlag(size.code)}
                      />
                      <span className="text-sm font-mono">{size.code}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview: Planned Quantities</Label>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-muted">
                        {Object.keys(previewPlannedQty).map((size) => (
                          <th key={size} className="px-2 py-2 text-center font-mono text-xs font-medium border-r border-border last:border-r-0">
                            {size}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-center font-medium text-xs bg-primary/10">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-background">
                        {Object.entries(previewPlannedQty).map(([size, qty]) => (
                          <td key={size} className="px-2 py-2 text-center font-mono border-r border-border last:border-r-0">
                            {qty}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-mono font-bold bg-primary/10">
                          {previewTotalQty}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRatio} className="gradient-primary text-primary-foreground">
                Create Ratio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default RatioPlanning;
