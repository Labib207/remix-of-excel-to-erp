import { useState, useEffect, useRef } from 'react';
import { getNextDocNumber } from '@/lib/docNumberGenerator';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Download, Package, Undo2, FileBox, Send, FileSpreadsheet, Calendar, History, FileDown, ClipboardList, Database, Pencil, Layers } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRequestStore } from '@/store/requestStore';
import { useSubmitCloudRequest, useUpdateCloudRequest } from '@/hooks/useCloudRequests';
import { useRequirementStore } from '@/store/requirementStore';
import { useDbOrders, useUpdateDbOrder } from '@/hooks/useDbOrders';
import { useDbRequirements } from '@/hooks/useDbRequirements';
import {
  exportRawMaterialRequestPDF,
  exportGeneralSuppliesRequestPDF,
  exportMaterialReturnSlipPDF,
  exportEmptyRawMaterialPDF,
  exportEmptyGeneralSuppliesPDF,
  exportEmptyMaterialReturnPDF,
} from '@/lib/requestPdfExport';
import { RequestHistoryTable } from '@/components/requests/RequestHistoryTable';
import { DescriptionAutocomplete } from '@/components/requests/DescriptionAutocomplete';
import { RecordsAnalytics } from '@/components/requests/RecordsAnalytics';
import { Badge } from '@/components/ui/badge';

interface RequestItem {
  id: string;
  slNo: number;
  itemCode: string;
  description: string;
  uom: string;
  requirementQty: number; // Auto-filled from order requirements (read-only)
  requestedQty: number;
  issuedQty: number;
  remainingQty: number;
  remarks: string;
  requirementId?: string; // Link to requirement for updating
  styleOrderId?: string; // For multi-style requests: which order/style this item belongs to
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
  orderId: string;
  requestedBy: string;
  approvedBy: string;
  issuedBy: string;
  aswaqNumber: string;
}

const generateId = () => Math.random().toString(36).substr(2, 9);



const emptyRequestForm = (): RequestForm => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  department: '',
  orderId: '',
  requestedBy: '',
  approvedBy: '',
  issuedBy: '',
  aswaqNumber: '',
});

