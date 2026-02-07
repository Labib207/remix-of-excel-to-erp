import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Trash2, ClipboardList, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useRequirementStore, MaterialRequirement } from '@/store/requirementStore';
import { useCuttingStore } from '@/store/cuttingStore';
import { Badge } from '@/components/ui/badge';
import { DescriptionAutocomplete } from './DescriptionAutocomplete';

interface NewRequirement {
  itemCode: string;
  description: string;
  uom: string;
  requiredQty: number;
  remarks: string;
}

const emptyRequirement = (): NewRequirement => ({
  itemCode: '',
  description: '',
  uom: '',
  requiredQty: 0,
  remarks: '',
});

export function RequirementsTab() {
  const { orders } = useCuttingStore();
  const { 
    requirements, 
    addRequirement, 
    updateRequirement, 
    deleteRequirement,
    materialCatalog 
  } = useRequirementStore();
  
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [newItems, setNewItems] = useState<NewRequirement[]>([emptyRequirement()]);
  
  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const orderRequirements = requirements.filter(r => r.orderId === selectedOrderId);

  const addNewItemRow = () => {
    setNewItems([...newItems, emptyRequirement()]);
  };

  const updateNewItem = (index: number, field: keyof NewRequirement, value: string | number) => {
    setNewItems(newItems.map((item, idx) => 
      idx === index ? { ...item, [field]: value } : item
    ));
  };

  const handleMaterialSelect = (index: number, material: { itemCode: string; description: string; uom: string }) => {
    setNewItems(newItems.map((item, idx) => 
      idx === index ? { 
        ...item, 
        itemCode: material.itemCode,
        description: material.description,
        uom: material.uom 
      } : item
    ));
  };

  const removeNewItem = (index: number) => {
    if (newItems.length === 1) {
      setNewItems([emptyRequirement()]);
    } else {
      setNewItems(newItems.filter((_, idx) => idx !== index));
    }
  };

  const saveRequirements = () => {
    if (!selectedOrderId) {
      toast.error('Please select an order first');
      return;
    }

    const validItems = newItems.filter(item => 
      item.description && item.requiredQty > 0
    );

    if (validItems.length === 0) {
      toast.error('Please add at least one valid requirement');
      return;
    }

    validItems.forEach(item => {
      addRequirement({
        orderId: selectedOrderId,
        itemCode: item.itemCode,
        description: item.description,
        uom: item.uom,
        requiredQty: item.requiredQty,
        remarks: item.remarks,
      });
    });

    setNewItems([emptyRequirement()]);
    toast.success(`${validItems.length} requirement(s) added successfully`);
  };

  const handleUpdateRequirement = (id: string, field: keyof MaterialRequirement, value: string | number) => {
    updateRequirement(id, { [field]: value });
  };

  const handleDeleteRequirement = (id: string) => {
    deleteRequirement(id);
    toast.success('Requirement deleted');
  };

  return (
    <div className="space-y-6">
      {/* Order Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Select Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Order</Label>
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an order to manage requirements" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {orders.map(order => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.orderNumber} - {order.customer} ({order.styleName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOrder && (
              <div className="text-sm text-muted-foreground">
                <Badge variant="outline">{selectedOrder.totalQty} pcs</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedOrderId && (
        <>
          {/* Add New Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Material Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Item Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-20">UOM</TableHead>
                      <TableHead className="w-28">Required Qty</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.itemCode}
                            onChange={(e) => updateNewItem(index, 'itemCode', e.target.value)}
                            className="h-8"
                            placeholder="FAB-001"
                          />
                        </TableCell>
                        <TableCell>
                          <DescriptionAutocomplete
                            value={item.description}
                            onChange={(value) => updateNewItem(index, 'description', value)}
                            onSelect={(material) => handleMaterialSelect(index, material)}
                            catalog={materialCatalog}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.uom}
                            onChange={(e) => updateNewItem(index, 'uom', e.target.value)}
                            className="h-8"
                            placeholder="MTR"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.requiredQty || ''}
                            onChange={(e) => updateNewItem(index, 'requiredQty', parseFloat(e.target.value) || 0)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.remarks}
                            onChange={(e) => updateNewItem(index, 'remarks', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeNewItem(index)}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2">
                <Button onClick={addNewItemRow} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Row
                </Button>
                <Button onClick={saveRequirements} className="gap-2">
                  <Package className="h-4 w-4" />
                  Save Requirements
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Requirements
                </span>
                <Badge variant="secondary">{orderRequirements.length} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderRequirements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No requirements added for this order. Add materials above.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Item Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-20">UOM</TableHead>
                        <TableHead className="w-24">Required</TableHead>
                        <TableHead className="w-24">Requested</TableHead>
                        <TableHead className="w-24">Pending</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderRequirements.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <Input
                              value={req.itemCode}
                              onChange={(e) => handleUpdateRequirement(req.id, 'itemCode', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={req.description}
                              onChange={(e) => handleUpdateRequirement(req.id, 'description', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={req.uom}
                              onChange={(e) => handleUpdateRequirement(req.id, 'uom', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={req.requiredQty || ''}
                              onChange={(e) => handleUpdateRequirement(req.id, 'requiredQty', parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={req.requestedQty}
                              readOnly
                              className="h-8 bg-muted"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={req.pendingQty > 0 ? 'default' : 'secondary'}
                              className={req.pendingQty <= 0 ? 'bg-green-100 text-green-800' : ''}
                            >
                              {req.pendingQty}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={req.remarks}
                              onChange={(e) => handleUpdateRequirement(req.id, 'remarks', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRequirement(req.id)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
