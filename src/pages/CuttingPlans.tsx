import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCuttingStore } from '@/store/cuttingStore';
import { SIZES, CutPlan } from '@/types/cutting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Printer, FileText, Scissors } from 'lucide-react';

const CuttingPlans = () => {
  const { cutPlans, orders } = useCuttingStore();
  const [selectedPlan, setSelectedPlan] = useState<CutPlan | null>(null);

  const getOrder = (orderId: string) => orders.find(o => o.id === orderId);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Cutting Plans</h1>
            <p className="text-muted-foreground">Manage fabric laying and cutting operations</p>
          </div>
          <Button className="gradient-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            New Cut Plan
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Scissors className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{cutPlans.length}</p>
                  <p className="text-sm text-muted-foreground">Total Cut Plans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <FileText className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">
                    {cutPlans.reduce((sum, cp) => sum + cp.totalQty, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Pieces</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                  <FileText className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">
                    {cutPlans.reduce((sum, cp) => sum + cp.fabricUsed, 0).toFixed(0)}m
                  </p>
                  <p className="text-sm text-muted-foreground">Fabric Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cut Plans Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>All Cut Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Cut No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Shade</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Plies</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Marker</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Lay Length</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Fabric</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cutPlans.map((plan) => {
                    const order = getOrder(plan.orderId);
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
                        <td className="px-4 py-3">
                          <Badge className="bg-muted text-foreground">
                            {plan.shade}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {plan.plies}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {plan.markerLength}m
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {plan.layLength}m
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-medium">
                          {plan.totalQty}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-primary">
                          {plan.fabricUsed.toFixed(2)}m
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(plan.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedPlan(plan)}
                            >
                              View
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Printer className="h-4 w-4" />
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

        {/* Cut Plan Detail Modal (Lay Sheet) */}
        {selectedPlan && (
          <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Scissors className="h-5 w-5 text-primary" />
                  Cutting Lay Sheet - Cut #{selectedPlan.cutNo}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Print Date</p>
                      <p className="font-medium">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cut No.</p>
                      <p className="font-mono font-bold text-lg">{selectedPlan.cutNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Style</p>
                      <p className="font-medium">{getOrder(selectedPlan.orderId)?.styleNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Shade</p>
                      <p className="font-medium">{selectedPlan.shade}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">No. of Plies</p>
                      <p className="font-mono font-bold text-lg">{selectedPlan.plies}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Qty</p>
                      <p className="font-mono font-bold text-lg text-primary">{selectedPlan.totalQty}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Marker Length</p>
                      <p className="font-mono font-medium">{selectedPlan.markerLength}m</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lay Length</p>
                      <p className="font-mono font-medium">{selectedPlan.layLength}m</p>
                    </div>
                  </div>
                </div>

                {/* Size Ratio */}
                <div>
                  <h4 className="font-semibold mb-3">Size Ratio</h4>
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
                              {selectedPlan.sizes[size.code] || 0}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-mono font-bold bg-primary/10">
                            {selectedPlan.totalQty}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fabric Usage */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Fabric Usage</p>
                      <p className="text-2xl font-bold font-mono text-primary">
                        {selectedPlan.fabricUsed.toFixed(2)} meters
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Unit Consumption</p>
                      <p className="text-lg font-mono font-medium">
                        {(selectedPlan.fabricUsed / selectedPlan.totalQty).toFixed(3)} m/pc
                      </p>
                    </div>
                  </div>
                </div>

                {/* Print Button */}
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                    Close
                  </Button>
                  <Button className="gradient-primary text-primary-foreground">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Lay Sheet
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

export default CuttingPlans;
