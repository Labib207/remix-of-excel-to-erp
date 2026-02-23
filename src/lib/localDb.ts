import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ===== Database Schema =====
interface GhoushDBSchema extends DBSchema {
  orders: {
    key: string;
    value: {
      id: string;
      order_no: string;
      customer: string;
      style_no: string;
      style_name: string | null;
      shade: string | null;
      quantity: number;
      size_quantities: Record<string, number> | null;
      custom_sizes: any[] | null;
      fabric_width: number | null;
      order_date: string | null;
      delivery_date: string | null;
      status: string;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-deleted': number };
  };
  cut_plans: {
    key: string;
    value: {
      id: string;
      order_id: string | null;
      marker_id: string | null;
      plan_no: string;
      cut_no: number | null;
      shade: string | null;
      plies: number | null;
      marker_length: number | null;
      lay_length: number | null;
      sizes: Record<string, number> | null;
      total_qty: number | null;
      fabric_used: number | null;
      fabric_type: string | null;
      fabric_width: number | null;
      date: string | null;
      planned_date: string | null;
      status: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-order': string };
  };
  marker_plans: {
    key: string;
    value: {
      id: string;
      order_id: string | null;
      marker_no: string;
      marker_length: number | null;
      marker_width: number | null;
      efficiency: number | null;
      sizes: Record<string, number> | null;
      size_combination: string | null;
      pieces_per_marker: number | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-order': string };
  };
  requirements: {
    key: string;
    value: {
      id: string;
      order_id: string | null;
      item_code: string;
      description: string | null;
      color: string | null;
      size: string | null;
      unit: string | null;
      required_qty: number;
      received_qty: number | null;
      balance_qty: number | null;
      sort_order: number | null;
      status: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-order': string };
  };
  requests: {
    key: string;
    value: {
      id: string;
      order_id: string | null;
      request_no: string;
      request_date: string;
      department: string | null;
      requested_by: string | null;
      status: string;
      submitted_at: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-order': string };
  };
  request_items: {
    key: string;
    value: {
      id: string;
      request_id: string | null;
      requirement_id: string | null;
      item_code: string | null;
      description: string | null;
      color: string | null;
      size: string | null;
      unit: string;
      requested_qty: number;
      issued_qty: number | null;
      balance_qty: number | null;
      sort_order: number | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-request': string };
  };
  bundles: {
    key: string;
    value: {
      id: string;
      bundle_no: string;
      lay_sheet_id: string | null;
      cut_plan_id: string | null;
      order_id: string | null;
      size: string | null;
      color: string | null;
      part: string | null;
      quantity: number | null;
      start_no: number | null;
      end_no: number | null;
      serial_range: string | null;
      ply_start: number | null;
      ply_end: number | null;
      shade: string | null;
      cut_no: number | null;
      status: string;
      scanned_at: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-cut-plan': string };
  };
  bundle_guides: {
    key: string;
    value: {
      id: string;
      cut_plan_id: string | null;
      size: string | null;
      total_qty: number | null;
      bundles: number | null;
      bundle_size: number | null;
      remainder_qty: number | null;
      created_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-cut-plan': string };
  };
  lay_sheets: {
    key: string;
    value: {
      id: string;
      cut_plan_id: string | null;
      sheet_no: string;
      fabric_type: string | null;
      fabric_width: number | null;
      lay_length: number | null;
      plies: number | null;
      total_pieces: number | null;
      wastage_percent: number | null;
      status: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-cut-plan': string };
  };
  delivery_acknowledgments: {
    key: string;
    value: {
      id: string;
      request_id: string | null;
      acknowledgment_no: string;
      delivery_date: string;
      received_by: string | null;
      line_supervisor_signature: string | null;
      line_recorder_signature: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number };
  };
  delivery_items: {
    key: string;
    value: {
      id: string;
      acknowledgment_id: string | null;
      request_item_id: string | null;
      item_code: string | null;
      description: string | null;
      color: string | null;
      size: string | null;
      unit: string;
      requirement_qty: number | null;
      issued_qty: number | null;
      balance_qty: number | null;
      created_at: string;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-acknowledgment': string };
  };
  ratios: {
    key: string;
    value: {
      id: string;
      order_id: string | null;
      ratio_number: number | null;
      ratio_name: string | null;
      sizes: Record<string, number> | null;
      planned_qty: Record<string, number> | null;
      plies: number | null;
      total_qty: number | null;
      is_active: boolean | null;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-order': string };
  };
  fabric_calculations: {
    key: string;
    value: {
      id: string;
      order_id: string | null;
      fabric_type: string;
      total_meters: number | null;
      total_yards: number | null;
      wastage_percent: number | null;
      request_with_allowance: number | null;
      received_meters: number | null;
      used_meters: number | null;
      balance: number | null;
      remarks: string | null;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-order': string };
  };
  fabric_rolls: {
    key: string;
    value: {
      id: string;
      roll_no: string;
      fabric_type: string;
      system_length: number | null;
      received_date: string | null;
      status: string | null;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number };
  };
  lay_records: {
    key: string;
    value: {
      id: string;
      cut_plan_id: string | null;
      cut_no: number | null;
      shade: string | null;
      roll_no: string | null;
      roll_id: string | null;
      system_roll_length: number | null;
      actual_lays: number | null;
      marker_length: number | null;
      layed_mts: number | null;
      overlap_yards: number | null;
      roll_shortage_increase: number | null;
      roll_end_next_ply_1st: number | null;
      damage: number | null;
      roll_end_next_ply_2nd: number | null;
      recut_return: number | null;
      unusable_roll_end: number | null;
      total_usage: number | null;
      roll_end: number | null;
      big_end: number | null;
      remarks: string | null;
      created_at: string;
      updated_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number; 'by-cut-plan': string };
  };
  material_catalog: {
    key: string;
    value: {
      id: string;
      item_code: string;
      description: string;
      uom: string | null;
      created_at: string;
      created_by: string | null;
      _synced: number;
      _deleted: number;
    };
    indexes: { 'by-synced': number };
  };
  sync_meta: {
    key: string;
    value: {
      id: string;
      timestamp: string;
      status: string;
    };
  };
}

let dbInstance: IDBPDatabase<GhoushDBSchema> | null = null;

export async function getLocalDb(): Promise<IDBPDatabase<GhoushDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<GhoushDBSchema>('ghoush-erp', 1, {
    upgrade(db) {
      // Orders
      const orders = db.createObjectStore('orders', { keyPath: 'id' });
      orders.createIndex('by-synced', '_synced');
      orders.createIndex('by-deleted', '_deleted');

      // Cut Plans
      const cutPlans = db.createObjectStore('cut_plans', { keyPath: 'id' });
      cutPlans.createIndex('by-synced', '_synced');
      cutPlans.createIndex('by-order', 'order_id');

      // Marker Plans
      const markers = db.createObjectStore('marker_plans', { keyPath: 'id' });
      markers.createIndex('by-synced', '_synced');
      markers.createIndex('by-order', 'order_id');

      // Requirements
      const reqs = db.createObjectStore('requirements', { keyPath: 'id' });
      reqs.createIndex('by-synced', '_synced');
      reqs.createIndex('by-order', 'order_id');

      // Requests
      const requests = db.createObjectStore('requests', { keyPath: 'id' });
      requests.createIndex('by-synced', '_synced');
      requests.createIndex('by-order', 'order_id');

      // Request Items
      const reqItems = db.createObjectStore('request_items', { keyPath: 'id' });
      reqItems.createIndex('by-synced', '_synced');
      reqItems.createIndex('by-request', 'request_id');

      // Bundles
      const bundles = db.createObjectStore('bundles', { keyPath: 'id' });
      bundles.createIndex('by-synced', '_synced');
      bundles.createIndex('by-cut-plan', 'cut_plan_id');

      // Bundle Guides
      const guides = db.createObjectStore('bundle_guides', { keyPath: 'id' });
      guides.createIndex('by-synced', '_synced');
      guides.createIndex('by-cut-plan', 'cut_plan_id');

      // Lay Sheets
      const laySheets = db.createObjectStore('lay_sheets', { keyPath: 'id' });
      laySheets.createIndex('by-synced', '_synced');
      laySheets.createIndex('by-cut-plan', 'cut_plan_id');

      // Delivery Acknowledgments
      const delAck = db.createObjectStore('delivery_acknowledgments', { keyPath: 'id' });
      delAck.createIndex('by-synced', '_synced');

      // Delivery Items
      const delItems = db.createObjectStore('delivery_items', { keyPath: 'id' });
      delItems.createIndex('by-synced', '_synced');
      delItems.createIndex('by-acknowledgment', 'acknowledgment_id');

      // Ratios
      const ratios = db.createObjectStore('ratios', { keyPath: 'id' });
      ratios.createIndex('by-synced', '_synced');
      ratios.createIndex('by-order', 'order_id');

      // Fabric Calculations
      const fabCalc = db.createObjectStore('fabric_calculations', { keyPath: 'id' });
      fabCalc.createIndex('by-synced', '_synced');
      fabCalc.createIndex('by-order', 'order_id');

      // Fabric Rolls
      const fabRolls = db.createObjectStore('fabric_rolls', { keyPath: 'id' });
      fabRolls.createIndex('by-synced', '_synced');

      // Lay Records
      const layRecs = db.createObjectStore('lay_records', { keyPath: 'id' });
      layRecs.createIndex('by-synced', '_synced');
      layRecs.createIndex('by-cut-plan', 'cut_plan_id');

      // Material Catalog
      const catalog = db.createObjectStore('material_catalog', { keyPath: 'id' });
      catalog.createIndex('by-synced', '_synced');

      // Sync Meta
      db.createObjectStore('sync_meta', { keyPath: 'id' });
    },
  });

  return dbInstance;
}

// Helper to generate UUIDs locally
export function generateLocalId(): string {
  return crypto.randomUUID();
}

// Helper to get current timestamp
export function nowISO(): string {
  return new Date().toISOString();
}
