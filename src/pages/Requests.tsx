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
import { Plus, Trash2, Printer, Download, Package, Undo2, FileBox } from 'lucide-react';
import { format } from 'date-fns';

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

export default function Requests() {
  const [activeTab, setActiveTab] = useState('raw-material');
  
  // Raw Material Request State
  const [rawMaterialForm, setRawMaterialForm] = useState<RequestForm>({
    date: format(new Date(), 'yyyy-MM-dd'),
    department: '',
    requestedBy: '',
    approvedBy: '',
    issuedBy: '',
    aswaqNumber: '',
  });
  const [rawMaterialItems, setRawMaterialItems] = useState<RequestItem[]>([]);

  // General Supplies Request State
  const [generalSuppliesForm, setGeneralSuppliesForm] = useState<RequestForm>({
    date: format(new Date(), 'yyyy-MM-dd'),
    department: '',
    requestedBy: '',
    approvedBy: '',
    issuedBy: '',
    aswaqNumber: '',
  });
  const [generalSuppliesItems, setGeneralSuppliesItems] = useState<RequestItem[]>([]);

  // Material Return Slip State
  const [materialReturnForm, setMaterialReturnForm] = useState<RequestForm>({
    date: format(new Date(), 'yyyy-MM-dd'),
    department: '',
    requestedBy: '',
    approvedBy: '',
    issuedBy: '',
    aswaqNumber: '',
  });
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

  const printRequest = (type: 'raw' | 'general' | 'return') => {
    const docNumber = getNextDocNumber(
      type === 'raw' ? 'RMR' : type === 'general' ? 'GSR' : 'MRS'
    );
    
    let title = '';
    let form: RequestForm;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    let signatories: { role: string; name: string }[] = [];

    if (type === 'raw') {
      title = 'RAW MATERIAL REQUEST';
      form = rawMaterialForm;
      tableHeaders = ['SL No', 'Item Code', 'Description', 'UOM', 'Requested Qty', 'Issued Qty', 'Remaining Qty', 'Remarks for Merchandize'];
      tableRows = rawMaterialItems.map(item => [
        item.slNo.toString(),
        item.itemCode,
        item.description,
        item.uom,
        item.requestedQty.toString(),
        item.issuedQty.toString(),
        item.remainingQty.toString(),
        item.remarks,
      ]);
      signatories = [
        { role: 'Line Leader', name: form.requestedBy },
        { role: 'Production Manager', name: form.approvedBy },
        { role: 'Warehouse In Charge', name: form.issuedBy },
      ];
    } else if (type === 'general') {
      title = 'GENERAL SUPPLIES REQUEST';
      form = generalSuppliesForm;
      tableHeaders = ['SL', 'Item Code', 'Description', 'UOM', 'Requested Quantity', 'Issued Quantity', 'Remaining Quantity', 'Remarks for Procurement'];
      tableRows = generalSuppliesItems.map(item => [
        item.slNo.toString(),
        item.itemCode,
        item.description,
        item.uom,
        item.requestedQty.toString(),
        item.issuedQty.toString(),
        item.remainingQty.toString(),
        item.remarks,
      ]);
      signatories = [
        { role: 'Line Leader', name: form.requestedBy },
        { role: 'Line Manager', name: form.approvedBy },
        { role: 'Warehouse In Charge', name: form.issuedBy },
      ];
    } else {
      title = 'MATERIAL RETURN SLIP';
      form = materialReturnForm;
      tableHeaders = ['SL No', 'Item Code', 'Description', 'UOM', 'Quantity Returned', 'Quantity Received', 'Remarks'];
      tableRows = materialReturnItems.map(item => [
        item.slNo.toString(),
        item.itemCode,
        item.description,
        item.uom,
        item.qtyReturned.toString(),
        item.qtyReceived.toString(),
        item.remarks,
      ]);
      signatories = [
        { role: 'Line Leader', name: form.requestedBy },
        { role: 'Line Manager', name: form.approvedBy },
        { role: 'Warehouse Incharge', name: form.issuedBy },
      ];
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - ${docNumber}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .logo-section { display: flex; align-items: center; gap: 10px; }
          .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; text-align: center; }
          .company-name { font-size: 16px; font-weight: bold; }
          .company-subtitle { font-size: 10px; color: #666; }
          .doc-info { text-align: right; }
          .doc-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .doc-number { font-size: 11px; color: #666; }
          .form-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .form-field { display: flex; gap: 10px; }
          .form-label { font-weight: bold; min-width: 80px; }
          .form-value { border-bottom: 1px solid #ccc; flex: 1; min-width: 150px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 40px; }
          .signature-box { text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
          .signature-role { font-size: 10px; color: #666; }
          .aswaq { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <div class="logo">GHOUSH</div>
            <div>
              <div class="company-name">GHOUSH</div>
              <div class="company-subtitle">MILITARY & SAFETY UNIFORMS</div>
              <div class="company-subtitle">OF ADEEM UNIFORM FACTORY</div>
            </div>
          </div>
          <div class="doc-info">
            <div class="doc-title">${title}</div>
            <div class="doc-number">Document ID: ${docNumber}</div>
            <div class="doc-number">Issue Number: GAU-VER 01-JAN-2024</div>
          </div>
        </div>

        <div class="form-info">
          <div class="form-field">
            <span class="form-label">Date:</span>
            <span class="form-value">${format(new Date(form.date), 'dd/MM/yyyy')}</span>
          </div>
          <div class="form-field">
            <span class="form-label">Department:</span>
            <span class="form-value">${form.department}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              ${tableHeaders.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows.length > 0 ? tableRows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('') : `
              <tr>
                ${tableHeaders.map(() => '<td>&nbsp;</td>').join('')}
              </tr>
              <tr>
                ${tableHeaders.map(() => '<td>&nbsp;</td>').join('')}
              </tr>
              <tr>
                ${tableHeaders.map(() => '<td>&nbsp;</td>').join('')}
              </tr>
            `}
          </tbody>
        </table>

        <div class="signatures">
          ${signatories.map((s, i) => `
            <div class="signature-box">
              <div>${i === 0 ? 'Requested By' : i === 1 ? 'Approved By' : 'Issued By'}</div>
              <div class="signature-line">${s.name || 'Name & Signature'}</div>
              <div class="signature-role">${s.role}</div>
            </div>
          `).join('')}
        </div>

        <div class="aswaq">
          <strong>ASWAQ Transaction Report Number:</strong> ${form.aswaqNumber || '_______________'}
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

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
        <Button onClick={() => printRequest(type)} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Material Requests</h1>
          <p className="text-muted-foreground mt-1">
            Manage raw material requests, general supplies, and material returns
          </p>
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
                <Button onClick={() => printRequest('return')} variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
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
