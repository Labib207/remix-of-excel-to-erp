import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCuttingStore } from '@/store/cuttingStore';
import { FabricCalculation as FabricCalc } from '@/types/cutting';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Calculator, Scissors, ArrowRight, Pencil, Trash2, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { exportFabricRequestPDF } from '@/lib/fabricReport';

const FabricCalculationPage = () => {
  const { 
    orders, 
    cutPlans, 
    fabricCalculations, 
    addFabricCalculation, 
    updateFabricCalculation, 
    deleteFabricCalculation 
  } = useCuttingStore();
  const { toast } = useToast();
  
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCalc, setEditingCalc] = useState<FabricCalc | null>(null);
  
  const [formData, setFormData] = useState({
    fabricType: 'TOP' as 'TOP' | 'FUSING' | 'TAB',
    totalMeters: 0,
    wastagePercent: 1,
    receivedMeters: 0,
    usedMeters: 0,
    remarks: '',
  });

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const orderCalculations = fabricCalculations.filter(c => c.orderId === selectedOrderId);
  const orderCutPlans = cutPlans.filter(cp => cp.orderId === selectedOrderId);

  // Calculate total fabric used from cut plans
  const totalFabricFromCuts = orderCutPlans.reduce((sum, cp) => sum + cp.fabricUsed, 0);

  const resetForm = () => {
    setFormData({
      fabricType: 'TOP',
      totalMeters: totalFabricFromCuts,
      wastagePercent: 1,
      receivedMeters: 0,
      usedMeters: 0,
      remarks: '',
    });
  };

  const openCreate = () => {
    resetForm();
    setFormData(prev => ({ ...prev, totalMeters: totalFabricFromCuts }));
    setIsCreateOpen(true);
  };

  const openEdit = (calc: FabricCalc) => {
    setEditingCalc(calc);
    setFormData({
      fabricType: calc.fabricType,
      totalMeters: calc.totalMeters,
      wastagePercent: calc.wastagePercent,
      receivedMeters: calc.receivedMeters,
      usedMeters: calc.usedMeters,
      remarks: calc.remarks,
    });
  };

  // Exact conversion factor: meters to yards
  const METERS_TO_YARDS = 1.0936133;

  const calculateDerived = () => {
    const totalYards = formData.totalMeters * METERS_TO_YARDS;
    const requestWithAllowance = formData.totalMeters * (1 + formData.wastagePercent / 100);
    const balance = formData.receivedMeters - formData.usedMeters;
    return { totalYards, requestWithAllowance, balance };
  };

  const handleCreate = () => {
    if (!selectedOrderId) return;

    const { totalYards, requestWithAllowance, balance } = calculateDerived();

    const newCalc: FabricCalc = {
      id: `fc-${Date.now()}`,
      orderId: selectedOrderId,
      fabricType: formData.fabricType,
      totalMeters: formData.totalMeters,
      totalYards,
      wastagePercent: formData.wastagePercent,
      requestWithAllowance,
      receivedMeters: formData.receivedMeters,
      usedMeters: formData.usedMeters,
      balance,
      remarks: formData.remarks,
    };

    addFabricCalculation(newCalc);
    setIsCreateOpen(false);
    toast({ title: 'Fabric calculation created' });
  };

  const handleUpdate = () => {
    if (!editingCalc) return;

    const { totalYards, requestWithAllowance, balance } = calculateDerived();

    updateFabricCalculation(editingCalc.id, {
      fabricType: formData.fabricType,
      totalMeters: formData.totalMeters,
      totalYards,
      wastagePercent: formData.wastagePercent,
      requestWithAllowance,
      receivedMeters: formData.receivedMeters,
      usedMeters: formData.usedMeters,
      balance,
      remarks: formData.remarks,
    });

    setEditingCalc(null);
    toast({ title: 'Fabric calculation updated' });
  };

  const handleDelete = (id: string) => {
    deleteFabricCalculation(id);
    toast({ title: 'Fabric calculation deleted' });
  };

  const { totalYards: previewYards, requestWithAllowance: previewRequest, balance: previewBalance } = calculateDerived();

  const fabricTypeColors = {
    TOP: 'bg-blue-500/10 text-blue-600 border-blue-200',
    FUSING: 'bg-purple-500/10 text-purple-600 border-purple-200',
    TAB: 'bg-orange-500/10 text-orange-600 border-orange-200',
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Fabric Calculation</h1>
            <p className="text-muted-foreground">Calculate fabric requirements with wastage & allowances</p>
          </div>
        </div>

        {/* Workflow Indicator */}
        <Card className="shadow-card bg-gradient-to-r from-primary/5 to-success/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-muted-foreground">Order</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Cut Plans</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">Fabric Calculation</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Reconciliation</span>
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
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        if (selectedOrder) {
                          exportFabricRequestPDF(selectedOrder, cutPlans, fabricCalculations);
                          toast({ title: 'Fabric Request Report exported!' });
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Report
                    </Button>
                    <Button onClick={openCreate} className="gradient-primary text-primary-foreground">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Calculation
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        {selectedOrder && (
          <>
            <Separator className="my-2" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">Fabric Summary</h2>
                <Separator className="flex-1" />
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <Card className="shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <Scissors className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold font-mono">{orderCutPlans.length}</p>
                        <p className="text-sm text-muted-foreground">Cut Plans</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                        <Calculator className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold font-mono">{totalFabricFromCuts.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Total Meters (from cuts)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                        <Calculator className="h-6 w-6 text-warning" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold font-mono">{(totalFabricFromCuts * 1.0936133).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Total Yards</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                        <Calculator className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold font-mono">{(totalFabricFromCuts * 1.01).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">With 1% Allowance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Fabric Calculations Table */}
        {selectedOrderId && (
          <>
            <Separator className="my-2" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">Fabric Calculations</h2>
                <Badge variant="outline">{orderCalculations.length} records</Badge>
                <Separator className="flex-1" />
              </div>
              
              {orderCalculations.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No fabric calculations yet.</p>
                    <p className="text-sm">Click "Add Calculation" to create TOP, FUSING, or TAB calculations.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-card">
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Total (m)</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Total (yd)</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Wastage %</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Request (with allowance)</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Received</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Used</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Balance</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {orderCalculations.map((calc) => (
                            <tr key={calc.id} className="transition-colors hover:bg-muted/30">
                              <td className="px-4 py-3">
                                <Badge className={fabricTypeColors[calc.fabricType]}>
                                  {calc.fabricType}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-mono">{calc.totalMeters.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">{calc.totalYards.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">{calc.wastagePercent}%</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-primary">{calc.requestWithAllowance.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">{calc.receivedMeters.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono">{calc.usedMeters.toFixed(2)}</td>
                              <td className={`px-4 py-3 text-right font-mono font-bold ${calc.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {calc.balance.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => openEdit(calc)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Calculation?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete this fabric calculation.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(calc.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateOpen || !!editingCalc} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingCalc(null);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                {editingCalc ? 'Edit Fabric Calculation' : 'Add Fabric Calculation'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fabric Type</Label>
                  <Select 
                    value={formData.fabricType} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, fabricType: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOP">TOP (Shell)</SelectItem>
                      <SelectItem value="FUSING">FUSING</SelectItem>
                      <SelectItem value="TAB">TAB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Wastage %</Label>
                  <Input 
                    type="number"
                    value={formData.wastagePercent}
                    onChange={(e) => setFormData(prev => ({ ...prev, wastagePercent: Number(e.target.value) }))}
                    min={0}
                    step={0.5}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Meters</Label>
                  <Input 
                    type="number"
                    value={formData.totalMeters}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalMeters: Number(e.target.value) }))}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Yards (calculated)</Label>
                  <Input 
                    type="number"
                    value={previewYards.toFixed(4)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Received Meters</Label>
                  <Input 
                    type="number"
                    value={formData.receivedMeters}
                    onChange={(e) => setFormData(prev => ({ ...prev, receivedMeters: Number(e.target.value) }))}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Used Meters</Label>
                  <Input 
                    type="number"
                    value={formData.usedMeters}
                    onChange={(e) => setFormData(prev => ({ ...prev, usedMeters: Number(e.target.value) }))}
                    step={0.01}
                  />
                </div>
              </div>

              {/* Calculated Summary */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <h4 className="font-semibold text-sm">Calculated Values</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Request with {formData.wastagePercent}% Allowance</p>
                    <p className="font-mono font-bold text-primary">{previewRequest.toFixed(4)} m</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Yards</p>
                    <p className="font-mono font-bold">{previewYards.toFixed(4)} yd</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className={`font-mono font-bold ${previewBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {previewBalance.toFixed(4)} m
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Remarks</Label>
                <Input 
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Optional remarks..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingCalc(null); }}>
                Cancel
              </Button>
              <Button onClick={editingCalc ? handleUpdate : handleCreate} className="gradient-primary text-primary-foreground">
                {editingCalc ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default FabricCalculationPage;
