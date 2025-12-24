import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCuttingStore } from '@/store/cuttingStore';
import { LayRecord } from '@/types/cutting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, FileText, Calculator, Package, TrendingDown, TrendingUp, Scissors } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Reconciliation = () => {
  const { orders, cutPlans, layRecords, fabricRolls, addLayRecord, addFabricRoll } = useCuttingStore();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [selectedCutPlan, setSelectedCutPlan] = useState<string>('');
  const [isLayDialogOpen, setIsLayDialogOpen] = useState(false);
  const [isRollDialogOpen, setIsRollDialogOpen] = useState(false);
  const [fabricType, setFabricType] = useState<'SHELL' | 'FUSING' | 'TAB'>('SHELL');

  // New Roll Form State
  const [newRoll, setNewRoll] = useState({
    rollNo: '',
    fabricType: 'SHELL' as 'SHELL' | 'FUSING' | 'TAB',
    systemLength: 0,
  });

  // New Lay Record Form State
  const [newLayRecord, setNewLayRecord] = useState<Partial<LayRecord>>({
    rollNo: '',
    systemRollLength: 0,
    actualLays: 0,
    markerLength: 0,
    overlapYards: 0,
    rollShortageIncrease: 0,
    rollEndNextPly1st: 0,
    damage: 0,
    rollEndNextPly2nd: 0,
    recutReturn: 0,
    unusableRollEnd: 0,
    rollEnd: 0,
    bigEnd: 0,
    remarks: '',
  });

  const order = orders.find(o => o.id === selectedOrder);
  const cutPlan = cutPlans.find(cp => cp.id === selectedCutPlan);
  const orderCutPlans = cutPlans.filter(cp => cp.orderId === selectedOrder);
  const filteredLayRecords = layRecords.filter(lr => 
    selectedCutPlan ? lr.cutPlanId === selectedCutPlan : orderCutPlans.some(cp => cp.id === lr.cutPlanId)
  );

  // Calculate totals
  const calculateTotals = () => {
    const records = filteredLayRecords;
    return {
      totalSystemLength: records.reduce((sum, r) => sum + r.systemRollLength, 0),
      totalActualLays: records.reduce((sum, r) => sum + r.actualLays, 0),
      totalLayedMts: records.reduce((sum, r) => sum + r.layedMts, 0),
      totalOverlap: records.reduce((sum, r) => sum + r.overlapYards, 0),
      totalShortage: records.reduce((sum, r) => sum + r.rollShortageIncrease, 0),
      totalDamage: records.reduce((sum, r) => sum + r.damage, 0),
      totalUsage: records.reduce((sum, r) => sum + r.totalUsage, 0),
      totalRollEnd: records.reduce((sum, r) => sum + r.rollEnd, 0),
      totalBigEnd: records.reduce((sum, r) => sum + r.bigEnd, 0),
      totalUnusable: records.reduce((sum, r) => sum + r.unusableRollEnd, 0),
    };
  };

  // Calculate fabric summary
  const getFabricSummary = () => {
    if (!order) return null;

    const shellRecords = layRecords.filter(lr => {
      const cp = cutPlans.find(c => c.id === lr.cutPlanId);
      return cp?.orderId === selectedOrder;
    });

    const totalReceiving = fabricRolls
      .filter(r => r.fabricType === 'SHELL')
      .reduce((sum, r) => sum + r.systemLength, 0);

    const totalUsage = shellRecords.reduce((sum, r) => sum + r.totalUsage, 0);
    const totalWastage = shellRecords.reduce((sum, r) => sum + r.overlapYards + r.damage + r.unusableRollEnd, 0);

    return {
      totalReceiving,
      totalUsage,
      balance: totalReceiving - totalUsage,
      wastage: totalWastage,
      wastagePercent: totalUsage > 0 ? ((totalWastage / totalUsage) * 100).toFixed(2) : 0,
    };
  };

  const handleAddRoll = () => {
    if (!newRoll.rollNo || newRoll.systemLength <= 0) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    addFabricRoll({
      id: `roll-${Date.now()}`,
      rollNo: newRoll.rollNo,
      fabricType: newRoll.fabricType,
      systemLength: newRoll.systemLength,
      receivedDate: new Date().toISOString().split('T')[0],
      status: 'available',
    });

    setNewRoll({ rollNo: '', fabricType: 'SHELL', systemLength: 0 });
    setIsRollDialogOpen(false);
    toast({ title: 'Fabric roll added!' });
  };

  const handleAddLayRecord = () => {
    if (!selectedCutPlan || !newLayRecord.rollNo) {
      toast({ title: 'Please select a cut plan and enter roll number', variant: 'destructive' });
      return;
    }

    const cp = cutPlans.find(c => c.id === selectedCutPlan);
    if (!cp) return;

    const layedMts = (newLayRecord.actualLays || 0) * (newLayRecord.markerLength || 0);
    const totalUsage = layedMts + (newLayRecord.overlapYards || 0);

    addLayRecord({
      id: `lay-${Date.now()}`,
      cutPlanId: selectedCutPlan,
      cutNo: cp.cutNo,
      shade: cp.shade,
      rollNo: newLayRecord.rollNo || '',
      systemRollLength: newLayRecord.systemRollLength || 0,
      actualLays: newLayRecord.actualLays || 0,
      markerLength: newLayRecord.markerLength || cp.markerLength,
      layedMts,
      overlapYards: newLayRecord.overlapYards || 0,
      rollShortageIncrease: newLayRecord.rollShortageIncrease || 0,
      rollEndNextPly1st: newLayRecord.rollEndNextPly1st || 0,
      damage: newLayRecord.damage || 0,
      rollEndNextPly2nd: newLayRecord.rollEndNextPly2nd || 0,
      recutReturn: newLayRecord.recutReturn || 0,
      unusableRollEnd: newLayRecord.unusableRollEnd || 0,
      totalUsage,
      rollEnd: newLayRecord.rollEnd || 0,
      bigEnd: newLayRecord.bigEnd || 0,
      remarks: newLayRecord.remarks || '',
    });

    setNewLayRecord({
      rollNo: '',
      systemRollLength: 0,
      actualLays: 0,
      markerLength: 0,
      overlapYards: 0,
      rollShortageIncrease: 0,
      rollEndNextPly1st: 0,
      damage: 0,
      rollEndNextPly2nd: 0,
      recutReturn: 0,
      unusableRollEnd: 0,
      rollEnd: 0,
      bigEnd: 0,
      remarks: '',
    });
    setIsLayDialogOpen(false);
    toast({ title: 'Lay record added!' });
  };

  const totals = calculateTotals();
  const summary = getFabricSummary();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Fabric Reconciliation</h1>
            <p className="text-muted-foreground">Track fabric usage, wastage, and balance per cut</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isRollDialogOpen} onOpenChange={setIsRollDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  Add Roll
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Fabric Roll</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Roll Number</Label>
                    <Input
                      value={newRoll.rollNo}
                      onChange={(e) => setNewRoll(prev => ({ ...prev, rollNo: e.target.value }))}
                      placeholder="e.g., 1352"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fabric Type</Label>
                    <Select
                      value={newRoll.fabricType}
                      onValueChange={(v) => setNewRoll(prev => ({ ...prev, fabricType: v as 'SHELL' | 'FUSING' | 'TAB' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SHELL">Shell</SelectItem>
                        <SelectItem value="FUSING">Fusing</SelectItem>
                        <SelectItem value="TAB">Tab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>System Length (m)</Label>
                    <Input
                      type="number"
                      value={newRoll.systemLength}
                      onChange={(e) => setNewRoll(prev => ({ ...prev, systemLength: Number(e.target.value) }))}
                    />
                  </div>
                  <Button onClick={handleAddRoll} className="w-full gradient-primary text-primary-foreground">
                    Add Roll
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isLayDialogOpen} onOpenChange={setIsLayDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lay Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Add Lay Record</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Roll No</Label>
                      <Input
                        value={newLayRecord.rollNo}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, rollNo: e.target.value }))}
                        placeholder="e.g., 1352"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>System Roll Length (m)</Label>
                      <Input
                        type="number"
                        value={newLayRecord.systemRollLength}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, systemRollLength: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Actual Lays</Label>
                      <Input
                        type="number"
                        value={newLayRecord.actualLays}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, actualLays: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Marker Length (m)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={newLayRecord.markerLength || cutPlan?.markerLength || 0}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, markerLength: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Overlap (yards)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newLayRecord.overlapYards}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, overlapYards: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Roll Shortage/Increase</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newLayRecord.rollShortageIncrease}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, rollShortageIncrease: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Damage (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newLayRecord.damage}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, damage: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unusable Roll End</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newLayRecord.unusableRollEnd}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, unusableRollEnd: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Roll End Next Ply (1st)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newLayRecord.rollEndNextPly1st}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, rollEndNextPly1st: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Roll End Next Ply (2nd)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newLayRecord.rollEndNextPly2nd}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, rollEndNextPly2nd: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Roll End (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newLayRecord.rollEnd}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, rollEnd: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Big End (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newLayRecord.bigEnd}
                        onChange={(e) => setNewLayRecord(prev => ({ ...prev, bigEnd: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Input
                      value={newLayRecord.remarks}
                      onChange={(e) => setNewLayRecord(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Any notes..."
                    />
                  </div>

                  <Button onClick={handleAddLayRecord} className="w-full gradient-primary text-primary-foreground">
                    Add Lay Record
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Order Filter */}
        <Card className="shadow-card">
          <CardContent className="py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Filter by Order</Label>
                <Select value={selectedOrder || "all"} onValueChange={(v) => { setSelectedOrder(v === "all" ? "" : v); setSelectedCutPlan(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.orderNumber} - {o.styleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filter by Cut Plan</Label>
                <Select value={selectedCutPlan || "all"} onValueChange={(v) => setSelectedCutPlan(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cut Plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cut Plans</SelectItem>
                    {orderCutPlans.map((cp) => (
                      <SelectItem key={cp.id} value={cp.id}>
                        Cut #{cp.cutNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fabric Type</Label>
                <Select value={fabricType} onValueChange={(v) => setFabricType(v as 'SHELL' | 'FUSING' | 'TAB')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHELL">Shell</SelectItem>
                    <SelectItem value="FUSING">Fusing</SelectItem>
                    <SelectItem value="TAB">Tab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Receiving</p>
                    <p className="text-xl font-bold font-mono">{summary.totalReceiving.toFixed(2)}m</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Scissors className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Usage</p>
                    <p className="text-xl font-bold font-mono">{summary.totalUsage.toFixed(2)}m</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <TrendingUp className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-xl font-bold font-mono">{summary.balance.toFixed(2)}m</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Wastage</p>
                    <p className="text-xl font-bold font-mono">{summary.wastage.toFixed(2)}m</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Calculator className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Wastage %</p>
                    <p className="text-xl font-bold font-mono">{summary.wastagePercent}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs for different views */}
        <Tabs defaultValue="lay-records" className="space-y-4">
          <TabsList>
            <TabsTrigger value="lay-records">Lay Records</TabsTrigger>
            <TabsTrigger value="fabric-rolls">Fabric Rolls</TabsTrigger>
            <TabsTrigger value="summary-report">Summary Report</TabsTrigger>
          </TabsList>

          <TabsContent value="lay-records" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Lay Records by Cut
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Cut#</TableHead>
                        <TableHead className="font-semibold">Shade</TableHead>
                        <TableHead className="font-semibold">Roll No</TableHead>
                        <TableHead className="font-semibold text-right">Sys Length</TableHead>
                        <TableHead className="font-semibold text-right">Act Lays</TableHead>
                        <TableHead className="font-semibold text-right">Marker L</TableHead>
                        <TableHead className="font-semibold text-right">Layed MTS</TableHead>
                        <TableHead className="font-semibold text-right">Overlap</TableHead>
                        <TableHead className="font-semibold text-right">Shortage</TableHead>
                        <TableHead className="font-semibold text-right">Damage</TableHead>
                        <TableHead className="font-semibold text-right">Total Usage</TableHead>
                        <TableHead className="font-semibold text-right">Roll End</TableHead>
                        <TableHead className="font-semibold text-right">Big End</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLayRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                            No lay records found. Add lay records to track fabric usage.
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {filteredLayRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">{record.cutNo}</TableCell>
                              <TableCell>{record.shade}</TableCell>
                              <TableCell className="font-mono">{record.rollNo}</TableCell>
                              <TableCell className="text-right font-mono">{record.systemRollLength.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">{record.actualLays}</TableCell>
                              <TableCell className="text-right font-mono">{record.markerLength.toFixed(4)}</TableCell>
                              <TableCell className="text-right font-mono">{record.layedMts.toFixed(4)}</TableCell>
                              <TableCell className="text-right font-mono">{record.overlapYards.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">{record.rollShortageIncrease.toFixed(4)}</TableCell>
                              <TableCell className="text-right font-mono">{record.damage.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{record.totalUsage.toFixed(4)}</TableCell>
                              <TableCell className="text-right font-mono">{record.rollEnd.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">{record.bigEnd.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          {/* Totals Row */}
                          <TableRow className="bg-primary/5 font-semibold">
                            <TableCell colSpan={3}>TOTAL</TableCell>
                            <TableCell className="text-right font-mono">{totals.totalSystemLength.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono">{totals.totalActualLays}</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right font-mono">{totals.totalLayedMts.toFixed(4)}</TableCell>
                            <TableCell className="text-right font-mono">{totals.totalOverlap.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono">{totals.totalShortage.toFixed(4)}</TableCell>
                            <TableCell className="text-right font-mono">{totals.totalDamage.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono">{totals.totalUsage.toFixed(4)}</TableCell>
                            <TableCell className="text-right font-mono">{totals.totalRollEnd.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono">{totals.totalBigEnd.toFixed(2)}</TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fabric-rolls" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Fabric Rolls Inventory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Roll No</TableHead>
                        <TableHead className="font-semibold">Fabric Type</TableHead>
                        <TableHead className="font-semibold text-right">System Length (m)</TableHead>
                        <TableHead className="font-semibold">Received Date</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fabricRolls.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No fabric rolls added. Add rolls to track inventory.
                          </TableCell>
                        </TableRow>
                      ) : (
                        fabricRolls.map((roll) => (
                          <TableRow key={roll.id}>
                            <TableCell className="font-mono font-medium">{roll.rollNo}</TableCell>
                            <TableCell>
                              <Badge variant={roll.fabricType === 'SHELL' ? 'default' : 'secondary'}>
                                {roll.fabricType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{roll.systemLength.toFixed(2)}</TableCell>
                            <TableCell>{roll.receivedDate}</TableCell>
                            <TableCell>
                              <Badge variant={roll.status === 'available' ? 'outline' : roll.status === 'in-use' ? 'default' : 'secondary'}>
                                {roll.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary-report" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Fabric Reconciliation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order ? (
                  <div className="space-y-6">
                    {/* Order Header */}
                    <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Buyer</p>
                        <p className="font-medium">{order.customer}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Style Number</p>
                        <p className="font-medium">{order.styleNo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Style Name</p>
                        <p className="font-medium">{order.styleName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Order Qty</p>
                        <p className="font-mono font-bold text-primary">{order.totalQty}</p>
                      </div>
                    </div>

                    {/* Summary Table */}
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Fabric Description</TableHead>
                          <TableHead className="text-right">Width</TableHead>
                          <TableHead className="text-right">Requirement</TableHead>
                          <TableHead className="text-right">Receiving</TableHead>
                          <TableHead className="text-right">Wastage</TableHead>
                          <TableHead className="text-right">Usage</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">SHELL FABRIC</TableCell>
                          <TableCell className="text-right font-mono">{order.fabricWidth}cm</TableCell>
                          <TableCell className="text-right font-mono">{totals.totalLayedMts.toFixed(2)}m</TableCell>
                          <TableCell className="text-right font-mono">{summary?.totalReceiving.toFixed(2) || 0}m</TableCell>
                          <TableCell className="text-right font-mono text-destructive">{summary?.wastage.toFixed(2) || 0}m</TableCell>
                          <TableCell className="text-right font-mono">{summary?.totalUsage.toFixed(2) || 0}m</TableCell>
                          <TableCell className="text-right font-mono font-bold text-success">{summary?.balance.toFixed(2) || 0}m</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-muted/30 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Total Cut Qty</p>
                        <p className="text-2xl font-bold font-mono">{order.totalQty} pcs</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Total Fabric Used</p>
                        <p className="text-2xl font-bold font-mono">{summary?.totalUsage.toFixed(2) || 0} m</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Wastage %</p>
                        <p className="text-2xl font-bold font-mono text-destructive">{summary?.wastagePercent || 0}%</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select an order to view the reconciliation summary report.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Reconciliation;
