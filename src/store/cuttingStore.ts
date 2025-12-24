import { create } from 'zustand';
import { Order, CutPlan, Bundle, Ratio, MarkerPlan, LaySheet, BundleGuide, SIZES, FabricRoll, LayRecord } from '@/types/cutting';

interface CuttingStore {
  orders: Order[];
  cutPlans: CutPlan[];
  bundles: Bundle[];
  ratios: Ratio[];
  markerPlans: MarkerPlan[];
  laySheets: LaySheet[];
  bundleGuides: BundleGuide[];
  fabricRolls: FabricRoll[];
  layRecords: LayRecord[];
  
  // Order Actions
  addOrder: (order: Order) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  
  // Marker Plan Actions
  addMarkerPlan: (marker: MarkerPlan) => void;
  deleteMarkerPlan: (id: string) => void;
  
  // Cut Plan Actions
  addCutPlan: (cutPlan: CutPlan) => void;
  updateCutPlan: (id: string, cutPlan: Partial<CutPlan>) => void;
  deleteCutPlan: (id: string) => void;
  
  // Lay Sheet Actions
  addLaySheet: (laySheet: LaySheet) => void;
  updateLaySheet: (id: string, laySheet: Partial<LaySheet>) => void;
  
  // Bundle Actions
  addBundle: (bundle: Bundle) => void;
  addBundles: (bundles: Bundle[]) => void;
  clearBundlesForCutPlan: (cutPlanId: string) => void;
  
  // Bundle Guide Actions
  addBundleGuide: (guide: BundleGuide) => void;
  addBundleGuides: (guides: BundleGuide[]) => void;
  
  // Lay Sheet Actions (delete)
  deleteLaySheet: (id: string) => void;
  deleteLaySheetsForCutPlan: (cutPlanId: string) => void;
  
  // Delete bundles and guides for marker
  deleteBundlesForCutPlan: (cutPlanId: string) => void;
  deleteBundleGuidesForCutPlan: (cutPlanId: string) => void;
  deleteAllForMarker: (markerId: string) => void;
  
  // Ratio Actions
  addRatio: (ratio: Ratio) => void;
  deleteRatio: (id: string) => void;
  
  // Fabric Roll Actions
  addFabricRoll: (roll: FabricRoll) => void;
  updateFabricRoll: (id: string, roll: Partial<FabricRoll>) => void;
  deleteFabricRoll: (id: string) => void;
  
  // Lay Record Actions
  addLayRecord: (record: LayRecord) => void;
  updateLayRecord: (id: string, record: Partial<LayRecord>) => void;
  deleteLayRecord: (id: string) => void;
  
  // Generate connected documents
  generateDocumentsFromCutPlan: (cutPlanId: string, bundleSize: number, parts: string[]) => void;
  
  // Generate ALL documents from a marker plan
  generateAllFromMarker: (
    markerId: string,
    numberOfCuts: number,
    pliesPerCut: number,
    bundleSize: number,
    parts: string[]
  ) => { cutPlans: number; laySheets: number; bundleGuides: number; bundles: number };
}

// Sample data based on the Excel
const sampleOrder: Order = {
  id: '1',
  orderNumber: 'RSGF-3000',
  customer: 'Royal Saudi Ground Force',
  styleNo: 'BDU NO4(B)',
  styleName: 'RSGF OF',
  shade: 'X',
  totalQty: 3000,
  sizeQuantities: {
    SS: 76, SR: 87, SL: 92,
    MS: 303, MR: 315, ML: 316,
    LS: 318, LR: 321, LL: 327,
    XLS: 207, XLR: 207, XLL: 209,
    XXLS: 79, XXLR: 76, XXLL: 67
  },
  fabricWidth: 145,
  orderDate: '2025-11-12',
  deliveryDate: '2025-12-30',
  status: 'in-progress'
};

const sampleMarkerPlans: MarkerPlan[] = [
  {
    id: 'm1',
    orderId: '1',
    markerNo: 1,
    markerLength: 12.9,
    fabricWidth: 145,
    efficiency: 85,
    sizes: { MS: 1, MR: 1, ML: 1, XLS: 1, XLR: 1, XLL: 1 },
    createdAt: '2025-11-12'
  },
  {
    id: 'm2',
    orderId: '1',
    markerNo: 2,
    markerLength: 12.74,
    fabricWidth: 145,
    efficiency: 86,
    sizes: { MR: 1, ML: 1, LS: 1, LR: 1, LL: 1, XLS: 1 },
    createdAt: '2025-11-12'
  },
  {
    id: 'm3',
    orderId: '1',
    markerNo: 3,
    markerLength: 12.89,
    fabricWidth: 145,
    efficiency: 85,
    sizes: { MS: 1, MR: 1, ML: 1, LL: 1, XLR: 1, XLL: 1 },
    createdAt: '2025-11-12'
  }
];

