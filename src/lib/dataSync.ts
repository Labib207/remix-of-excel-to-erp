import { supabase } from '@/integrations/supabase/client';
import { Order, CutPlan, MarkerPlan, LaySheet, Bundle, BundleGuide, Ratio, FabricRoll, LayRecord, FabricCalculation } from '@/types/cutting';
import { MaterialRequirement, MaterialCatalog } from '@/store/requirementStore';

// Types for database records
interface DbOrder {
  id: string;
  order_no: string;
  style_no: string;
  style_name: string | null;
  customer: string;
  quantity: number;
  fabric_type: string | null;
  shade: string | null;
  size_quantities: Record<string, number> | null;
  custom_sizes: any[] | null;
  order_date: string | null;
  delivery_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// Convert local Order to DB format
function orderToDb(order: Order): Partial<DbOrder> {
  return {
    id: order.id,
    order_no: order.orderNumber,
    style_no: order.styleNo,
    style_name: order.styleName,
    customer: order.customer,
    quantity: order.totalQty,
    fabric_type: order.fabricWidth?.toString(),
    shade: order.shade,
    size_quantities: order.sizeQuantities,
    custom_sizes: order.customSizes,
    order_date: order.orderDate,
    delivery_date: order.deliveryDate,
    status: order.status,
  };
}

// Convert DB Order to local format
function dbToOrder(db: DbOrder): Order {
  return {
    id: db.id,
    orderNumber: db.order_no,
    styleNo: db.style_no,
    styleName: db.style_name || '',
    customer: db.customer,
    totalQty: db.quantity,
    fabricWidth: db.fabric_type ? parseInt(db.fabric_type) : 145,
    shade: db.shade || 'X',
    sizeQuantities: (db.size_quantities as Record<string, number>) || {},
    customSizes: db.custom_sizes as any,
    orderDate: db.order_date || '',
    deliveryDate: db.delivery_date || '',
    status: (db.status as 'pending' | 'in-progress' | 'completed') || 'pending',
  };
}

// Sync service class
export class DataSyncService {
  private static instance: DataSyncService;
  private isSyncing = false;
  private lastSyncTime: Date | null = null;

  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  async isAuthenticated(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  }

