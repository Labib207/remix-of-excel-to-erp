import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as XLSX from 'xlsx';

interface RequestItem {
  id: string;
  slNo: number;
  itemCode: string;
  description: string;
  uom: string;
  requestedQty: number;
  issuedQty: number;
  remainingQty: number;
  remarks: string;
}

interface ReturnItem {
  id: string;
  slNo: number;
  itemCode: string;
  description: string;
  uom: string;
  qtyReturned: number;
  qtyReceived: number;
  remarks: string;
}

interface RequestForm {
  date: string;
  department: string;
  orderId?: string;
  orderName?: string;
  requestedBy: string;
  approvedBy: string;
  issuedBy: string;
  aswaqNumber: string;
}

interface SubmittedRequest {
  id: string;
  type: 'raw-material' | 'general-supplies' | 'material-return';
  docNumber: string;
  form: RequestForm;
  items: (RequestItem | ReturnItem)[];
  submittedAt: string;
}

interface RequestStore {
  submittedRequests: SubmittedRequest[];
  addRequest: (request: Omit<SubmittedRequest, 'id' | 'submittedAt'>) => void;
  getRequestsByMonth: (year: number, month: number) => SubmittedRequest[];
  exportMonthlyExcel: (year: number, month: number) => void;
  clearRequests: () => void;
}

const getNextDocNumber = (prefix: string): string => {
  const key = `docNumber_submit_${prefix}`;
  const stored = localStorage.getItem(key);
  let counter = 1;
  if (stored) {
    counter = parseInt(stored) + 1;
  }

  localStorage.setItem(key, counter.toString());
  return `${prefix}-${String(counter).padStart(5, '0')}`;
};

export const useRequestStore = create<RequestStore>()(
  persist(
    (set, get) => ({
      submittedRequests: [],
      
      addRequest: (request) => {
        const newRequest: SubmittedRequest = {
          ...request,
          id: Math.random().toString(36).substr(2, 9),
          submittedAt: new Date().toISOString(),
        };
        set((state) => ({
          submittedRequests: [...state.submittedRequests, newRequest],
        }));
      },

      getRequestsByMonth: (year, month) => {
        return get().submittedRequests.filter((req) => {
          const date = new Date(req.submittedAt);
          return date.getFullYear() === year && date.getMonth() === month;
        });
      },

      exportMonthlyExcel: (year, month) => {
        const requests = get().getRequestsByMonth(year, month);
        
        if (requests.length === 0) {
          alert('No requests found for the selected month');
          return;
        }

        const wb = XLSX.utils.book_new();
        
        // Raw Material Requests Sheet
        const rawMaterialRequests = requests.filter(r => r.type === 'raw-material');
        if (rawMaterialRequests.length > 0) {
          const rawData: any[] = [];
          rawMaterialRequests.forEach(req => {
            (req.items as RequestItem[]).forEach(item => {
              rawData.push({
                'Doc Number': req.docNumber,
                'Date': new Date(req.form.date).toLocaleDateString(),
                'Department': req.form.department,
                'SL No': item.slNo,
                'Item Code': item.itemCode,
                'Description': item.description,
                'UOM': item.uom,
                'Requested Qty': item.requestedQty,
                'Issued Qty': item.issuedQty,
                'Remaining Qty': item.remainingQty,
                'Remarks': item.remarks,
                'Requested By': req.form.requestedBy,
                'Approved By': req.form.approvedBy,
                'Issued By': req.form.issuedBy,
                'ASWAQ Number': req.form.aswaqNumber,
              });
            });
          });
          const ws = XLSX.utils.json_to_sheet(rawData);
          XLSX.utils.book_append_sheet(wb, ws, 'Raw Material Requests');
        }

        // General Supplies Sheet
        const generalRequests = requests.filter(r => r.type === 'general-supplies');
        if (generalRequests.length > 0) {
          const generalData: any[] = [];
          generalRequests.forEach(req => {
            (req.items as RequestItem[]).forEach(item => {
              generalData.push({
                'Doc Number': req.docNumber,
                'Date': new Date(req.form.date).toLocaleDateString(),
                'Department': req.form.department,
                'SL No': item.slNo,
                'Item Code': item.itemCode,
                'Description': item.description,
                'UOM': item.uom,
                'Requested Qty': item.requestedQty,
                'Issued Qty': item.issuedQty,
                'Remaining Qty': item.remainingQty,
                'Remarks': item.remarks,
                'Requested By': req.form.requestedBy,
                'Approved By': req.form.approvedBy,
                'Issued By': req.form.issuedBy,
                'ASWAQ Number': req.form.aswaqNumber,
              });
            });
          });
          const ws = XLSX.utils.json_to_sheet(generalData);
          XLSX.utils.book_append_sheet(wb, ws, 'General Supplies');
        }

        // Material Return Sheet
        const returnRequests = requests.filter(r => r.type === 'material-return');
        if (returnRequests.length > 0) {
          const returnData: any[] = [];
          returnRequests.forEach(req => {
            (req.items as ReturnItem[]).forEach(item => {
              returnData.push({
                'Doc Number': req.docNumber,
                'Date': new Date(req.form.date).toLocaleDateString(),
                'Department': req.form.department,
                'SL No': item.slNo,
                'Item Code': item.itemCode,
                'Description': item.description,
                'UOM': item.uom,
                'Qty Returned': item.qtyReturned,
                'Qty Received': item.qtyReceived,
                'Remarks': item.remarks,
                'Returned By': req.form.requestedBy,
                'Approved By': req.form.approvedBy,
                'Received By': req.form.issuedBy,
                'ASWAQ Number': req.form.aswaqNumber,
              });
            });
          });
          const ws = XLSX.utils.json_to_sheet(returnData);
          XLSX.utils.book_append_sheet(wb, ws, 'Material Returns');
        }

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        
        XLSX.writeFile(wb, `Requests_${monthNames[month]}_${year}.xlsx`);
      },

      clearRequests: () => set({ submittedRequests: [] }),
    }),
    {
      name: 'request-storage',
    }
  )
);
