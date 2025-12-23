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
  fabricWidth: number;
  orderDate: string;
  deliveryDate: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface Ratio {
  id: string;
  orderId: string;
  ratioNumber: number;
  sizes: SizeQuantity;
  plies: number;
  totalQty: number;
}

export interface CutPlan {
  id: string;
  orderId: string;
  cutNo: number;
  shade: string;
  plies: number;
  markerLength: number;
  layLength: number;
  sizes: SizeQuantity;
  totalQty: number;
  fabricUsed: number;
  date: string;
}

export interface Bundle {
  id: string;
  cutPlanId: string;
  bundleNo: number;
  size: string;
  part: string;
  quantity: number;
  startNo: number;
  endNo: number;
  shade: string;
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
