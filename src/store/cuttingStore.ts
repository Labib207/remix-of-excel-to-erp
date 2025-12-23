import { create } from 'zustand';
import { Order, CutPlan, Bundle, Ratio, SIZES } from '@/types/cutting';

interface CuttingStore {
  orders: Order[];
  cutPlans: CutPlan[];
  bundles: Bundle[];
  ratios: Ratio[];
  
  // Actions
  addOrder: (order: Order) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  
  addCutPlan: (cutPlan: CutPlan) => void;
  updateCutPlan: (id: string, cutPlan: Partial<CutPlan>) => void;
  deleteCutPlan: (id: string) => void;
  
  addBundle: (bundle: Bundle) => void;
  addBundles: (bundles: Bundle[]) => void;
  
  addRatio: (ratio: Ratio) => void;
  deleteRatio: (id: string) => void;
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

const sampleCutPlans: CutPlan[] = [
  {
    id: '1',
    orderId: '1',
    cutNo: 1,
    shade: 'X',
    plies: 100,
    markerLength: 12.9,
    layLength: 12.9254,
    sizes: { MS: 100, MR: 100, ML: 100, XLS: 100, XLR: 100, XLL: 100 },
    totalQty: 600,
    fabricUsed: 1292.54,
    date: '2025-11-12'
  },
  {
    id: '2',
    orderId: '1',
    cutNo: 2,
    shade: 'X',
    plies: 100,
    markerLength: 12.74,
    layLength: 12.7654,
    sizes: { MR: 100, ML: 100, LS: 100, LR: 100, LL: 100, XLS: 100 },
    totalQty: 600,
    fabricUsed: 1276.54,
    date: '2025-11-12'
  },
  {
    id: '3',
    orderId: '1',
    cutNo: 3,
    shade: 'X',
    plies: 100,
    markerLength: 12.89,
    layLength: 12.9154,
    sizes: { MS: 100, MR: 100, ML: 100, LL: 100, XLR: 100, XLL: 100 },
    totalQty: 600,
    fabricUsed: 1291.54,
    date: '2025-11-12'
  }
];

export const useCuttingStore = create<CuttingStore>((set) => ({
  orders: [sampleOrder],
  cutPlans: sampleCutPlans,
  bundles: [],
  ratios: [],
  
  addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
  updateOrder: (id, updates) => set((state) => ({
    orders: state.orders.map(o => o.id === id ? { ...o, ...updates } : o)
  })),
  deleteOrder: (id) => set((state) => ({
    orders: state.orders.filter(o => o.id !== id)
  })),
  
  addCutPlan: (cutPlan) => set((state) => ({ cutPlans: [...state.cutPlans, cutPlan] })),
  updateCutPlan: (id, updates) => set((state) => ({
    cutPlans: state.cutPlans.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  deleteCutPlan: (id) => set((state) => ({
    cutPlans: state.cutPlans.filter(c => c.id !== id)
  })),
  
  addBundle: (bundle) => set((state) => ({ bundles: [...state.bundles, bundle] })),
  addBundles: (bundles) => set((state) => ({ bundles: [...state.bundles, ...bundles] })),
  
  addRatio: (ratio) => set((state) => ({ ratios: [...state.ratios, ratio] })),
  deleteRatio: (id) => set((state) => ({
    ratios: state.ratios.filter(r => r.id !== id)
  })),
}));
