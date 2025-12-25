export interface Size {
  code: string;
  label: string;
}

export const SIZES: Size[] = [
  { code: 'SS', label: 'Small Short' },
  { code: 'SR', label: 'Small Regular' },
  { code: 'SL', label: 'Small Long' },
  { code: 'MS', label: 'Medium Short' },
  { code: 'MR', label: 'Medium Regular' },
  { code: 'ML', label: 'Medium Long' },
  { code: 'LS', label: 'Large Short' },
  { code: 'LR', label: 'Large Regular' },
  { code: 'LL', label: 'Large Long' },
  { code: 'XLS', label: 'XL Short' },
  { code: 'XLR', label: 'XL Regular' },
  { code: 'XLL', label: 'XL Long' },
  { code: 'XXLS', label: 'XXL Short' },
  { code: 'XXLR', label: 'XXL Regular' },
  { code: 'XXLL', label: 'XXL Long' },
];

export interface SizeQuantity {
  [sizeCode: string]: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  styleNo: string;
  styleName: string;
  shade: string;
  totalQty: number;
  sizeQuantities: SizeQuantity;
  customSizes?: Size[]; // Custom sizes for this order
  fabricWidth: number;
  orderDate: string;
  deliveryDate: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface Ratio {
  id: string;
  orderId: string;
  ratioNumber: number;
  ratioName: string; // e.g., "RATIO-01", "RATIO-02"
  sizes: SizeQuantity; // Size weights/flags (1 = include, 0 = exclude)
  plannedQty: SizeQuantity; // Calculated quantities per size
  plies: number;
  totalQty: number;
  isActive: boolean; // Currently selected ratio
}

// Fabric calculation with wastage
export interface FabricCalculation {
  id: string;
  orderId: string;
  fabricType: 'TOP' | 'FUSING' | 'TAB';
  totalMeters: number;
  totalYards: number;
  wastagePercent: number; // Default 1%
  requestWithAllowance: number; // totalMeters * (1 + wastagePercent/100)
  receivedMeters: number;
  usedMeters: number;
  balance: number;
  remarks: string;
}

export interface MarkerPlan {
  id: string;
  orderId: string;
  markerNo: number;
  markerLength: number;
  fabricWidth: number;
  efficiency: number;
  sizes: SizeQuantity;
  createdAt: string;
}

export interface CutPlan {
  id: string;
  orderId: string;
  markerId: string;
  cutNo: number;
  shade: string;
  plies: number;
  markerLength: number;
  layLength: number;
  sizes: SizeQuantity;
  totalQty: number;
  fabricUsed: number;
  date: string;
  status: 'planned' | 'cutting' | 'completed';
}

export interface LaySheet {
  id: string;
  cutPlanId: string;
  layNo: number;
  plies: number;
  layLength: number;
  fabricRoll: string;
  startTime?: string;
  endTime?: string;
  operator?: string;
}

export interface Bundle {
  id: string;
  cutPlanId: string;
  orderId: string;
  bundleNo: number;
  size: string;
  part: string;
  quantity: number;
  startNo: number; // Serial number start (e.g., 551)
  endNo: number;   // Serial number end (e.g., 600)
  serialRange: string; // Display format: "551-600"
  plyStart: number;  // Ply range start within this cut
  plyEnd: number;    // Ply range end within this cut
  shade: string;
  cutNo: number;
}

export interface BundleGuide {
  id: string;
  cutPlanId: string;
  size: string;
  totalQty: number;
  bundles: number;
  bundleSize: number;
  remainderQty: number;
}

export interface FabricConsumption {
  shell: {
    total: number;
    used: number;
    balance: number;
  };
  fusing: {
    total: number;
    used: number;
    balance: number;
  };
}

// Reconciliation Types
export interface FabricRoll {
  id: string;
  rollNo: string;
  fabricType: 'SHELL' | 'FUSING' | 'TAB';
  systemLength: number; // meters
  receivedDate: string;
  status: 'available' | 'in-use' | 'exhausted';
}

export interface LayRecord {
  id: string;
  cutPlanId: string;
  cutNo: number;
  shade: string;
  rollNo: string;
  rollId?: string;
  systemRollLength: number;
  actualLays: number;
  markerLength: number;
  layedMts: number;
  overlapYards: number;
  rollShortageIncrease: number;
  rollEndNextPly1st: number;
  damage: number;
  rollEndNextPly2nd: number;
  recutReturn: number;
  unusableRollEnd: number;
  totalUsage: number;
  rollEnd: number;
  bigEnd: number;
  remarks: string;
}

export interface ReconciliationSummary {
  id: string;
  orderId: string;
  fabricType: 'SHELL' | 'FUSING' | 'TAB';
  fabricDescription: string;
  fabricWidth: number;
  consumptionPerPc: number;
  orderQty: number;
  requirementAsPerMarker: number;
  receivingFabric: number;
  cuttingWastage: number;
  usageAsPerMarker: number;
  balance: number;
  unusableRollEnd: number;
  bigEnd: number;
  remarks: string;
}
