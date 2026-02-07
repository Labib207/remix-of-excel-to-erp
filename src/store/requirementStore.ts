import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MaterialRequirement {
  id: string;
  orderId: string;
  itemCode: string;
  description: string;
  uom: string;
  requiredQty: number;
  requestedQty: number; // Quantity already requested
  pendingQty: number; // requiredQty - requestedQty
  remarks: string;
}

export interface MaterialCatalog {
  itemCode: string;
  description: string;
  uom: string;
}

interface RequirementStore {
  requirements: MaterialRequirement[];
  materialCatalog: MaterialCatalog[];
  
  // Requirement Actions
  addRequirement: (requirement: Omit<MaterialRequirement, 'id' | 'requestedQty' | 'pendingQty'>) => void;
  updateRequirement: (id: string, updates: Partial<MaterialRequirement>) => void;
  deleteRequirement: (id: string) => void;
  
  // Bulk actions
  addRequirements: (requirements: Omit<MaterialRequirement, 'id' | 'requestedQty' | 'pendingQty'>[]) => void;
  
  // Get requirements for an order
  getOrderRequirements: (orderId: string) => MaterialRequirement[];
  
  // Update requested quantity after a request is submitted
  updateRequestedQty: (requirements: { id: string; qty: number }[]) => void;
  
  // Material Catalog Actions
  addMaterialToCatalog: (material: MaterialCatalog) => void;
  removeMaterialFromCatalog: (itemCode: string) => void;
  searchCatalog: (query: string) => MaterialCatalog[];
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Default material catalog with common raw materials
const defaultCatalog: MaterialCatalog[] = [
  { itemCode: 'FAB-001', description: 'Shell Fabric - Ripstop Camouflage', uom: 'MTR' },
  { itemCode: 'FAB-002', description: 'Fusing Interlining - Woven', uom: 'MTR' },
  { itemCode: 'FAB-003', description: 'Pocket Fabric - Cotton Twill', uom: 'MTR' },
  { itemCode: 'FAB-004', description: 'Lining Fabric - Polyester', uom: 'MTR' },
  { itemCode: 'THR-001', description: 'Sewing Thread - Polyester Core Spun', uom: 'CONE' },
  { itemCode: 'THR-002', description: 'Bartack Thread - Heavy Duty', uom: 'CONE' },
  { itemCode: 'THR-003', description: 'Buttonhole Thread - Silk Finish', uom: 'CONE' },
  { itemCode: 'BTN-001', description: 'Button - 4 Hole 20L', uom: 'GRS' },
  { itemCode: 'BTN-002', description: 'Button - Snap Fastener', uom: 'GRS' },
  { itemCode: 'ZIP-001', description: 'Zipper - YKK Vislon #5', uom: 'PCS' },
  { itemCode: 'ZIP-002', description: 'Zipper - Metal Brass #8', uom: 'PCS' },
  { itemCode: 'VEL-001', description: 'Velcro Hook Tape 25mm', uom: 'MTR' },
  { itemCode: 'VEL-002', description: 'Velcro Loop Tape 25mm', uom: 'MTR' },
  { itemCode: 'ELA-001', description: 'Elastic Band 25mm', uom: 'MTR' },
  { itemCode: 'ELA-002', description: 'Elastic Cord 3mm', uom: 'MTR' },
  { itemCode: 'LBL-001', description: 'Main Label - Woven', uom: 'PCS' },
  { itemCode: 'LBL-002', description: 'Care Label - Printed', uom: 'PCS' },
  { itemCode: 'LBL-003', description: 'Size Label - Woven', uom: 'PCS' },
  { itemCode: 'TAB-001', description: 'Tab Fabric - Cotton Canvas', uom: 'MTR' },
  { itemCode: 'WEB-001', description: 'Webbing Tape 25mm', uom: 'MTR' },
  { itemCode: 'BKL-001', description: 'Buckle - Plastic Side Release', uom: 'PCS' },
  { itemCode: 'CRD-001', description: 'Drawcord - Nylon', uom: 'MTR' },
  { itemCode: 'STP-001', description: 'Stopper - Cord End', uom: 'PCS' },
  { itemCode: 'PAD-001', description: 'Shoulder Pad - Foam', uom: 'PCS' },
  { itemCode: 'RIV-001', description: 'Rivet - Brass', uom: 'GRS' },
];

export const useRequirementStore = create<RequirementStore>()(
  persist(
    (set, get) => ({
      requirements: [],
      materialCatalog: defaultCatalog,
      
      addRequirement: (requirement) => {
        const newRequirement: MaterialRequirement = {
          ...requirement,
          id: generateId(),
          requestedQty: 0,
          pendingQty: requirement.requiredQty,
        };
        set((state) => ({
          requirements: [...state.requirements, newRequirement],
        }));
        
        // Also add to catalog if not exists
        const catalog = get().materialCatalog;
        if (!catalog.find(m => m.itemCode === requirement.itemCode)) {
          set((state) => ({
            materialCatalog: [...state.materialCatalog, {
              itemCode: requirement.itemCode,
              description: requirement.description,
              uom: requirement.uom,
            }],
          }));
        }
      },
      
      updateRequirement: (id, updates) => set((state) => ({
        requirements: state.requirements.map(r => {
          if (r.id === id) {
            const updated = { ...r, ...updates };
            // Recalculate pending qty if required or requested qty changed
            if (updates.requiredQty !== undefined || updates.requestedQty !== undefined) {
              updated.pendingQty = updated.requiredQty - updated.requestedQty;
            }
            return updated;
          }
          return r;
        }),
      })),
      
      deleteRequirement: (id) => set((state) => ({
        requirements: state.requirements.filter(r => r.id !== id),
      })),
      
      addRequirements: (requirements) => {
        const newRequirements: MaterialRequirement[] = requirements.map(req => ({
          ...req,
          id: generateId(),
          requestedQty: 0,
          pendingQty: req.requiredQty,
        }));
        
        set((state) => ({
          requirements: [...state.requirements, ...newRequirements],
        }));
      },
      
      getOrderRequirements: (orderId) => {
        return get().requirements.filter(r => r.orderId === orderId);
      },
      
      updateRequestedQty: (updates) => {
        set((state) => ({
          requirements: state.requirements.map(r => {
            const update = updates.find(u => u.id === r.id);
            if (update) {
              const newRequestedQty = r.requestedQty + update.qty;
              return {
                ...r,
                requestedQty: newRequestedQty,
                pendingQty: r.requiredQty - newRequestedQty,
              };
            }
            return r;
          }),
        }));
      },
      
      addMaterialToCatalog: (material) => {
        const catalog = get().materialCatalog;
        if (!catalog.find(m => m.itemCode === material.itemCode)) {
          set((state) => ({
            materialCatalog: [...state.materialCatalog, material],
          }));
        }
      },
      
      removeMaterialFromCatalog: (itemCode) => set((state) => ({
        materialCatalog: state.materialCatalog.filter(m => m.itemCode !== itemCode),
      })),
      
      searchCatalog: (query) => {
        const catalog = get().materialCatalog;
        const lowerQuery = query.toLowerCase();
        return catalog.filter(m => 
          m.description.toLowerCase().includes(lowerQuery) ||
          m.itemCode.toLowerCase().includes(lowerQuery)
        );
      },
    }),
    {
      name: 'requirement-storage',
    }
  )
);
