import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCuttingStore } from '@/store/cuttingStore';
import { SIZES, MarkerPlan } from '@/types/cutting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Printer, Ruler, FileText, ArrowRight, Zap, Layers, Package, Trash2, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const DEFAULT_PARTS = ['FRONT', 'BACK', 'SLEEVE L', 'SLEEVE R', 'COLLAR', 'POCKET'];
const MAX_PLIES = 103; // Maximum plies - cutter gets stuck above this
const RECOMMENDED_PLIES = 100; // Recommended maximum

const MarkerPlans = () => {
  const { 
    orders, markerPlans, cutPlans, laySheets, bundles, bundleGuides, 
    addMarkerPlan, deleteMarkerPlan, generateAllFromMarker, deleteCutPlan, deleteLaySheetsForCutPlan,
    deleteBundlesForCutPlan, deleteBundleGuidesForCutPlan, deleteAllForMarker
  } = useCuttingStore();
  const { toast } = useToast();
  const [expandedMarkers, setExpandedMarkers] = useState<Record<string, boolean>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerPlan | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [markerToGenerate, setMarkerToGenerate] = useState<MarkerPlan | null>(null);
  const [editingMarker, setEditingMarker] = useState<MarkerPlan | null>(null);
  
  // Form state for creating marker
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [markerLength, setMarkerLength] = useState<number>(12.5);
  const [efficiency, setEfficiency] = useState<number>(85);
  const [sizeRatios, setSizeRatios] = useState<Record<string, number>>({});

  // Generate All form state
  const [numberOfCuts, setNumberOfCuts] = useState<number>(1);
  const [pliesPerCut, setPliesPerCut] = useState<number>(RECOMMENDED_PLIES);
  const [bundleSize, setBundleSize] = useState<number>(50);
  const [selectedParts, setSelectedParts] = useState<string[]>(DEFAULT_PARTS);

  const getOrder = (orderId: string) => orders.find(o => o.id === orderId);
  const getCutPlansForMarker = (markerId: string) => cutPlans.filter(cp => cp.markerId === markerId);
  const getBundlesForCutPlan = (cutPlanId: string) => bundles.filter(b => b.cutPlanId === cutPlanId);
  const getBundleGuidesForCutPlan = (cutPlanId: string) => bundleGuides.filter(bg => bg.cutPlanId === cutPlanId);
  const getLaySheetForCutPlan = (cutPlanId: string) => laySheets.find(ls => ls.cutPlanId === cutPlanId);

  const toggleMarkerExpand = (markerId: string) => {
    setExpandedMarkers(prev => ({ ...prev, [markerId]: !prev[markerId] }));
  };

  const handleDeleteCutPlan = (cutPlanId: string, cutNo: number) => {
    deleteLaySheetsForCutPlan(cutPlanId);
    deleteBundlesForCutPlan(cutPlanId);
    deleteBundleGuidesForCutPlan(cutPlanId);
    deleteCutPlan(cutPlanId);
    toast({ title: `Cut Plan #${cutNo} and all connected documents deleted` });
  };

  const handleDeleteAllForMarker = (markerId: string, markerNo: number) => {
    deleteAllForMarker(markerId);
    toast({ title: `All documents for Marker #${markerNo} deleted` });
  };

  const handleDeleteMarkerPlan = (marker: MarkerPlan) => {
    // First delete all generated documents
    const connectedCutPlans = cutPlans.filter(cp => cp.markerId === marker.id);
    connectedCutPlans.forEach(cp => {
      deleteLaySheetsForCutPlan(cp.id);
      deleteBundlesForCutPlan(cp.id);
      deleteBundleGuidesForCutPlan(cp.id);
      deleteCutPlan(cp.id);
    });
    // Then delete the marker itself
    deleteMarkerPlan(marker.id);
    toast({ title: `Marker #${marker.markerNo} and all related documents deleted` });
  };

  const handleEditMarker = (marker: MarkerPlan) => {
    setEditingMarker(marker);
    setSelectedOrder(marker.orderId);
    setMarkerLength(marker.markerLength);
    setEfficiency(marker.efficiency);
    setSizeRatios(marker.sizes);
    setIsDialogOpen(true);
  };

  const handleSaveMarker = () => {
    if (!selectedOrder) {
      toast({ title: 'Please select an order', variant: 'destructive' });
      return;
    }

    const order = getOrder(selectedOrder);
    if (!order) return;

    if (editingMarker) {
      // Update existing marker - delete old and create new with same number
      deleteMarkerPlan(editingMarker.id);
      const updatedMarker: MarkerPlan = {
        id: `m-${Date.now()}`,
        orderId: selectedOrder,
        markerNo: editingMarker.markerNo,
        markerLength,
        fabricWidth: order.fabricWidth,
        efficiency,
        sizes: sizeRatios,
        createdAt: editingMarker.createdAt
      };
      addMarkerPlan(updatedMarker);
      toast({ title: `Marker #${editingMarker.markerNo} updated!` });
    } else {
      // Create new marker
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
      toast({ title: `Marker Plan #${markerNo} created!` });
    }

    setIsDialogOpen(false);
    setEditingMarker(null);
    setSizeRatios({});
  };

  const openGenerateDialog = (marker: MarkerPlan) => {
    setMarkerToGenerate(marker);
    setIsGenerateDialogOpen(true);
  };

  const handleGenerateAll = () => {
    if (!markerToGenerate) return;

    if (selectedParts.length === 0) {
      toast({ title: 'Please select at least one part', variant: 'destructive' });
      return;
    }

    const result = generateAllFromMarker(
      markerToGenerate.id,
      numberOfCuts,
      pliesPerCut,
      bundleSize,
      selectedParts
    );

    setIsGenerateDialogOpen(false);
    setMarkerToGenerate(null);

    toast({
      title: 'All Documents Generated!',
      description: `Created ${result.cutPlans} Cut Plans, ${result.laySheets} Lay Sheets, ${result.bundleGuides} Bundle Guides, ${result.bundles} Bundle Tags`,
    });
  };

  const togglePart = (part: string) => {
    setSelectedParts(prev => 
      prev.includes(part) 
        ? prev.filter(p => p !== part)
        : [...prev, part]
    );
  };

  // Calculate preview totals
  const getPreviewTotals = () => {
    if (!markerToGenerate) return null;
    
    const totalRatio = Object.values(markerToGenerate.sizes).reduce((sum, v) => sum + v, 0);
    const qtyPerCut = totalRatio * pliesPerCut;
    const totalQty = qtyPerCut * numberOfCuts;
    const layLength = markerToGenerate.markerLength + 0.0254;
    const totalFabric = layLength * pliesPerCut * numberOfCuts;
    
    // Calculate bundles
    let totalBundles = 0;
    Object.values(markerToGenerate.sizes).forEach(ratio => {
      if (ratio > 0) {
        const sizeQty = ratio * pliesPerCut * numberOfCuts;
        totalBundles += Math.ceil(sizeQty / bundleSize);
      }
    });

    return {
      qtyPerCut,
      totalQty,
      totalFabric: totalFabric.toFixed(2),
      totalBundles,
      totalTags: totalBundles * selectedParts.length
    };
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Marker Plans</h1>
            <p className="text-muted-foreground">Create marker ratios and generate all connected documents</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingMarker(null);
              setSizeRatios({});
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground" onClick={() => {
                setEditingMarker(null);
                setSelectedOrder('');
                setMarkerLength(12.5);
                setEfficiency(85);
                setSizeRatios({});
              }}>
                <Plus className="mr-2 h-4 w-4" />
                New Marker Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingMarker ? `Edit Marker #${editingMarker.markerNo}` : 'Create Marker Plan'}</DialogTitle>
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

                <Button onClick={handleSaveMarker} className="gradient-primary text-primary-foreground">
                  {editingMarker ? 'Update Marker Plan' : 'Create Marker Plan'}
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

        <Separator className="my-2" />

        {/* Section: Marker Plans Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Marker Plans ({markerPlans.length})</h2>
            <Separator className="flex-1" />
          </div>
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
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditMarker(marker)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Marker #{marker.markerNo}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will also delete all generated cut plans, lay sheets, and bundles for this marker.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMarkerPlan(marker)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedMarker(marker)}
                      >
                        <FileText className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    </div>
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

                  {/* Connected Cut Plans - Expandable */}
                  <div className="border-t border-border pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Generated Documents:</span>
                        <Badge variant="secondary">{connectedCutPlans.length} Cut Plans</Badge>
                        <Badge variant="secondary">{bundles.filter(b => connectedCutPlans.some(cp => cp.id === b.cutPlanId)).length} Bundles</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {connectedCutPlans.length > 0 && (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => toggleMarkerExpand(marker.id)}
                            >
                              {expandedMarkers[marker.id] ? (
                                <><ChevronUp className="mr-1 h-3 w-3" />Hide Details</>
                              ) : (
                                <><ChevronDown className="mr-1 h-3 w-3" />Show Details</>
                              )}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  Delete All
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete all documents for Marker #{marker.markerNo}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will delete {connectedCutPlans.length} cut plans and all connected lay sheets, bundle guides, and bundle tags.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteAllForMarker(marker.id, marker.markerNo)}>
                                    Delete All
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        <Button 
                          size="sm" 
                          onClick={() => openGenerateDialog(marker)}
                          className="bg-gradient-to-r from-success to-primary text-primary-foreground hover:opacity-90"
                        >
                          <Zap className="mr-1 h-3 w-3" />
                          Generate All
                        </Button>
                      </div>
                    </div>
                    
                    {/* Expanded Cut Plans List */}
                    {expandedMarkers[marker.id] && connectedCutPlans.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {connectedCutPlans.map((cp) => {
                          const cpBundles = getBundlesForCutPlan(cp.id);
                          const cpGuides = getBundleGuidesForCutPlan(cp.id);
                          const cpLaySheet = getLaySheetForCutPlan(cp.id);
                          
                          return (
                            <div key={cp.id} className="rounded-lg border border-border bg-muted/20 p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div>
                                    <span className="font-semibold text-primary">Cut #{cp.cutNo}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({cp.status})</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Plies: <span className="font-mono">{cp.plies}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Qty: <span className="font-mono">{cp.totalQty}</span>
                                  </div>
                                  {cpLaySheet && (
                                    <Badge variant="outline" className="text-xs">
                                      Lay Sheet ✓
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {cpGuides.length} Guides
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {cpBundles.length} Tags
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Cut Plan #{cp.cutNo}?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will also delete the lay sheet, {cpGuides.length} bundle guides, and {cpBundles.length} bundle tags.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteCutPlan(cp.id, cp.cutNo)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                              
                              {/* Size breakdown */}
                              <div className="mt-2 flex flex-wrap gap-1">
                                {Object.entries(cp.sizes).filter(([_, qty]) => qty > 0).map(([size, qty]) => (
                                  <Badge key={size} variant="secondary" className="font-mono text-xs">
                                    {size}: {qty}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </div>

        {/* Generate All Dialog */}
        {markerToGenerate && (
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-success" />
                  Generate All Documents - Marker #{markerToGenerate.markerNo}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Cutting Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      Number of Cuts
                    </Label>
                    <Input 
                      type="number" 
                      min={1}
                      max={50}
                      value={numberOfCuts}
                      onChange={(e) => setNumberOfCuts(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">How many times to cut this marker</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      Plies per Cut
                      {pliesPerCut > MAX_PLIES && (
                        <Badge variant="destructive" className="ml-2">Exceeds Max!</Badge>
                      )}
                      {pliesPerCut > RECOMMENDED_PLIES && pliesPerCut <= MAX_PLIES && (
                        <Badge variant="secondary" className="ml-2 bg-warning/20 text-warning">High</Badge>
                      )}
                    </Label>
                    <Input 
                      type="number" 
                      min={1}
                      max={MAX_PLIES}
                      value={pliesPerCut}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (value > MAX_PLIES) {
                          setPliesPerCut(MAX_PLIES);
                        } else {
                          setPliesPerCut(value);
                        }
                      }}
                      className={pliesPerCut > RECOMMENDED_PLIES ? 'border-warning' : ''}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: {RECOMMENDED_PLIES} plies max (cutter limit: {MAX_PLIES})
                    </p>
                    {pliesPerCut > RECOMMENDED_PLIES && (
                      <p className="text-xs text-warning">
                        ⚠️ High ply count may cause cutter to get stuck in fabric
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Bundle Size
                  </Label>
                  <Input 
                    type="number" 
                    min={1}
                    max={200}
                    value={bundleSize}
                    onChange={(e) => setBundleSize(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Pieces per bundle</p>
                </div>

                {/* Parts Selection */}
                <div className="space-y-2">
                  <Label>Select Parts (for Bundle Tags)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {DEFAULT_PARTS.map((part) => (
                      <div key={part} className="flex items-center space-x-2">
                        <Checkbox 
                          id={part}
                          checked={selectedParts.includes(part)}
                          onCheckedChange={() => togglePart(part)}
                        />
                        <label htmlFor={part} className="text-sm cursor-pointer">{part}</label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Calculations */}
                {(() => {
                  const preview = getPreviewTotals();
                  if (!preview) return null;
                  
                  return (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <h4 className="font-semibold mb-3 text-primary">Preview Calculations</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Qty per Cut</p>
                          <p className="font-mono font-bold">{preview.qtyPerCut}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Qty</p>
                          <p className="font-mono font-bold text-primary">{preview.totalQty}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fabric (m)</p>
                          <p className="font-mono font-bold">{preview.totalFabric}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Bundles</p>
                          <p className="font-mono font-bold">{preview.totalBundles}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Bundle Tags</p>
                          <p className="font-mono font-bold text-success">{preview.totalTags}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* What will be generated */}
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h4 className="font-semibold mb-2">Documents to Generate:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>✓ {numberOfCuts} Cut Plan(s)</li>
                    <li>✓ {numberOfCuts} Lay Sheet(s)</li>
                    <li>✓ Bundle Guides for each size</li>
                    <li>✓ Bundle Tags for {selectedParts.length} part(s)</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleGenerateAll}
                    className="bg-gradient-to-r from-success to-primary text-primary-foreground hover:opacity-90"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Generate All Documents
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

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