const sampleCutPlans: CutPlan[] = [
  {
    id: '1',
    orderId: '1',
    markerId: 'm1',
    cutNo: 1,
    shade: 'X',
    plies: 100,
    markerLength: 12.9,
    layLength: 12.9254,
    sizes: { MS: 100, MR: 100, ML: 100, XLS: 100, XLR: 100, XLL: 100 },
    totalQty: 600,
    fabricUsed: 1292.54,
    date: '2025-11-12',
    status: 'completed'
  },
  {
    id: '2',
    orderId: '1',
    markerId: 'm2',
    cutNo: 2,
    shade: 'X',
    plies: 100,
    markerLength: 12.74,
    layLength: 12.7654,
    sizes: { MR: 100, ML: 100, LS: 100, LR: 100, LL: 100, XLS: 100 },
    totalQty: 600,
    fabricUsed: 1276.54,
    date: '2025-11-12',
    status: 'cutting'
  },
  {
    id: '3',
    orderId: '1',
    markerId: 'm3',
    cutNo: 3,
    shade: 'X',
    plies: 100,
    markerLength: 12.89,
    layLength: 12.9154,
    sizes: { MS: 100, MR: 100, ML: 100, LL: 100, XLR: 100, XLL: 100 },
    totalQty: 600,
    fabricUsed: 1291.54,
    date: '2025-11-12',
    status: 'planned'
  }
];

const sampleLaySheets: LaySheet[] = [
  { id: 'l1', cutPlanId: '1', layNo: 1, plies: 100, layLength: 12.9254, fabricRoll: 'ROLL-001' },
  { id: 'l2', cutPlanId: '2', layNo: 1, plies: 100, layLength: 12.7654, fabricRoll: 'ROLL-002' },
  { id: 'l3', cutPlanId: '3', layNo: 1, plies: 100, layLength: 12.9154, fabricRoll: 'ROLL-003' }
];

