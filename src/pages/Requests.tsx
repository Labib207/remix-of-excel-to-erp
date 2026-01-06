import { useState } from 'react';
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
import { Plus, Trash2, Download, Package, Undo2, FileBox, Send, FileSpreadsheet, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRequestStore } from '@/store/requestStore';
import {
  exportRawMaterialRequestPDF,
  exportGeneralSuppliesRequestPDF,
  exportMaterialReturnSlipPDF,
} from '@/lib/requestPdfExport';

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
  requestedBy: string;
  approvedBy: string;
  issuedBy: string;
  aswaqNumber: string;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const getNextDocNumber = (prefix: string) => {
  const key = `docNumber_${prefix}`;
  const stored = localStorage.getItem(key);
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  let counter = 1;
  if (stored) {
    const [storedYearMonth, storedCounter] = stored.split('-');
    if (storedYearMonth === yearMonth) {
      counter = parseInt(storedCounter) + 1;
    }
  }
  
  localStorage.setItem(key, `${yearMonth}-${counter}`);
  return `${prefix}-${String(counter).padStart(4, '0')}-${yearMonth}`;
};

const emptyRequestForm = (): RequestForm => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  department: '',
  requestedBy: '',
  approvedBy: '',
  issuedBy: '',
  aswaqNumber: '',
});

export default function Requests() {
  const [activeTab, setActiveTab] = useState('raw-material');
  const { addRequest, exportMonthlyExcel, submittedRequests } = useRequestStore();
  
  // Month/Year selector for export
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Raw Material Request State
  const [rawMaterialForm, setRawMaterialForm] = useState<RequestForm>(emptyRequestForm());
  const [rawMaterialItems, setRawMaterialItems] = useState<RequestItem[]>([]);

  // General Supplies Request State
  const [generalSuppliesForm, setGeneralSuppliesForm] = useState<RequestForm>(emptyRequestForm());
  const [generalSuppliesItems, setGeneralSuppliesItems] = useState<RequestItem[]>([]);

  // Material Return Slip State
  const [materialReturnForm, setMaterialReturnForm] = useState<RequestForm>(emptyRequestForm());
  const [materialReturnItems, setMaterialReturnItems] = useState<ReturnItem[]>([]);

  const addRequestItem = (type: 'raw' | 'general') => {
    const items = type === 'raw' ? rawMaterialItems : generalSuppliesItems;
    const setItems = type === 'raw' ? setRawMaterialItems : setGeneralSuppliesItems;
    
    const newItem: RequestItem = {
      id: generateId(),
      slNo: items.length + 1,
      itemCode: '',
      description: '',
      uom: '',
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

  const updateReturnItem = (id: string, field: keyof ReturnItem, value: string | number) => {
    setMaterialReturnItems(materialReturnItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
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

  // Download PDF function
  const downloadPDF = (type: 'raw' | 'general' | 'return') => {
    if (type === 'raw') {
      if (rawMaterialItems.length === 0) {
        toast.error('Please add at least one item before downloading');
        return;
      }
      exportRawMaterialRequestPDF(rawMaterialForm, rawMaterialItems);
      toast.success('Raw Material Request PDF downloaded');
    } else if (type === 'general') {
      if (generalSuppliesItems.length === 0) {
        toast.error('Please add at least one item before downloading');
        return;
      }
      exportGeneralSuppliesRequestPDF(generalSuppliesForm, generalSuppliesItems);
      toast.success('General Supplies Request PDF downloaded');
    } else {
      if (materialReturnItems.length === 0) {
        toast.error('Please add at least one item before downloading');
        return;
      }
      exportMaterialReturnSlipPDF(materialReturnForm, materialReturnItems);
      toast.success('Material Return Slip PDF downloaded');
    }
  };

  // Submit function - saves to store for monthly Excel export
  const submitRequest = (type: 'raw' | 'general' | 'return') => {
    const docNumber = getNextDocNumber(
      type === 'raw' ? 'RMR' : type === 'general' ? 'GSR' : 'MRS'
    );

    if (type === 'raw') {
      if (rawMaterialItems.length === 0) {
        toast.error('Please add at least one item before submitting');
        return;
      }
      addRequest({
        type: 'raw-material',
        docNumber,
        form: rawMaterialForm,
        items: rawMaterialItems,
      });
      setRawMaterialForm(emptyRequestForm());
      setRawMaterialItems([]);
      toast.success(`Raw Material Request ${docNumber} submitted successfully`);
    } else if (type === 'general') {
      if (generalSuppliesItems.length === 0) {
        toast.error('Please add at least one item before submitting');
        return;
      }
      addRequest({
        type: 'general-supplies',
        docNumber,
        form: generalSuppliesForm,
        items: generalSuppliesItems,
      });
      setGeneralSuppliesForm(emptyRequestForm());
      setGeneralSuppliesItems([]);
      toast.success(`General Supplies Request ${docNumber} submitted successfully`);
    } else {
      if (materialReturnItems.length === 0) {
        toast.error('Please add at least one item before submitting');
        return;
      }
      addRequest({
        type: 'material-return',
        docNumber,
        form: materialReturnForm,
        items: materialReturnItems,
      });
      setMaterialReturnForm(emptyRequestForm());
      setMaterialReturnItems([]);
      toast.success(`Material Return Slip ${docNumber} submitted successfully`);
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
  ) => (
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
            Submit
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
            <Label>Department</Label>
            <Input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
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
                <TableHead className="w-28">Requested Qty</TableHead>
                <TableHead className="w-28">Issued Qty</TableHead>
                <TableHead className="w-28">Remaining Qty</TableHead>
                <TableHead>{remarksLabel}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.slNo}</TableCell>
                  <TableCell>
                    <Input
                      value={item.itemCode}
                      onChange={(e) => updateRequestItem(type, item.id, 'itemCode', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) => updateRequestItem(type, item.id, 'description', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.uom}
                      onChange={(e) => updateRequestItem(type, item.id, 'uom', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.requestedQty || ''}
                      onChange={(e) => updateRequestItem(type, item.id, 'requestedQty', parseInt(e.target.value) || 0)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.issuedQty || ''}
                      onChange={(e) => updateRequestItem(type, item.id, 'issuedQty', parseInt(e.target.value) || 0)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.remainingQty}
                      readOnly
                      className="h-8 bg-muted"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.remarks}
                      onChange={(e) => updateRequestItem(type, item.id, 'remarks', e.target.value)}
                      className="h-8"
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
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No items added. Click "Add Item" to add materials.
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Material Requests</h1>
            <p className="text-muted-foreground mt-1">
              Manage raw material requests, general supplies, and material returns
            </p>
          </div>
          
          {/* Monthly Excel Export Section */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div className="flex gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectContent>
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="raw-material" className="gap-2">
              <FileBox className="h-4 w-4" />
              Raw Material Request
            </TabsTrigger>
            <TabsTrigger value="general-supplies" className="gap-2">
              <Package className="h-4 w-4" />
              General Supplies
            </TabsTrigger>
            <TabsTrigger value="material-return" className="gap-2">
              <Undo2 className="h-4 w-4" />
              Material Return
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
                    Submit
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
                            <Input
                              value={item.description}
                              onChange={(e) => updateReturnItem(item.id, 'description', e.target.value)}
                              className="h-8"
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
                              onChange={(e) => updateReturnItem(item.id, 'qtyReturned', parseInt(e.target.value) || 0)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.qtyReceived || ''}
                              onChange={(e) => updateReturnItem(item.id, 'qtyReceived', parseInt(e.target.value) || 0)}
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
        </Tabs>
      </div>
    </MainLayout>
  );
}
