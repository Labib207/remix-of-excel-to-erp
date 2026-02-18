import { Order, CutPlan, MarkerPlan, SizeQuantity } from '@/types/cutting';
import { Json } from '@/integrations/supabase/types';

// ===== ORDER MAPPERS =====

export function dbOrderToApp(db: any): Order {
  return {
    id: db.id,
    orderNumber: db.order_no,
    customer: db.customer,
    styleNo: db.style_no,
    styleName: db.style_name || '',
    shade: db.shade || 'X',
    totalQty: db.quantity || 0,
    sizeQuantities: (db.size_quantities as SizeQuantity) || {},
    customSizes: db.custom_sizes ? (db.custom_sizes as any[]) : undefined,
    fabricWidth: db.fabric_width || 145,
    orderDate: db.order_date || '',
    deliveryDate: db.delivery_date || '',
    status: db.status || 'pending',
  };
}

export function appOrderToDb(order: Partial<Order> & { id?: string }) {
  const result: Record<string, any> = {};
  if (order.id !== undefined) result.id = order.id;
  if (order.orderNumber !== undefined) result.order_no = order.orderNumber;
  if (order.customer !== undefined) result.customer = order.customer;
  if (order.styleNo !== undefined) result.style_no = order.styleNo;
  if (order.styleName !== undefined) result.style_name = order.styleName;
  if (order.shade !== undefined) result.shade = order.shade;
  if (order.totalQty !== undefined) result.quantity = order.totalQty;
  if (order.sizeQuantities !== undefined) result.size_quantities = order.sizeQuantities as unknown as Json;
  if (order.customSizes !== undefined) result.custom_sizes = order.customSizes as unknown as Json;
  if (order.fabricWidth !== undefined) result.fabric_width = order.fabricWidth;
  if (order.orderDate !== undefined) result.order_date = order.orderDate || null;
  if (order.deliveryDate !== undefined) result.delivery_date = order.deliveryDate || null;
  if (order.status !== undefined) result.status = order.status;
  return result;
}

// ===== CUT PLAN MAPPERS =====

export function dbCutPlanToApp(db: any): CutPlan {
  return {
    id: db.id,
    orderId: db.order_id || '',
    markerId: db.marker_id || '',
    cutNo: db.cut_no || 1,
    shade: db.shade || 'X',
    plies: db.plies || 0,
    markerLength: db.marker_length || 0,
    layLength: db.lay_length || 0,
    sizes: (db.sizes as SizeQuantity) || {},
    totalQty: db.total_qty || 0,
    fabricUsed: db.fabric_used || 0,
    date: db.date || '',
    status: db.status || 'planned',
  };
}

export function appCutPlanToDb(cp: Partial<CutPlan> & { id?: string }) {
  const result: Record<string, any> = {};
  if (cp.id !== undefined) result.id = cp.id;
  if (cp.orderId !== undefined) result.order_id = cp.orderId || null;
  if (cp.markerId !== undefined) result.marker_id = cp.markerId || null;
  if (cp.cutNo !== undefined) result.cut_no = cp.cutNo;
  if (cp.shade !== undefined) result.shade = cp.shade;
  if (cp.plies !== undefined) result.plies = cp.plies;
  if (cp.markerLength !== undefined) result.marker_length = cp.markerLength;
  if (cp.layLength !== undefined) result.lay_length = cp.layLength;
  if (cp.sizes !== undefined) result.sizes = cp.sizes as unknown as Json;
  if (cp.totalQty !== undefined) result.total_qty = cp.totalQty;
  if (cp.fabricUsed !== undefined) result.fabric_used = cp.fabricUsed;
  if (cp.date !== undefined) result.date = cp.date || null;
  if (cp.status !== undefined) result.status = cp.status;
  return result;
}

// ===== MARKER PLAN MAPPERS =====

export function dbMarkerPlanToApp(db: any): MarkerPlan {
  return {
    id: db.id,
    orderId: db.order_id || '',
    markerNo: typeof db.marker_no === 'string' ? parseInt(db.marker_no) || 0 : db.marker_no || 0,
    markerLength: db.marker_length || 0,
    fabricWidth: db.marker_width || 145,
    efficiency: db.efficiency || 0,
    sizes: (db.sizes as SizeQuantity) || {},
    createdAt: db.created_at || '',
  };
}

export function appMarkerPlanToDb(mp: Partial<MarkerPlan> & { id?: string }) {
  const result: Record<string, any> = {};
  if (mp.id !== undefined) result.id = mp.id;
  if (mp.orderId !== undefined) result.order_id = mp.orderId || null;
  if (mp.markerNo !== undefined) result.marker_no = String(mp.markerNo);
  if (mp.markerLength !== undefined) result.marker_length = mp.markerLength;
  if (mp.fabricWidth !== undefined) result.marker_width = mp.fabricWidth;
  if (mp.efficiency !== undefined) result.efficiency = mp.efficiency;
  if (mp.sizes !== undefined) result.sizes = mp.sizes as unknown as Json;
  return result;
}