export const useCuttingStore = create<CuttingStore>((set, get) => ({
  orders: [sampleOrder],
  cutPlans: sampleCutPlans,
  bundles: [],
  ratios: [],
  markerPlans: sampleMarkerPlans,
  laySheets: sampleLaySheets,
  bundleGuides: [],
  fabricRolls: [],
  layRecords: [],
  
  // Order Actions
  addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
  updateOrder: (id, updates) => set((state) => ({
    orders: state.orders.map(o => o.id === id ? { ...o, ...updates } : o)
  })),
  deleteOrder: (id) => {
    const state = get();
    
    // Get all cut plan IDs for this order
    const relatedCutPlanIds = state.cutPlans
      .filter(cp => cp.orderId === id)
      .map(cp => cp.id);
    
    set((s) => ({
      orders: s.orders.filter(o => o.id !== id),
      markerPlans: s.markerPlans.filter(mp => mp.orderId !== id),
      cutPlans: s.cutPlans.filter(cp => cp.orderId !== id),
      // LayRecord uses cutPlanId, not orderId
      layRecords: s.layRecords.filter(lr => !relatedCutPlanIds.includes(lr.cutPlanId)),
      bundles: s.bundles.filter(b => !relatedCutPlanIds.includes(b.cutPlanId)),
      bundleGuides: s.bundleGuides.filter(bg => !relatedCutPlanIds.includes(bg.cutPlanId)),
      laySheets: s.laySheets.filter(ls => !relatedCutPlanIds.includes(ls.cutPlanId)),
      // Ratio uses orderId
      ratios: s.ratios.filter(r => r.orderId !== id),
    }));
  },
  
  // Marker Plan Actions
  addMarkerPlan: (marker) => set((state) => ({ markerPlans: [...state.markerPlans, marker] })),
  deleteMarkerPlan: (id) => set((state) => ({
    markerPlans: state.markerPlans.filter(m => m.id !== id)
  })),
  
  // Cut Plan Actions
  addCutPlan: (cutPlan) => set((state) => ({ cutPlans: [...state.cutPlans, cutPlan] })),
  updateCutPlan: (id, updates) => set((state) => ({
    cutPlans: state.cutPlans.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  deleteCutPlan: (id) => set((state) => ({
    cutPlans: state.cutPlans.filter(c => c.id !== id)
  })),
  
  // Lay Sheet Actions
  addLaySheet: (laySheet) => set((state) => ({ laySheets: [...state.laySheets, laySheet] })),
  updateLaySheet: (id, updates) => set((state) => ({
    laySheets: state.laySheets.map(l => l.id === id ? { ...l, ...updates } : l)
  })),
  
  // Bundle Actions
  addBundle: (bundle) => set((state) => ({ bundles: [...state.bundles, bundle] })),
  addBundles: (bundles) => set((state) => ({ bundles: [...state.bundles, ...bundles] })),
  clearBundlesForCutPlan: (cutPlanId) => set((state) => ({
    bundles: state.bundles.filter(b => b.cutPlanId !== cutPlanId)
  })),
  
  // Bundle Guide Actions
  addBundleGuide: (guide) => set((state) => ({ bundleGuides: [...state.bundleGuides, guide] })),
  addBundleGuides: (guides) => set((state) => ({ bundleGuides: [...state.bundleGuides, ...guides] })),
  
  // Lay Sheet Actions (delete)
  deleteLaySheet: (id) => set((state) => ({
    laySheets: state.laySheets.filter(l => l.id !== id)
  })),
  deleteLaySheetsForCutPlan: (cutPlanId) => set((state) => ({
    laySheets: state.laySheets.filter(l => l.cutPlanId !== cutPlanId)
  })),
  
  // Delete bundles and guides for cut plan
  deleteBundlesForCutPlan: (cutPlanId) => set((state) => ({
    bundles: state.bundles.filter(b => b.cutPlanId !== cutPlanId)
  })),
  deleteBundleGuidesForCutPlan: (cutPlanId) => set((state) => ({
    bundleGuides: state.bundleGuides.filter(bg => bg.cutPlanId !== cutPlanId)
  })),
  
  // Delete all documents generated from a marker
  deleteAllForMarker: (markerId) => {
    const state = get();
    const cutPlanIds = state.cutPlans.filter(cp => cp.markerId === markerId).map(cp => cp.id);
    
    set((s) => ({
      cutPlans: s.cutPlans.filter(cp => cp.markerId !== markerId),
      laySheets: s.laySheets.filter(ls => !cutPlanIds.includes(ls.cutPlanId)),
      bundles: s.bundles.filter(b => !cutPlanIds.includes(b.cutPlanId)),
      bundleGuides: s.bundleGuides.filter(bg => !cutPlanIds.includes(bg.cutPlanId))
    }));
  },
  
  // Ratio Actions
  addRatio: (ratio) => set((state) => ({ ratios: [...state.ratios, ratio] })),
  deleteRatio: (id) => set((state) => ({
    ratios: state.ratios.filter(r => r.id !== id)
  })),
  
  // Fabric Roll Actions
  addFabricRoll: (roll) => set((state) => ({ fabricRolls: [...state.fabricRolls, roll] })),
  updateFabricRoll: (id, updates) => set((state) => ({
    fabricRolls: state.fabricRolls.map(r => r.id === id ? { ...r, ...updates } : r)
  })),
  deleteFabricRoll: (id) => set((state) => ({
    fabricRolls: state.fabricRolls.filter(r => r.id !== id)
  })),
  
  // Lay Record Actions
  addLayRecord: (record) => set((state) => ({ layRecords: [...state.layRecords, record] })),
  updateLayRecord: (id, updates) => set((state) => ({
    layRecords: state.layRecords.map(r => r.id === id ? { ...r, ...updates } : r)
  })),
  deleteLayRecord: (id) => set((state) => ({
    layRecords: state.layRecords.filter(r => r.id !== id)
  })),
  
  // Generate all connected documents from a cut plan with proper ply sequence
  generateDocumentsFromCutPlan: (cutPlanId: string, bundleSize: number, parts: string[]) => {
    const state = get();
    const cutPlan = state.cutPlans.find(cp => cp.id === cutPlanId);
    if (!cutPlan) return;
    
    const order = state.orders.find(o => o.id === cutPlan.orderId);
    if (!order) return;
    
    // Clear existing bundles for this cut plan
    set((s) => ({
      bundles: s.bundles.filter(b => b.cutPlanId !== cutPlanId),
      bundleGuides: s.bundleGuides.filter(bg => bg.cutPlanId !== cutPlanId)
    }));
    
    // Get the next bundle number for this order (across all cut plans)
    const existingOrderBundles = state.bundles.filter(b => 
      b.orderId === order.id && b.cutPlanId !== cutPlanId
    );
    // Get unique bundle numbers per part (since all parts share same bundle number)
    const existingBundleNos = [...new Set(existingOrderBundles.map(b => b.bundleNo))];
    let globalBundleNo = existingBundleNos.length > 0 ? Math.max(...existingBundleNos) + 1 : 1;
    
    // Get the next serial number for this order
    const existingSerials = existingOrderBundles.map(b => b.endNo);
    let globalSerialNo = existingSerials.length > 0 ? Math.max(...existingSerials) + 1 : 1;
    
    const newBundles: Bundle[] = [];
    const newGuides: BundleGuide[] = [];
    
    // Plies available from the cut plan
    const totalPlies = cutPlan.plies;
    
    // For each size in the cut plan
    Object.entries(cutPlan.sizes).forEach(([size, qty]) => {
      if (qty <= 0) return;
      
      // qty = ratio * plies, so each "piece" per size comes from plies
      // For bundling, we bundle by plies (e.g., 50 plies per bundle for this size)
      const ratio = qty / totalPlies; // pieces per ply for this size
      
      const numFullBundles = Math.floor(totalPlies / bundleSize);
      const remainderPlies = totalPlies % bundleSize;
      const totalBundles = numFullBundles + (remainderPlies > 0 ? 1 : 0);
      
      // Create Bundle Guide
      newGuides.push({
        id: `bg-${cutPlanId}-${size}`,
        cutPlanId,
        size,
        totalQty: qty,
        bundles: totalBundles,
        bundleSize: bundleSize * ratio, // actual pieces per bundle
        remainderQty: remainderPlies * ratio
      });
      
      let currentPlyStart = 1;
      
      // Create full bundles
      for (let i = 0; i < numFullBundles; i++) {
        const plyStart = currentPlyStart;
        const plyEnd = currentPlyStart + bundleSize - 1;
        const bundleQty = bundleSize * ratio;
        
        parts.forEach(part => {
          newBundles.push({
            id: `${Date.now()}-${globalBundleNo}-${part}-${size}-${i}`,
            cutPlanId,
            orderId: order.id,
            bundleNo: globalBundleNo,
            size,
            part,
            quantity: bundleQty,
            startNo: globalSerialNo,
            endNo: globalSerialNo + bundleQty - 1,
            plyStart,
            plyEnd,
            shade: cutPlan.shade,
            cutNo: cutPlan.cutNo
          });
        });
        
        globalSerialNo += bundleQty;
        currentPlyStart += bundleSize;
        globalBundleNo++;
      }
      
      // Create remainder bundle if needed
      if (remainderPlies > 0) {
        const plyStart = currentPlyStart;
        const plyEnd = currentPlyStart + remainderPlies - 1;
        const remainderQty = remainderPlies * ratio;
        
        parts.forEach(part => {
          newBundles.push({
            id: `${Date.now()}-${globalBundleNo}-${part}-${size}-rem`,
            cutPlanId,
            orderId: order.id,
            bundleNo: globalBundleNo,
            size,
            part,
            quantity: remainderQty,
            startNo: globalSerialNo,
            endNo: globalSerialNo + remainderQty - 1,
            plyStart,
            plyEnd,
            shade: cutPlan.shade,
            cutNo: cutPlan.cutNo
          });
        });
        globalSerialNo += remainderQty;
        globalBundleNo++;
      }
    });
    
    set((s) => ({
      bundles: [...s.bundles, ...newBundles],
      bundleGuides: [...s.bundleGuides, ...newGuides]
    }));
  },

  // Generate ALL documents from a marker plan (Cut Plans + Lay Sheets + Bundle Guides + Bundle Tags)
  generateAllFromMarker: (
    markerId: string,
    numberOfCuts: number,
    pliesPerCut: number,
    bundleSize: number,
    parts: string[]
  ) => {
    const state = get();
    const marker = state.markerPlans.find(m => m.id === markerId);
    if (!marker) return { cutPlans: 0, laySheets: 0, bundleGuides: 0, bundles: 0 };
    
    const order = state.orders.find(o => o.id === marker.orderId);
    if (!order) return { cutPlans: 0, laySheets: 0, bundleGuides: 0, bundles: 0 };

    const newCutPlans: CutPlan[] = [];
    const newLaySheets: LaySheet[] = [];
    const newBundles: Bundle[] = [];
    const newGuides: BundleGuide[] = [];
    
    const existingCutCount = state.cutPlans.length;
    let globalBundleNo = state.bundles.length + 1;
    
    // Create multiple cut plans based on numberOfCuts
    for (let cutIndex = 0; cutIndex < numberOfCuts; cutIndex++) {
      const cutNo = existingCutCount + cutIndex + 1;
      const cutPlanId = `cp-${Date.now()}-${cutIndex}`;
      const layLength = marker.markerLength + 0.0254;
      const fabricUsed = pliesPerCut * layLength;
      
      // Calculate sizes: ratio × plies
      const sizes: Record<string, number> = {};
      Object.entries(marker.sizes).forEach(([size, ratio]) => {
        if (ratio > 0) {
          sizes[size] = ratio * pliesPerCut;
        }
      });
      
      const totalQty = Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
      
      // Create Cut Plan
      const newCutPlan: CutPlan = {
        id: cutPlanId,
        orderId: marker.orderId,
        markerId: marker.id,
        cutNo,
        shade: order.shade,
        plies: pliesPerCut,
        markerLength: marker.markerLength,
        layLength,
        sizes,
        totalQty,
        fabricUsed,
        date: new Date().toISOString().split('T')[0],
        status: 'planned'
      };
      newCutPlans.push(newCutPlan);
      
      // Create Lay Sheet for this cut plan
      newLaySheets.push({
        id: `ls-${Date.now()}-${cutIndex}`,
        cutPlanId,
        layNo: 1,
        plies: pliesPerCut,
        layLength,
        fabricRoll: `ROLL-${String(cutNo).padStart(3, '0')}`
      });
      
      // Generate Bundle Guides and Bundle Tags for each size with ply tracking
      Object.entries(sizes).forEach(([size, qty]) => {
        if (qty <= 0) return;
        
        // Bundle by plies, not by total qty
        const ratio = marker.sizes[size] || 1;
        const numFullBundles = Math.floor(pliesPerCut / bundleSize);
        const remainderPlies = pliesPerCut % bundleSize;
        const totalBundles = numFullBundles + (remainderPlies > 0 ? 1 : 0);
        
        // Create Bundle Guide
        newGuides.push({
          id: `bg-${cutPlanId}-${size}`,
          cutPlanId,
          size,
          totalQty: qty,
          bundles: totalBundles,
          bundleSize: bundleSize * ratio,
          remainderQty: remainderPlies * ratio
        });
        
        let currentPlyStart = 1;
        let serialNo = 1;
        
        // Create full bundles
        for (let i = 0; i < numFullBundles; i++) {
          const plyStart = currentPlyStart;
          const plyEnd = currentPlyStart + bundleSize - 1;
          const bundleQty = bundleSize * ratio;
          
          parts.forEach(part => {
            newBundles.push({
              id: `${Date.now()}-${globalBundleNo}-${part}-${size}-${cutIndex}-${i}`,
              cutPlanId,
              orderId: order.id,
              bundleNo: globalBundleNo,
              size,
              part,
              quantity: bundleQty,
              startNo: serialNo,
              endNo: serialNo + bundleQty - 1,
              plyStart,
              plyEnd,
              shade: order.shade,
              cutNo
            });
          });
          serialNo += bundleQty;
          currentPlyStart += bundleSize;
          globalBundleNo++;
        }
        
        // Create remainder bundle if needed
        if (remainderPlies > 0) {
          const plyStart = currentPlyStart;
          const plyEnd = currentPlyStart + remainderPlies - 1;
          const remainderQty = remainderPlies * ratio;
          
          parts.forEach(part => {
            newBundles.push({
              id: `${Date.now()}-${globalBundleNo}-${part}-${size}-${cutIndex}-rem`,
              cutPlanId,
              orderId: order.id,
              bundleNo: globalBundleNo,
              size,
              part,
              quantity: remainderQty,
              startNo: serialNo,
              endNo: serialNo + remainderQty - 1,
              plyStart,
              plyEnd,
              shade: order.shade,
              cutNo
            });
          });
          globalBundleNo++;
        }
      });
    }
    
    // Update store with all new documents
    set((s) => ({
      cutPlans: [...s.cutPlans, ...newCutPlans],
      laySheets: [...s.laySheets, ...newLaySheets],
      bundles: [...s.bundles, ...newBundles],
      bundleGuides: [...s.bundleGuides, ...newGuides]
    }));
    
    return {
      cutPlans: newCutPlans.length,
      laySheets: newLaySheets.length,
      bundleGuides: newGuides.length,
      bundles: newBundles.length
    };
  }
}));
