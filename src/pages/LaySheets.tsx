import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCuttingStore } from '@/store/cuttingStore';
import { SIZES, LaySheet, CutPlan } from '@/types/cutting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Layers, Plus, Download, FileText, Scissors } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportLaySheetPDF } from '@/lib/pdfExport';

interface SampleLaySheet {
  id: string;
  layNo: number;
  customer: string;
  line: string;
  markerName: string;
  fabric: string;
  fabricWidth: number;
  style: string;
  gmt: string;
  color: string;
  part: string;
  plies: number;
  plyLength: number;
  totalUsage: number;
  sizeRatios: { [size: string]: number };
  preparedBy: string;
  checkedBy: string;
  authorizedBy: string;
  layPlanner: string;
  masterCutter: string;
  spreaderMachine: string;
  createdAt: string;
}

const LaySheets = () => {
  const { laySheets, cutPlans, orders, addLaySheet } = useCuttingStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('bulk');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sampleLaySheets, setSampleLaySheets] = useState<SampleLaySheet[]>([]);
  const [selectedLaySheet, setSelectedLaySheet] = useState<SampleLaySheet | null>(null);

  // Form state for sample lay sheet
  const [formData, setFormData] = useState<Partial<SampleLaySheet>>({
    customer: '',
    line: 'CUT NO. 1',
    markerName: 'M1',
    fabric: '',
    fabricWidth: 145,
    style: '',
    gmt: 'FAB',
    color: '',
    part: '',
    plies: 1,
    plyLength: 1.4,
    totalUsage: 1.4254,
    sizeRatios: {},
    preparedBy: '',
    checkedBy: '',
    authorizedBy: '',
    layPlanner: '',
    masterCutter: '',
    spreaderMachine: '',
  });

  const getCutPlan = (cutPlanId: string) => cutPlans.find(cp => cp.id === cutPlanId);
  const getOrder = (orderId: string) => orders.find(o => o.id === orderId);

  const handleSizeRatioChange = (sizeCode: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      sizeRatios: {
        ...prev.sizeRatios,
        [sizeCode]: value
      }
    }));
  };

  const calculateTotalRatio = () => {
    return Object.values(formData.sizeRatios || {}).reduce((sum, v) => sum + (v || 0), 0);
  };

  const handleCreateSampleLaySheet = () => {
    const newLaySheet: SampleLaySheet = {
      id: `sls-${Date.now()}`,
      layNo: sampleLaySheets.length + 1,
      customer: formData.customer || '',
      line: formData.line || 'CUT NO. 1',
      markerName: formData.markerName || 'M1',
      fabric: formData.fabric || '',
      fabricWidth: formData.fabricWidth || 145,
      style: formData.style || '',
      gmt: formData.gmt || 'FAB',
      color: formData.color || '',
      part: formData.part || '',
      plies: formData.plies || 1,
      plyLength: formData.plyLength || 1.4,
      totalUsage: formData.totalUsage || (formData.plyLength || 1.4) * (formData.plies || 1),
      sizeRatios: formData.sizeRatios || {},
      preparedBy: formData.preparedBy || '',
      checkedBy: formData.checkedBy || '',
      authorizedBy: formData.authorizedBy || '',
      layPlanner: formData.layPlanner || '',
      masterCutter: formData.masterCutter || '',
      spreaderMachine: formData.spreaderMachine || '',
      createdAt: new Date().toISOString(),
    };

    setSampleLaySheets(prev => [...prev, newLaySheet]);
    setIsCreateOpen(false);
    setFormData({
      customer: '',
      line: 'CUT NO. 1',
      markerName: 'M1',
      fabric: '',
      fabricWidth: 145,
      style: '',
      gmt: 'FAB',
      color: '',
      part: '',
      plies: 1,
      plyLength: 1.4,
      totalUsage: 1.4254,
      sizeRatios: {},
      preparedBy: '',
      checkedBy: '',
      authorizedBy: '',
      layPlanner: '',
      masterCutter: '',
      spreaderMachine: '',
    });
    toast({ title: 'Sample lay sheet created' });
  };

  const exportSampleLaySheetPDF = async (laySheet: SampleLaySheet) => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CUTTING LAY SHEET', doc.internal.pageSize.width / 2, 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`PRINT DATE: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 14, 15, { align: 'right' });

    // Company logo area
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GHOUSH', 14, 30);

    // Customer and Line info
    autoTable(doc, {
      startY: 35,
      body: [
        ['CUSTOMER', laySheet.customer, 'LINE', laySheet.line],
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 25 },
        2: { fontStyle: 'bold', cellWidth: 25 },
      },
    });

    // Marker and fabric info
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      body: [
        ['MARKER NAME:', laySheet.markerName, 'WIDTH:', `${laySheet.fabricWidth}`],
        ['FABRICK:', laySheet.fabric, 'STYLE:', laySheet.style],
        ['GMT:', laySheet.gmt, 'COLOR:', laySheet.color],
        ['PART:', laySheet.part, '', ''],
      ],
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 30 },
        2: { fontStyle: 'bold', cellWidth: 25 },
      },
    });

    // Size ratio table
    const activeSizes = SIZES.filter(s => (laySheet.sizeRatios[s.code] || 0) > 0);
    const sizeHeaders = activeSizes.length > 0 
      ? ['SIZE', ...activeSizes.map(s => s.code), 'TOTAL']
      : ['SIZE', 'SS', 'SR', 'SL', 'MS', 'MR', 'ML', 'LS', 'LR', 'LL', 'XLS', 'XLR', 'XLL', 'XXLS', 'XXLR', 'XXLL', 'TOTAL'];
    
    const sizeValues = activeSizes.length > 0
      ? ['RATIO', ...activeSizes.map(s => (laySheet.sizeRatios[s.code] || 0).toString()), calculateTotalRatio().toString()]
      : ['RATIO', ...SIZES.map(s => (laySheet.sizeRatios[s.code] || 0).toString()), calculateTotalRatio().toString()];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [sizeHeaders],
      body: [sizeValues],
      theme: 'grid',
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 7, halign: 'center' },
    });

    // Plies and length info
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      body: [
        ['NO OF PLIES:', laySheet.plies.toString()],
        ['PLY LENGTH:', `MTR ${laySheet.plyLength.toFixed(2)}`],
      ],
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold' } },
    });

    // Lay length and total usage
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      head: [['LAY LENGTH', 'TOTAL USAGE']],
      body: [[laySheet.plyLength.toFixed(4), laySheet.totalUsage.toFixed(4)]],
      theme: 'grid',
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
      styles: { fontSize: 9, halign: 'center' },
    });

    // Checklist
    const checklistY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.text('1.LENGHT', 14, checklistY);
    doc.text('2.RATIO', 14, checklistY + 6);
    doc.text('3.WIDTH', 14, checklistY + 12);
    doc.text('4.QUNTITY', 14, checklistY + 18);
    doc.text('5.CUT NO', 14, checklistY + 24);

    // Signature section
    const signatureY = checklistY + 40;
    autoTable(doc, {
      startY: signatureY,
      body: [
        ['PERPARED BY:', 'SPREDER MACHINE'],
        ['CHECKED BY:', 'AUTHORISED BY'],
        ['Lay planer:', 'OPERATOR'],
        ['Master cutter:', 'Cutting Manager'],
      ],
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: { 
        0: { cellWidth: 60 },
        1: { cellWidth: 60 },
      },
    });

    doc.save(`SampleLaySheet_${laySheet.layNo}_${laySheet.style || 'sample'}.pdf`);
    toast({ title: 'PDF exported successfully' });
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Lay Sheets</h1>
            <p className="text-muted-foreground">Manage bulk order and sample lay sheets</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bulk" className="flex gap-2">
              <Layers className="h-4 w-4" />
              Bulk Orders
            </TabsTrigger>
            <TabsTrigger value="sample" className="flex gap-2">
              <Scissors className="h-4 w-4" />
              Samples
            </TabsTrigger>
          </TabsList>

          {/* Bulk Orders Tab */}
          <TabsContent value="bulk" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Layers className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{laySheets.length}</p>
                      <p className="text-sm text-muted-foreground">Total Lay Sheets</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Bulk Order Lay Sheets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Lay No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Cut Plan</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Order</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Plies</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Lay Length</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Fabric Roll</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {laySheets.map((ls) => {
                        const cutPlan = getCutPlan(ls.cutPlanId);
                        const order = cutPlan ? getOrder(cutPlan.orderId) : null;
                        return (
                          <tr key={ls.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="font-mono">LS#{ls.layNo}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              {cutPlan ? (
                                <Badge variant="secondary" className="font-mono">Cut #{cutPlan.cutNo}</Badge>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">{order?.orderNumber || '-'}</td>
                            <td className="px-4 py-3 text-right font-mono">{ls.plies}</td>
                            <td className="px-4 py-3 text-right font-mono">{ls.layLength}m</td>
                            <td className="px-4 py-3 text-sm">{ls.fabricRoll || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (cutPlan && order) {
                                    exportLaySheetPDF(ls, cutPlan, order);
                                  }
                                }}
                                disabled={!cutPlan || !order}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {laySheets.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                            No bulk lay sheets. Create a cut plan to generate lay sheets.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sample Tab */}
          <TabsContent value="sample" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary text-primary-foreground">
                    <Plus className="mr-2 h-4 w-4" />
                    New Sample Lay Sheet
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Sample Lay Sheet</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Customer</Label>
                        <Input
                          value={formData.customer}
                          onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                          placeholder="Customer name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Line / Cut No</Label>
                        <Input
                          value={formData.line}
                          onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                          placeholder="CUT NO. 1"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Marker & Fabric Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Marker Name</Label>
                        <Input
                          value={formData.markerName}
                          onChange={(e) => setFormData({ ...formData, markerName: e.target.value })}
                          placeholder="M1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Width (cm)</Label>
                        <Input
                          type="number"
                          value={formData.fabricWidth}
                          onChange={(e) => setFormData({ ...formData, fabricWidth: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fabric</Label>
                        <Input
                          value={formData.fabric}
                          onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                          placeholder="sample"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Style</Label>
                        <Input
                          value={formData.style}
                          onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                          placeholder="Style name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>GMT</Label>
                        <Input
                          value={formData.gmt}
                          onChange={(e) => setFormData({ ...formData, gmt: e.target.value })}
                          placeholder="FAB"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <Input
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          placeholder="Color"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Part</Label>
                        <Input
                          value={formData.part}
                          onChange={(e) => setFormData({ ...formData, part: e.target.value })}
                          placeholder="Part name"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Size Ratios */}
                    <div className="space-y-3">
                      <Label>Size Ratios</Label>
                      <div className="grid grid-cols-8 gap-2">
                        {SIZES.slice(0, 8).map(size => (
                          <div key={size.code} className="space-y-1">
                            <Label className="text-xs">{size.code}</Label>
                            <Input
                              type="number"
                              min="0"
                              className="text-center text-sm"
                              value={formData.sizeRatios?.[size.code] || 0}
                              onChange={(e) => handleSizeRatioChange(size.code, parseInt(e.target.value) || 0)}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-8 gap-2">
                        {SIZES.slice(8).map(size => (
                          <div key={size.code} className="space-y-1">
                            <Label className="text-xs">{size.code}</Label>
                            <Input
                              type="number"
                              min="0"
                              className="text-center text-sm"
                              value={formData.sizeRatios?.[size.code] || 0}
                              onChange={(e) => handleSizeRatioChange(size.code, parseInt(e.target.value) || 0)}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <Badge variant="secondary">Total: {calculateTotalRatio()}</Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Plies & Length */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>No. of Plies</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.plies}
                          onChange={(e) => setFormData({ ...formData, plies: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ply Length (m)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.plyLength}
                          onChange={(e) => setFormData({ ...formData, plyLength: parseFloat(e.target.value) || 1.4 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Usage (m)</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={formData.totalUsage}
                          onChange={(e) => setFormData({ ...formData, totalUsage: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateSampleLaySheet} className="gradient-primary text-primary-foreground">
                        Create Lay Sheet
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Sample Lay Sheets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Lay No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Style</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Marker</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Plies</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Total Usage</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sampleLaySheets.map((ls) => (
                        <tr key={ls.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-mono">LS#{ls.layNo}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">{ls.customer || '-'}</td>
                          <td className="px-4 py-3 text-sm">{ls.style || '-'}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{ls.markerName}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{ls.plies}</td>
                          <td className="px-4 py-3 text-right font-mono">{ls.totalUsage.toFixed(4)}m</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(ls.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => exportSampleLaySheetPDF(ls)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {sampleLaySheets.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                            No sample lay sheets yet. Click "New Sample Lay Sheet" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default LaySheets;