export default function Requests() {
  const [activeTab, setActiveTab] = useState('raw-material');
  const { addRequest, updateRequest, exportMonthlyExcel, submittedRequests } = useRequestStore();
  const submitCloudRequest = useSubmitCloudRequest();
  const updateCloudRequest = useUpdateCloudRequest();
  const { updateRequestedQty, materialCatalog } = useRequirementStore();
  const { data: requirements = [] } = useDbRequirements();
  const { data: orders = [] } = useDbOrders();
  const updateOrderMutation = useUpdateDbOrder();
  
  // Month/Year selector for export
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Raw Material Request State
  const [rawMaterialForm, setRawMaterialForm] = useState<RequestForm>(emptyRequestForm());
  const [rawMaterialItems, setRawMaterialItems] = useState<RequestItem[]>([]);
  // Additional styles/orders included in the same raw-material sheet (to save paper)
  const [rawExtraOrderIds, setRawExtraOrderIds] = useState<string[]>([]);

  // General Supplies Request State
  const [generalSuppliesForm, setGeneralSuppliesForm] = useState<RequestForm>(emptyRequestForm());
  const [generalSuppliesItems, setGeneralSuppliesItems] = useState<RequestItem[]>([]);

  // Material Return Slip State
  const [materialReturnForm, setMaterialReturnForm] = useState<RequestForm>(emptyRequestForm());
  const [materialReturnItems, setMaterialReturnItems] = useState<ReturnItem[]>([]);

  // Track editing request from history
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingDocNumber, setEditingDocNumber] = useState<string | null>(null);

  // Edit Order State
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string>('');
  const [editOrderData, setEditOrderData] = useState({
    orderNumber: '',
    customer: '',
    styleNo: '',
    styleName: '',
    shade: '',
    totalQty: 0,
    fabricWidth: 145,
    deliveryDate: '',
  });

  // Track if user has manually edited items (to avoid overwriting their changes)
  const rawManualEdit = useRef(false);
  const generalManualEdit = useRef(false);

  // Auto-refresh items when requirements data changes (e.g. after Trim Chart edit/delete)
  useEffect(() => {
    if (rawMaterialForm.orderId && !rawManualEdit.current) {
      const orderReqs = requirements.filter(r => r.orderId === rawMaterialForm.orderId);
      if (orderReqs.length > 0) {
        const newItems: RequestItem[] = orderReqs.map((req, idx) => ({
          id: generateId(),
          slNo: idx + 1,
          itemCode: req.itemCode,
          description: req.description,
          uom: req.uom,
          requirementQty: req.pendingQty > 0 ? req.pendingQty : req.requiredQty,
          requestedQty: 0,
          issuedQty: 0,
          remainingQty: 0,
          remarks: req.remarks,
          requirementId: req.id,
        }));
        setRawMaterialItems(newItems);
      } else {
        setRawMaterialItems([]);
      }
    }
  }, [requirements, rawMaterialForm.orderId]);

  useEffect(() => {
    if (generalSuppliesForm.orderId && !generalManualEdit.current) {
      const orderReqs = requirements.filter(r => r.orderId === generalSuppliesForm.orderId);
      if (orderReqs.length > 0) {
        const newItems: RequestItem[] = orderReqs.map((req, idx) => ({
          id: generateId(),
          slNo: idx + 1,
          itemCode: req.itemCode,
          description: req.description,
          uom: req.uom,
          requirementQty: req.pendingQty > 0 ? req.pendingQty : req.requiredQty,
          requestedQty: 0,
          issuedQty: 0,
          remainingQty: 0,
          remarks: req.remarks,
          requirementId: req.id,
        }));
        setGeneralSuppliesItems(newItems);
      } else {
        setGeneralSuppliesItems([]);
      }
    }
  }, [requirements, generalSuppliesForm.orderId]);

  const openEditOrderDialog = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setEditingOrderId(orderId);
      setEditOrderData({
        orderNumber: order.orderNumber,
        customer: order.customer,
        styleNo: order.styleNo,
        styleName: order.styleName,
        shade: order.shade,
        totalQty: order.totalQty,
        fabricWidth: order.fabricWidth,
        deliveryDate: order.deliveryDate,
      });
      setIsEditOrderOpen(true);
    }
  };

  const handleSaveOrderEdit = () => {
    if (!editOrderData.orderNumber || !editOrderData.customer) {
      toast.error('Order Number and Customer are required');
      return;
    }
    updateOrderMutation.mutate({
      id: editingOrderId,
      orderNumber: editOrderData.orderNumber,
      customer: editOrderData.customer,
      styleNo: editOrderData.styleNo,
      styleName: editOrderData.styleName,
      shade: editOrderData.shade || 'X',
      totalQty: editOrderData.totalQty,
      fabricWidth: editOrderData.fabricWidth,
      deliveryDate: editOrderData.deliveryDate,
    }, {
      onSuccess: () => {
        setIsEditOrderOpen(false);
        toast.success(`Order ${editOrderData.orderNumber} updated successfully`);
      }
    });
  };
  // Handle order selection for raw material request
  const handleOrderSelect = (orderId: string, type: 'raw' | 'general') => {
    const actualOrderId = orderId === 'none' ? '' : orderId;
    const setForm = type === 'raw' ? setRawMaterialForm : setGeneralSuppliesForm;
    const setItems = type === 'raw' ? setRawMaterialItems : setGeneralSuppliesItems;
    const form = type === 'raw' ? rawMaterialForm : generalSuppliesForm;
    
    // Reset manual edit flag so useEffect can auto-sync
    if (type === 'raw') rawManualEdit.current = false;
    else generalManualEdit.current = false;
    
    setForm({ ...form, orderId: actualOrderId });
    if (type === 'raw') {
      // Remove the primary order from extras if it was there
      setRawExtraOrderIds(prev => prev.filter(id => id !== actualOrderId));
    }
    
    if (actualOrderId) {
      // Auto-fill items from ALL requirements for this order
      const orderRequirements = requirements.filter(r => 
        r.orderId === actualOrderId
      );
      
      if (orderRequirements.length > 0) {
        const newItems: RequestItem[] = orderRequirements.map((req, idx) => ({
          id: generateId(),
          slNo: idx + 1,
          itemCode: req.itemCode,
          description: req.description,
          uom: req.uom,
          requirementQty: req.pendingQty > 0 ? req.pendingQty : req.requiredQty, // Show pending or total qty
          requestedQty: 0, // Empty - user enters what they actually request
          issuedQty: 0, // Empty - to be filled manually by store keeper
          remainingQty: 0, // Will be calculated when issuedQty is entered
          remarks: req.remarks,
          requirementId: req.id,
        }));
        setItems(newItems);
        toast.info(`Loaded ${orderRequirements.length} accessories for this order. Remove any you don't need.`);
      } else {
        toast.info('No requirements found for this order');
      }
    }
  };

  const addRequestItem = (type: 'raw' | 'general') => {
    const items = type === 'raw' ? rawMaterialItems : generalSuppliesItems;
    const setItems = type === 'raw' ? setRawMaterialItems : setGeneralSuppliesItems;
    
    const newItem: RequestItem = {
      id: generateId(),
      slNo: items.length + 1,
      itemCode: '',
      description: '',
      uom: '',
      requirementQty: 0,
      requestedQty: 0,
      issuedQty: 0,
      remainingQty: 0,
      remarks: '',
    };
    setItems([...items, newItem]);
  };

  const addReturnItem = () => {
    const newItem: ReturnItem = {
      id: generateId(),
      slNo: materialReturnItems.length + 1,
      itemCode: '',
      description: '',
      uom: '',
      qtyReturned: 0,
      qtyReceived: 0,
      remarks: '',
    };
    setMaterialReturnItems([...materialReturnItems, newItem]);
  };

  const updateRequestItem = (type: 'raw' | 'general', id: string, field: keyof RequestItem, value: string | number) => {
    const items = type === 'raw' ? rawMaterialItems : generalSuppliesItems;
    const setItems = type === 'raw' ? setRawMaterialItems : setGeneralSuppliesItems;
    // Mark as manually edited so auto-sync doesn't overwrite user changes
    if (type === 'raw') rawManualEdit.current = true;
    else generalManualEdit.current = true;
    
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'requestedQty' || field === 'issuedQty') {
          updated.remainingQty = updated.requestedQty - updated.issuedQty;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleMaterialSelect = (type: 'raw' | 'general', id: string, material: { itemCode: string; description: string; uom: string }) => {
    const items = type === 'raw' ? rawMaterialItems : generalSuppliesItems;
    const setItems = type === 'raw' ? setRawMaterialItems : setGeneralSuppliesItems;
    
    setItems(items.map(item => {
      if (item.id === id) {
        return { 
          ...item, 
          itemCode: material.itemCode,
          description: material.description,
          uom: material.uom 
        };
      }
      return item;
    }));
  };

  const updateReturnItem = (id: string, field: keyof ReturnItem, value: string | number) => {
    setMaterialReturnItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const updateReturnItemFields = (id: string, fields: Partial<ReturnItem>) => {
    setMaterialReturnItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...fields } : item
    ));
  };

  const removeRequestItem = (type: 'raw' | 'general', id: string) => {
    const items = type === 'raw' ? rawMaterialItems : generalSuppliesItems;
    const setItems = type === 'raw' ? setRawMaterialItems : setGeneralSuppliesItems;
    
    const filtered = items.filter(item => item.id !== id);
    setItems(filtered.map((item, idx) => ({ ...item, slNo: idx + 1 })));
  };

  const removeReturnItem = (id: string) => {
    const filtered = materialReturnItems.filter(item => item.id !== id);
    setMaterialReturnItems(filtered.map((item, idx) => ({ ...item, slNo: idx + 1 })));
  };

  // Helper function to auto-fill empty requestedQty with requirementQty
  const autoFillRequestedQty = (items: RequestItem[]): RequestItem[] => {
    return items.map(item => ({
      ...item,
      requestedQty: item.requestedQty > 0 ? item.requestedQty : item.requirementQty,
    }));
  };

  // Build short label for an order (used for style tagging in multi-style requests)
  const orderShortLabel = (orderId?: string): string => {
    if (!orderId) return '';
    const o = orders.find(x => x.id === orderId);
    if (!o) return '';
    return `${o.orderNumber}${o.styleNo ? ' ' + o.styleNo : ''}`.trim();
  };

  // Apply style-tag prefix to remarks for multi-style raw requests so each line
  // clearly shows which style/order it belongs to (main order stays clean in header).
  const applyStyleTags = (items: RequestItem[], primaryOrderId: string): RequestItem[] => {
    if (rawExtraOrderIds.length === 0) return items;
    return items.map(item => {
      const tagOrderId = item.styleOrderId || primaryOrderId;
      if (!tagOrderId || tagOrderId === primaryOrderId) return item;
      const label = orderShortLabel(tagOrderId);
      if (!label) return item;
      const prefix = `[Style: ${label}]`;
      const current = item.remarks || '';
      if (current.includes(prefix)) return item;
      return { ...item, remarks: prefix + (current ? ' ' + current : '') };
    });
  };

  // Download PDF function
  const downloadPDF = (type: 'raw' | 'general' | 'return') => {
    if (type === 'raw') {
      if (rawMaterialItems.length === 0) {
        toast.error('Please add at least one item before downloading');
        return;
      }
      const selectedOrder = rawMaterialForm.orderId ? orders.find(o => o.id === rawMaterialForm.orderId) : null;
      const orderName = selectedOrder 
        ? `${selectedOrder.orderNumber} ${selectedOrder.styleNo || ''} ${selectedOrder.customer || ''} ${selectedOrder.totalQty || ''} QTY`.trim()
        : '';
      // Auto-fill empty requestedQty with requirementQty before PDF export
      const itemsForPdf = applyStyleTags(autoFillRequestedQty(rawMaterialItems), rawMaterialForm.orderId);
      exportRawMaterialRequestPDF({ ...rawMaterialForm, orderName }, itemsForPdf);
      toast.success('Raw Material Request PDF downloaded');
    } else if (type === 'general') {
      if (generalSuppliesItems.length === 0) {
        toast.error('Please add at least one item before downloading');
        return;
      }
      // Auto-fill empty requestedQty with requirementQty before PDF export
      const itemsForPdf = autoFillRequestedQty(generalSuppliesItems);
      exportGeneralSuppliesRequestPDF({ ...generalSuppliesForm }, itemsForPdf);
      toast.success('General Supplies Request PDF downloaded');
    } else {
      if (materialReturnItems.length === 0) {
        toast.error('Please add at least one item before downloading');
        return;
      }
      const selectedOrder = materialReturnForm.orderId ? orders.find(o => o.id === materialReturnForm.orderId) : null;
      const orderName = selectedOrder 
        ? `${selectedOrder.orderNumber} ${selectedOrder.styleNo || ''} ${selectedOrder.customer || ''} ${selectedOrder.totalQty || ''} QTY`.trim()
        : '';
      exportMaterialReturnSlipPDF({ ...materialReturnForm, orderName }, materialReturnItems);
      toast.success('Material Return Slip PDF downloaded');
    }
  };

  // Submit function - saves to store for monthly Excel export
  const submitRequest = (type: 'raw' | 'general' | 'return') => {
    // Validate department is required
    const form = type === 'raw' ? rawMaterialForm : type === 'general' ? generalSuppliesForm : materialReturnForm;
    if (!form.department.trim()) {
      toast.error('Department is required. Please enter a department before submitting.');
      return;
    }

    // Use existing doc number if editing, otherwise generate new one
    const isEditing = !!editingRequestId;
    const existingRequest = isEditing ? submittedRequests.find(r => r.id === editingRequestId) : null;
    const docNumber = (isEditing && (editingDocNumber || existingRequest?.docNumber))
      ? (editingDocNumber || existingRequest!.docNumber)
      : getNextDocNumber(type === 'raw' ? 'RMR' : type === 'general' ? 'GSR' : 'MRS');

    const saveOrUpdate = (requestData: Parameters<typeof addRequest>[0]) => {
      if (isEditing && editingRequestId) {
        updateRequest(editingRequestId, requestData);
        setEditingRequestId(null);
        setEditingDocNumber(null);
        toast.success(`Request ${docNumber} updated successfully`);
      } else {
        addRequest(requestData);
        toast.success(`Request ${docNumber} submitted successfully`);
      }
    };

    // Helper to save to cloud (insert new, or update existing when editing)
    const saveToCloud = (formData: RequestForm, cloudItems: { item_code?: string; description?: string; color?: string; size?: string; unit?: string; requested_qty: number; issued_qty?: number; notes?: string; sort_order?: number; requirement_id?: string }[]) => {
      const payload = {
        requestNo: docNumber,
        requestDate: formData.date,
        orderId: formData.orderId || undefined,
        department: formData.department || undefined,
        requestedBy: formData.requestedBy || undefined,
        notes: formData.approvedBy ? `Approved: ${formData.approvedBy}, Issued: ${formData.issuedBy}, ASWAQ: ${formData.aswaqNumber}` : undefined,
        items: cloudItems,
      };
      if (isEditing && editingRequestId) {
        updateCloudRequest.mutate({ requestId: editingRequestId, ...payload });
      } else {
        submitCloudRequest.mutate(payload);
      }
    };

    if (type === 'raw') {
      if (rawMaterialItems.length === 0) {
        toast.error('Please add at least one item before submitting');
        return;
      }
      
      // Auto-fill empty requestedQty with requirementQty before submission
      const itemsToSubmit = autoFillRequestedQty(rawMaterialItems);
      
      // Update requirement records
      const requirementUpdates = itemsToSubmit
        .filter(item => item.requirementId)
        .map(item => ({
          id: item.requirementId!,
          qty: item.requestedQty,
        }));
      
      if (requirementUpdates.length > 0) {
        updateRequestedQty(requirementUpdates);
      }
      
      const selectedOrder = rawMaterialForm.orderId ? orders.find(o => o.id === rawMaterialForm.orderId) : null;
      const orderName = selectedOrder 
        ? `${selectedOrder.orderNumber} ${selectedOrder.styleNo || ''} ${selectedOrder.customer || ''} ${selectedOrder.totalQty || ''} QTY`.trim()
        : '';
      saveOrUpdate({
        type: 'raw-material',
        docNumber,
        form: { ...rawMaterialForm, orderName },
        items: itemsToSubmit,
      });
      // Save to cloud
      saveToCloud(rawMaterialForm, itemsToSubmit.map((item, idx) => ({
        item_code: item.itemCode,
        description: item.description,
        unit: item.uom,
        requested_qty: item.requestedQty,
        issued_qty: item.issuedQty,
        notes: item.remarks || undefined,
        sort_order: idx + 1,
        requirement_id: item.requirementId,
      })));
      setRawMaterialForm(emptyRequestForm());
      setRawMaterialItems([]);
    } else if (type === 'general') {
      if (generalSuppliesItems.length === 0) {
        toast.error('Please add at least one item before submitting');
        return;
      }
      // Auto-fill empty requestedQty with requirementQty before submission
      const itemsToSubmit = autoFillRequestedQty(generalSuppliesItems);
      saveOrUpdate({
        type: 'general-supplies',
        docNumber,
        form: { ...generalSuppliesForm },
        items: itemsToSubmit,
      });
      // Save to cloud
      saveToCloud(generalSuppliesForm, itemsToSubmit.map((item, idx) => ({
        item_code: item.itemCode,
        description: item.description,
        unit: item.uom,
        requested_qty: item.requestedQty,
        issued_qty: item.issuedQty,
        notes: item.remarks || undefined,
        sort_order: idx + 1,
      })));
      setGeneralSuppliesForm(emptyRequestForm());
      setGeneralSuppliesItems([]);
    } else {
      if (materialReturnItems.length === 0) {
        toast.error('Please add at least one item before submitting');
        return;
      }
      const selectedOrderReturn = materialReturnForm.orderId ? orders.find(o => o.id === materialReturnForm.orderId) : null;
      const orderNameReturn = selectedOrderReturn 
        ? `${selectedOrderReturn.orderNumber} ${selectedOrderReturn.styleNo || ''} ${selectedOrderReturn.customer || ''} ${selectedOrderReturn.totalQty || ''} QTY`.trim()
        : '';
      saveOrUpdate({
        type: 'material-return',
        docNumber,
        form: { ...materialReturnForm, orderName: orderNameReturn },
        items: materialReturnItems,
      });
      // Save to cloud
      saveToCloud(materialReturnForm, materialReturnItems.map((item, idx) => ({
        item_code: item.itemCode,
        description: item.description,
        unit: item.uom,
        requested_qty: item.qtyReturned,
        issued_qty: item.qtyReceived,
        notes: item.remarks || undefined,
        sort_order: idx + 1,
      })));
      setMaterialReturnForm(emptyRequestForm());
      setMaterialReturnItems([]);
    }
  };

  const handleExportMonthlyExcel = () => {
    exportMonthlyExcel(parseInt(selectedYear), parseInt(selectedMonth));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const renderRequestForm = (
    type: 'raw' | 'general',
    form: RequestForm,
    setForm: React.Dispatch<React.SetStateAction<RequestForm>>,
    items: RequestItem[],
    title: string,
    icon: React.ReactNode,
    remarksLabel: string
  ) => {
    const selectedOrder = orders.find(o => o.id === form.orderId);
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <CardTitle>{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Document ID: {type === 'raw' ? 'RMR' : 'GSR'}-01-2024
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => downloadPDF(type)} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button onClick={() => submitRequest(type)} className="gap-2">
              <Send className="h-4 w-4" />
              {editingRequestId ? 'Update' : 'Submit'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form Header */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Department <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Enter department (required)"
                required
                className={!form.department.trim() ? 'border-destructive/50' : ''}
              />
            </div>
          </div>

          {/* Order Selection - Only show orders that have pending requirements */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Order (Optional - Auto-fill from requirements)
            </Label>
            <div className="flex gap-4 items-center">
              <Select 
                value={form.orderId || 'none'} 
                onValueChange={(value) => handleOrderSelect(value, type)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select an order to auto-fill requirements" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="none">-- No Order --</SelectItem>
                   {orders
                    .filter(order => order.id && requirements.some(r => r.orderId === order.id))
                    .map(order => {
                      const totalCount = requirements.filter(r => r.orderId === order.id).length;
                      return (
                        <SelectItem key={order.id} value={order.id}>
                          {order.orderNumber} - {order.customer} ({order.styleName}) • {totalCount} items
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              {selectedOrder && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEditOrderDialog(form.orderId)}
                    title="Edit order details"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary" className="whitespace-nowrap font-semibold">
                    {selectedOrder.orderNumber} - {selectedOrder.styleNo} - {selectedOrder.customer} - {selectedOrder.totalQty} QTY
                  </Badge>
                </>
              )}
            </div>
            {requirements.filter(r => r.orderId && r.pendingQty > 0).length === 0 && (
              <p className="text-sm text-muted-foreground">No pending requirements for this order</p>
            )}
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">SL No</TableHead>
                  <TableHead className="w-28">Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20">UOM</TableHead>
                  <TableHead className="w-24">Req. Qty</TableHead>
                  <TableHead className="w-24">Requested Qty</TableHead>
                  <TableHead className="w-24">Issued Qty</TableHead>
                  <TableHead className="w-24">Remaining Qty</TableHead>
                  <TableHead>{remarksLabel}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="h-16">
                    <TableCell className="py-2">{item.slNo}</TableCell>
                    <TableCell className="py-2">
                      <Input
                        value={item.itemCode}
                        onChange={(e) => updateRequestItem(type, item.id, 'itemCode', e.target.value)}
                        className="h-10"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <DescriptionAutocomplete
                        value={item.description}
                        onChange={(value) => updateRequestItem(type, item.id, 'description', value)}
                        onSelect={(material) => handleMaterialSelect(type, item.id, material)}
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        value={item.uom}
                        onChange={(e) => updateRequestItem(type, item.id, 'uom', e.target.value)}
                        className="h-10"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        value={item.requirementQty || ''}
                        readOnly
                        className="h-10 bg-muted/50 text-muted-foreground"
                        title="Auto-filled from order requirements"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        value={item.requestedQty || ''}
                        onChange={(e) => updateRequestItem(type, item.id, 'requestedQty', parseFloat(e.target.value) || 0)}
                        className="h-10"
                        placeholder="Enter qty"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        value={item.issuedQty || ''}
                        onChange={(e) => updateRequestItem(type, item.id, 'issuedQty', parseFloat(e.target.value) || 0)}
                        className="h-10"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        value={item.remainingQty || ''}
                        readOnly
                        className="h-10 bg-muted"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        value={item.remarks}
                        onChange={(e) => updateRequestItem(type, item.id, 'remarks', e.target.value)}
                        className="h-10"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRequestItem(type, item.id)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No items added. Select an order above to auto-fill or click "Add Item".
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Button onClick={() => addRequestItem(type)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>

          {/* Signatories */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Requested By (Line Leader)</Label>
              <Input
                value={form.requestedBy}
                onChange={(e) => setForm({ ...form, requestedBy: e.target.value })}
                placeholder="Name & Signature"
              />
            </div>
            <div className="space-y-2">
              <Label>Approved By ({type === 'raw' ? 'Production Manager' : 'Line Manager'})</Label>
              <Input
                value={form.approvedBy}
                onChange={(e) => setForm({ ...form, approvedBy: e.target.value })}
                placeholder="Name & Signature"
              />
            </div>
            <div className="space-y-2">
              <Label>Issued By (Warehouse In Charge)</Label>
              <Input
                value={form.issuedBy}
                onChange={(e) => setForm({ ...form, issuedBy: e.target.value })}
                placeholder="Name & Signature"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>ASWAQ Transaction Report Number</Label>
            <Input
              value={form.aswaqNumber}
              onChange={(e) => setForm({ ...form, aswaqNumber: e.target.value })}
              placeholder="Enter transaction number"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Material Requests</h1>
            <p className="text-muted-foreground mt-1">
              Manage requirements, raw material requests, general supplies, and material returns
            </p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            {/* Empty Forms Download Section */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <FileDown className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Empty Forms:</span>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => exportEmptyRawMaterialPDF()} 
                    variant="outline" 
                    size="sm"
                    className="gap-1"
                  >
                    <FileBox className="h-3 w-3" />
                    Raw Material
                  </Button>
                  <Button 
                    onClick={() => exportEmptyGeneralSuppliesPDF()} 
                    variant="outline" 
                    size="sm"
                    className="gap-1"
                  >
                    <Package className="h-3 w-3" />
                    General Supplies
                  </Button>
                  <Button 
                    onClick={() => exportEmptyMaterialReturnPDF()} 
                    variant="outline" 
                    size="sm"
                    className="gap-1"
                  >
                    <Undo2 className="h-3 w-3" />
                    Material Return
                  </Button>
                </div>
              </div>
            </Card>

            {/* Monthly Excel Export Section */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="flex gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {monthNames.map((month, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {[2024, 2025, 2026].map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleExportMonthlyExcel} variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {submittedRequests.length} requests submitted
              </p>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="raw-material" className="gap-2">
              <FileBox className="h-4 w-4" />
              Raw Material
            </TabsTrigger>
            <TabsTrigger value="general-supplies" className="gap-2">
              <Package className="h-4 w-4" />
              General Supplies
            </TabsTrigger>
            <TabsTrigger value="material-return" className="gap-2">
              <Undo2 className="h-4 w-4" />
              Material Return
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2">
              <Database className="h-4 w-4" />
              Records
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="raw-material" className="mt-6">
            {renderRequestForm(
              'raw',
              rawMaterialForm,
              setRawMaterialForm,
              rawMaterialItems,
              'Raw Material Request',
              <FileBox className="h-8 w-8 text-primary" />,
              'Remarks for Merchandize'
            )}
          </TabsContent>

          <TabsContent value="general-supplies" className="mt-6">
            {renderRequestForm(
              'general',
              generalSuppliesForm,
              setGeneralSuppliesForm,
              generalSuppliesItems,
              'General Supplies Request',
              <Package className="h-8 w-8 text-primary" />,
              'Remarks for Procurement'
            )}
          </TabsContent>

          <TabsContent value="material-return" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Undo2 className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle>Material Return Slip</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Document ID: MRS-01-2024
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => downloadPDF('return')} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button onClick={() => submitRequest('return')} className="gap-2">
                    <Send className="h-4 w-4" />
                    {editingRequestId ? 'Update' : 'Submit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Form Header */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={materialReturnForm.date}
                      onChange={(e) => setMaterialReturnForm({ ...materialReturnForm, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input
                      value={materialReturnForm.department}
                      onChange={(e) => setMaterialReturnForm({ ...materialReturnForm, department: e.target.value })}
                      placeholder="Enter department"
                    />
                  </div>
                </div>

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">SL No</TableHead>
                        <TableHead className="w-28">Item Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-20">UOM</TableHead>
                        <TableHead className="w-32">Quantity Returned</TableHead>
                        <TableHead className="w-32">Quantity Received</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materialReturnItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.slNo}</TableCell>
                          <TableCell>
                            <Input
                              value={item.itemCode}
                              onChange={(e) => updateReturnItem(item.id, 'itemCode', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <DescriptionAutocomplete
                              value={item.description}
                              onChange={(value) => updateReturnItem(item.id, 'description', value)}
                              onSelect={(material) => {
                                updateReturnItemFields(item.id, {
                                  description: material.description,
                                  itemCode: material.itemCode,
                                  uom: material.uom,
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.uom}
                              onChange={(e) => updateReturnItem(item.id, 'uom', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.qtyReturned || ''}
                              onChange={(e) => updateReturnItem(item.id, 'qtyReturned', parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.qtyReceived || ''}
                              onChange={(e) => updateReturnItem(item.id, 'qtyReceived', parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.remarks}
                              onChange={(e) => updateReturnItem(item.id, 'remarks', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeReturnItem(item.id)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {materialReturnItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No items added. Click "Add Item" to add materials for return.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Button onClick={addReturnItem} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>

                {/* Signatories */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Returned By (Line Leader)</Label>
                    <Input
                      value={materialReturnForm.requestedBy}
                      onChange={(e) => setMaterialReturnForm({ ...materialReturnForm, requestedBy: e.target.value })}
                      placeholder="Name & Signature"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Approved By (Line Manager)</Label>
                    <Input
                      value={materialReturnForm.approvedBy}
                      onChange={(e) => setMaterialReturnForm({ ...materialReturnForm, approvedBy: e.target.value })}
                      placeholder="Name & Signature"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Received By (Warehouse Incharge)</Label>
                    <Input
                      value={materialReturnForm.issuedBy}
                      onChange={(e) => setMaterialReturnForm({ ...materialReturnForm, issuedBy: e.target.value })}
                      placeholder="Name & Signature"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ASWAQ Transaction Report Number</Label>
                  <Input
                    value={materialReturnForm.aswaqNumber}
                    onChange={(e) => setMaterialReturnForm({ ...materialReturnForm, aswaqNumber: e.target.value })}
                    placeholder="Enter transaction number"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="mt-6">
            <RecordsAnalytics />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <RequestHistoryTable onEdit={(request) => {
              // Track which request we're editing so submit updates instead of duplicating
              setEditingRequestId(request.id);
              setEditingDocNumber(request.docNumber);
              
              // Load the request back into the appropriate form for editing
              const tabType = request.type === 'raw-material' ? 'raw-material' : 
                              request.type === 'general-supplies' ? 'general-supplies' : 'material-return';
              setActiveTab(tabType);
              
              const form = {
                date: request.form.date,
                department: request.form.department || '',
                orderId: (request.form as any).orderId || '',
                requestedBy: request.form.requestedBy || '',
                approvedBy: request.form.approvedBy || '',
                issuedBy: request.form.issuedBy || '',
                aswaqNumber: request.form.aswaqNumber || '',
              };

              if (request.type === 'material-return') {
                setMaterialReturnForm(form);
                const items = (request.items as any[]).map((item, idx) => ({
                  id: generateId(),
                  slNo: idx + 1,
                  itemCode: item.itemCode || '',
                  description: item.description || '',
                  uom: item.uom || '',
                  qtyReturned: item.qtyReturned || 0,
                  qtyReceived: item.qtyReceived || 0,
                  remarks: item.remarks || '',
                }));
                setMaterialReturnItems(items);
              } else {
                const setForm = request.type === 'raw-material' ? setRawMaterialForm : setGeneralSuppliesForm;
                const setItems = request.type === 'raw-material' ? setRawMaterialItems : setGeneralSuppliesItems;
                // Mark as manually edited so auto-sync doesn't overwrite
                if (request.type === 'raw-material') rawManualEdit.current = true;
                else generalManualEdit.current = true;
                setForm(form);
                const items = (request.items as any[]).map((item, idx) => ({
                  id: generateId(),
                  slNo: idx + 1,
                  itemCode: item.itemCode || '',
                  description: item.description || '',
                  uom: item.uom || '',
                  requirementQty: item.requirementQty || 0,
                  requestedQty: item.requestedQty || 0,
                  issuedQty: item.issuedQty || 0,
                  remainingQty: item.remainingQty || 0,
                  remarks: item.remarks || '',
                  requirementId: item.requirementId,
                }));
                setItems(items);
              }
              toast.info(`Loaded ${request.docNumber} for editing`);
            }} />
          </TabsContent>
        </Tabs>

        {/* Edit Order Dialog */}
        <Dialog open={isEditOrderOpen} onOpenChange={setIsEditOrderOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Order Number *</Label>
                  <Input
                    value={editOrderData.orderNumber}
                    onChange={(e) => setEditOrderData({ ...editOrderData, orderNumber: e.target.value })}
                    placeholder="e.g., ORD-2024-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Input
                    value={editOrderData.customer}
                    onChange={(e) => setEditOrderData({ ...editOrderData, customer: e.target.value })}
                    placeholder="Customer name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Style No</Label>
                  <Input
                    value={editOrderData.styleNo}
                    onChange={(e) => setEditOrderData({ ...editOrderData, styleNo: e.target.value })}
                    placeholder="e.g., BDU-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Style Name</Label>
                  <Input
                    value={editOrderData.styleName}
                    onChange={(e) => setEditOrderData({ ...editOrderData, styleName: e.target.value })}
                    placeholder="e.g., Combat Uniform"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Shade</Label>
                  <Input
                    value={editOrderData.shade}
                    onChange={(e) => setEditOrderData({ ...editOrderData, shade: e.target.value })}
                    placeholder="e.g., X, A, B"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Qty</Label>
                  <Input
                    type="number"
                    value={editOrderData.totalQty || ''}
                    onChange={(e) => setEditOrderData({ ...editOrderData, totalQty: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fabric Width (cm)</Label>
                  <Input
                    type="number"
                    value={editOrderData.fabricWidth || ''}
                    onChange={(e) => setEditOrderData({ ...editOrderData, fabricWidth: parseInt(e.target.value) || 145 })}
                    placeholder="145"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Delivery Date</Label>
                <Input
                  type="date"
                  value={editOrderData.deliveryDate}
                  onChange={(e) => setEditOrderData({ ...editOrderData, deliveryDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOrderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveOrderEdit}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
