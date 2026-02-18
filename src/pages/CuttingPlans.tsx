import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SIZES, CutPlan, LaySheet } from '@/types/cutting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Printer, FileText, Scissors, ArrowRight, Layers, Plus, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CutPlanForm } from '@/components/forms/CutPlanForm';
import { LaySheetForm } from '@/components/forms/LaySheetForm';
import { exportCutPlanPDF, exportLaySheetPDF } from '@/lib/pdfExport';
import { Separator } from '@/components/ui/separator';
import { useDbOrders } from '@/hooks/useDbOrders';
import { useDbCutPlans, useCreateDbCutPlan } from '@/hooks/useDbCutPlans';
import { useDbMarkerPlans } from '@/hooks/useDbMarkerPlans';
import { useCuttingStore } from '@/store/cuttingStore';

const CuttingPlans = () => {
  // DB-backed data
  const { data: orders = [] } = useDbOrders();
  const { data: cutPlans = [], isLoading } = useDbCutPlans();
  const { data: markerPlans = [] } = useDbMarkerPlans();
  const createCutPlan = useCreateDbCutPlan();
  
  // Still using store for lay sheets (TODO: migrate later)
  const { laySheets, addLaySheet, updateLaySheet } = useCuttingStore();
  
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<CutPlan | null>(null);
  const [selectedLaySheet, setSelectedLaySheet] = useState<LaySheet | null>(null);
  const [isCreateCutPlanOpen, setIsCreateCutPlanOpen] = useState(false);
  const [isCreateLaySheetOpen, setIsCreateLaySheetOpen] = useState(false);
  const [editingLaySheet, setEditingLaySheet] = useState<LaySheet | null>(null);

  const getOrder = (orderId: string) => orders.find(o => o.id === orderId);
  const getMarker = (markerId: string) => markerPlans.find(m => m.id === markerId);
  const getLaySheet = (cutPlanId: string) => laySheets.find(ls => ls.cutPlanId === cutPlanId);

  const statusStyles = {
    planned: 'bg-muted text-muted-foreground',
    cutting: 'bg-warning/10 text-warning border-warning/20',
    completed: 'bg-success/10 text-success border-success/20'
  };

  const handleCreateCutPlan = (cutPlan: CutPlan) => {
    createCutPlan.mutate(cutPlan, {
      onSuccess: (savedPlan) => {
        // Auto-create a lay sheet for the cut plan
        const newLaySheet: LaySheet = {
          id: `ls-${Date.now()}`,
          cutPlanId: savedPlan.id,
          layNo: laySheets.length + 1,
          plies: savedPlan.plies,
          layLength: savedPlan.layLength,
          fabricRoll: '',
        };
        addLaySheet(newLaySheet);
        setIsCreateCutPlanOpen(false);
        toast({ title: 'Cut plan created with lay sheet' });
      }
    });
  };

  const handleCreateLaySheet = (laySheet: LaySheet) => {
    addLaySheet(laySheet);
    setIsCreateLaySheetOpen(false);
    toast({ title: 'Lay sheet created successfully' });
  };

  const handleUpdateLaySheet = (laySheet: LaySheet) => {
    updateLaySheet(laySheet.id, laySheet);
    setEditingLaySheet(null);
    toast({ title: 'Lay sheet updated successfully' });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Cutting Plans & Lay Sheets</h1>
            <p className="text-muted-foreground">Manage fabric laying and cutting operations</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateLaySheetOpen} onOpenChange={setIsCreateLaySheetOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  New Lay Sheet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Lay Sheet</DialogTitle>
                </DialogHeader>
                <LaySheetForm
                  cutPlans={cutPlans}
                  existingLaySheets={laySheets}
                  onSubmit={handleCreateLaySheet}
                  onCancel={() => setIsCreateLaySheetOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={isCreateCutPlanOpen} onOpenChange={setIsCreateCutPlanOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" />
                  New Cut Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Cut Plan (Manual Entry)</DialogTitle>
                </DialogHeader>
                <CutPlanForm
                  orders={orders}
                  existingCutPlans={cutPlans}
                  onSubmit={handleCreateCutPlan}
                  onCancel={() => setIsCreateCutPlanOpen(false)}
                />
              </DialogContent>
            </Dialog>
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
              <span className="font-semibold text-primary">Cut Plan</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">Lay Sheet</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Bundle Guide</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Bundle Tags</span>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-2" />

        {/* Section: Summary Stats */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Summary Statistics</h2>
            <Separator className="flex-1" />
          </div>
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
                  <Layers className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">
                    {laySheets.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Lay Sheets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Section: Cut Plans Table */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Cut Plans & Documents</h2>
            <Separator className="flex-1" />
          </div>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Cut Plans & Connected Documents</CardTitle>
            </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Cut No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Marker</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Plies</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Fabric</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Lay Sheet</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cutPlans.map((plan) => {
                    const order = getOrder(plan.orderId);
                    const marker = getMarker(plan.markerId);
                    const laySheet = getLaySheet(plan.id);
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
                          {marker ? (
                            <Badge variant="secondary" className="font-mono text-xs">
                              M#{marker.markerNo}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Manual</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusStyles[plan.status]}>
                            {plan.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {plan.plies}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-medium">
                          {plan.totalQty}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-primary">
                          {plan.fabricUsed.toFixed(2)}m
                        </td>
                        <td className="px-4 py-3 text-center">
                          {laySheet ? (
                            <Badge 
                              className="bg-success/10 text-success border-success/20 cursor-pointer"
                              onClick={() => setSelectedLaySheet(laySheet)}
                            >
                              LS#{laySheet.layNo}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">-</Badge>
                          )}
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
        </div>

        {/* Cut Plan Detail Modal */}
        {selectedPlan && (
          <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Scissors className="h-5 w-5 text-primary" />
                  Cut Plan #{selectedPlan.cutNo}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Order</p>
                      <p className="font-medium">{getOrder(selectedPlan.orderId)?.orderNumber}</p>
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
                  <h4 className="font-semibold mb-3">Size Quantities</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-muted">
                          {Object.keys(selectedPlan.sizes).map((code) => (
                            <th key={code} className="px-2 py-2 text-center font-mono text-xs font-medium border-r border-border last:border-r-0">
                              {code}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-medium text-xs bg-primary/10">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-background">
                          {Object.entries(selectedPlan.sizes).map(([code, qty]) => (
                            <td key={code} className="px-2 py-2 text-center font-mono border-r border-border last:border-r-0">
                              {qty || 0}
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
                        {selectedPlan.totalQty > 0 ? (selectedPlan.fabricUsed / selectedPlan.totalQty).toFixed(3) : '0.000'} m/pc
                      </p>
                    </div>
                  </div>
                </div>

                {/* Print Button */}
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                    Close
                  </Button>
                  <Button 
                    className="gradient-primary text-primary-foreground"
                    onClick={() => {
                      const order = getOrder(selectedPlan.orderId);
                      if (order) {
                        exportCutPlanPDF(selectedPlan, order);
                        toast({ title: 'Cut Plan PDF exported!' });
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Lay Sheet Modal */}
        {selectedLaySheet && (
          <Dialog open={!!selectedLaySheet} onOpenChange={() => setSelectedLaySheet(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-primary" />
                  Lay Sheet #{selectedLaySheet.layNo}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Lay No</p>
                    <p className="font-mono font-bold text-lg">{selectedLaySheet.layNo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">No. of Plies</p>
                    <p className="font-mono font-bold text-lg">{selectedLaySheet.plies}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lay Length</p>
                    <p className="font-mono font-bold">{selectedLaySheet.layLength}m</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fabric Roll</p>
                    <p className="font-medium">{selectedLaySheet.fabricRoll || '-'}</p>
                  </div>
                  {selectedLaySheet.operator && (
                    <div>
                      <p className="text-xs text-muted-foreground">Operator</p>
                      <p className="font-medium">{selectedLaySheet.operator}</p>
                    </div>
                  )}
                  {selectedLaySheet.startTime && (
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-medium">{selectedLaySheet.startTime} - {selectedLaySheet.endTime || '...'}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => {
                    setEditingLaySheet(selectedLaySheet);
                    setSelectedLaySheet(null);
                  }}>
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedLaySheet(null)}>
                    Close
                  </Button>
                  <Button 
                    className="gradient-primary text-primary-foreground"
                    onClick={() => {
                      const cutPlan = cutPlans.find(cp => cp.id === selectedLaySheet.cutPlanId);
                      const order = cutPlan ? getOrder(cutPlan.orderId) : null;
                      if (cutPlan && order) {
                        exportLaySheetPDF(selectedLaySheet, cutPlan, order);
                        toast({ title: 'Lay Sheet PDF exported!' });
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Lay Sheet Dialog */}
        {editingLaySheet && (
          <Dialog open={!!editingLaySheet} onOpenChange={() => setEditingLaySheet(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Lay Sheet #{editingLaySheet.layNo}</DialogTitle>
              </DialogHeader>
              <LaySheetForm
                laySheet={editingLaySheet}
                cutPlans={cutPlans}
                existingLaySheets={laySheets}
                onSubmit={handleUpdateLaySheet}
                onCancel={() => setEditingLaySheet(null)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
};

export default CuttingPlans;