  // Sync orders from local to cloud
  async syncOrdersToCloud(orders: Order[]): Promise<{ success: boolean; error?: string }> {
    if (this.isSyncing) return { success: false, error: 'Sync already in progress' };
    
    try {
      this.isSyncing = true;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      for (const order of orders) {
        const dbOrder = orderToDb(order);
        const { error } = await supabase
          .from('orders')
          .upsert({
            id: dbOrder.id,
            order_no: dbOrder.order_no || '',
            style_no: dbOrder.style_no || '',
            customer: dbOrder.customer || '',
            quantity: dbOrder.quantity || 0,
            status: dbOrder.status || 'pending',
          } as any, { onConflict: 'id' });

        if (error) throw error;
      }

      this.lastSyncTime = new Date();
      return { success: true };
    } catch (error: any) {
      console.error('Sync orders error:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  // Fetch orders from cloud
  async fetchOrdersFromCloud(): Promise<{ data: Order[] | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const orders = (data as DbOrder[]).map(dbToOrder);
      return { data: orders };
    } catch (error: any) {
      console.error('Fetch orders error:', error);
      return { data: null, error: error.message };
    }
  }

  // Sync requirements
  async syncRequirementsToCloud(requirements: MaterialRequirement[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      for (const req of requirements) {
        const { error } = await supabase
          .from('requirements')
          .upsert({
            id: req.id,
            order_id: req.orderId,
            item_code: req.itemCode,
            description: req.description,
            unit: req.uom,
            required_qty: req.requiredQty,
            received_qty: req.requestedQty,
            status: req.pendingQty > 0 ? 'pending' : 'completed',
            notes: req.remarks,
            created_by: user.id,
          }, { onConflict: 'id' });

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Sync requirements error:', error);
      return { success: false, error: error.message };
    }
  }

  // Fetch requirements from cloud
  async fetchRequirementsFromCloud(): Promise<{ data: MaterialRequirement[] | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requirements: MaterialRequirement[] = (data || []).map((r: any) => ({
        id: r.id,
        orderId: r.order_id,
        itemCode: r.item_code,
        description: r.description || '',
        uom: r.unit || 'pcs',
        requiredQty: r.required_qty,
        requestedQty: r.received_qty || 0,
        pendingQty: r.balance_qty || (r.required_qty - (r.received_qty || 0)),
        remarks: r.notes || '',
      }));

      return { data: requirements };
    } catch (error: any) {
      console.error('Fetch requirements error:', error);
      return { data: null, error: error.message };
    }
  }

  // Sync cut plans
  async syncCutPlansToCloud(cutPlans: CutPlan[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      for (const cp of cutPlans) {
        const { error } = await supabase
          .from('cut_plans')
          .upsert({
            id: cp.id,
            order_id: cp.orderId,
            marker_id: cp.markerId,
            plan_no: `CUT-${cp.cutNo}`,
            cut_no: cp.cutNo,
            shade: cp.shade,
            plies: cp.plies,
            marker_length: cp.markerLength,
            lay_length: cp.layLength,
            sizes: cp.sizes,
            total_qty: cp.totalQty,
            fabric_used: cp.fabricUsed,
            date: cp.date,
            status: cp.status,
            created_by: user.id,
          }, { onConflict: 'id' });

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Sync cut plans error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync marker plans
  async syncMarkerPlansToCloud(markerPlans: MarkerPlan[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      for (const mp of markerPlans) {
        const { error } = await supabase
          .from('marker_plans')
          .upsert({
            id: mp.id,
            order_id: mp.orderId,
            marker_no: `MARKER-${mp.markerNo}`,
            marker_length: mp.markerLength,
            marker_width: mp.fabricWidth,
            efficiency: mp.efficiency,
            sizes: mp.sizes,
            created_by: user.id,
          }, { onConflict: 'id' });

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Sync marker plans error:', error);
      return { success: false, error: error.message };
    }
  }

  // Full sync - push all local data to cloud
  async fullSyncToCloud(stores: {
    orders: Order[];
    cutPlans: CutPlan[];
    markerPlans: MarkerPlan[];
    requirements: MaterialRequirement[];
  }): Promise<{ success: boolean; error?: string; synced: { orders: number; cutPlans: number; markerPlans: number; requirements: number } }> {
    const synced = { orders: 0, cutPlans: 0, markerPlans: 0, requirements: 0 };

    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) return { success: false, error: 'Not authenticated', synced };

      // Sync in order of dependencies
      const orderResult = await this.syncOrdersToCloud(stores.orders);
      if (orderResult.success) synced.orders = stores.orders.length;

      const markerResult = await this.syncMarkerPlansToCloud(stores.markerPlans);
      if (markerResult.success) synced.markerPlans = stores.markerPlans.length;

      const cutResult = await this.syncCutPlansToCloud(stores.cutPlans);
      if (cutResult.success) synced.cutPlans = stores.cutPlans.length;

      const reqResult = await this.syncRequirementsToCloud(stores.requirements);
      if (reqResult.success) synced.requirements = stores.requirements.length;

      return { success: true, synced };
    } catch (error: any) {
      console.error('Full sync error:', error);
      return { success: false, error: error.message, synced };
    }
  }

  // Full sync - pull all cloud data to local
  async fullSyncFromCloud(): Promise<{
    success: boolean;
    error?: string;
    data: {
      orders: Order[];
      requirements: MaterialRequirement[];
    } | null;
  }> {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) return { success: false, error: 'Not authenticated', data: null };

      const [ordersResult, requirementsResult] = await Promise.all([
        this.fetchOrdersFromCloud(),
        this.fetchRequirementsFromCloud(),
      ]);

      return {
        success: true,
        data: {
          orders: ordersResult.data || [],
          requirements: requirementsResult.data || [],
        },
      };
    } catch (error: any) {
      console.error('Full sync from cloud error:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

export const dataSync = DataSyncService.getInstance();
