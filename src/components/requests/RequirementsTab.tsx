import { useState, useCallback } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, ClipboardList, Package, PlusCircle, Pencil, Loader2, Filter, Save } from 'lucide-react';
import { toast } from 'sonner';
import { MaterialRequirement } from '@/store/requirementStore';
import { useDbOrders, useCreateDbOrder, useDeleteDbOrder, useUpdateDbOrder } from '@/hooks/useDbOrders';
import { useDbRequirements, useCreateDbRequirement, useCreateDbRequirements, useUpdateDbRequirement, useDeleteDbRequirement } from '@/hooks/useDbRequirements';
import { useRequirementStore } from '@/store/requirementStore';
import { Badge } from '@/components/ui/badge';
import { DescriptionAutocomplete } from './DescriptionAutocomplete';
import { format } from 'date-fns';
import { Order } from '@/types/cutting';

interface NewRequirement {
  itemCode: string;
  description: string;
  uom: string;
  requiredQty: number;
  remarks: string;
}

interface NewOrder {
  orderNumber: string;
  customer: string;
  styleNo: string;
  styleName: string;
  shade: string;
  totalQty: number;
  fabricWidth: number;
  deliveryDate: string;
}

const emptyRequirement = (): NewRequirement => ({
  itemCode: '',
  description: '',
  uom: '',
  requiredQty: 0,
  remarks: '',
});

const emptyOrder = (): NewOrder => ({
  orderNumber: '',
  customer: '',
  styleNo: '',
  styleName: '',
  shade: '',
  totalQty: 0,
  fabricWidth: 145,
  deliveryDate: format(new Date(), 'yyyy-MM-dd'),
});

export function RequirementsTab() {
  // DB hooks
  const { data: orders = [], isLoading: ordersLoading } = useDbOrders();
  const createOrder = useCreateDbOrder();
  const deleteOrderMutation = useDeleteDbOrder();
  const updateOrderMutation = useUpdateDbOrder();
  
  const { data: allRequirements = [], isLoading: reqsLoading } = useDbRequirements();
  const createRequirement = useCreateDbRequirement();
  const createRequirementsBatch = useCreateDbRequirements();
  const updateRequirementMutation = useUpdateDbRequirement();
  const deleteRequirementMutation = useDeleteDbRequirement();
  
  // Material catalog still from store (read-only reference data)
  const { materialCatalog } = useRequirementStore();
  
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [newItems, setNewItems] = useState<NewRequirement[]>([emptyRequirement()]);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState<NewOrder>(emptyOrder());
  const [editOrder, setEditOrder] = useState<NewOrder>(emptyOrder());
  const [groupByDescription, setGroupByDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const orderRequirements = allRequirements.filter(r => r.orderId === selectedOrderId);

  // Group requirements by description keyword (first word or category)
  const getGroupKey = (description: string) => {
    if (!description) return 'Other';
    const lower = description.toLowerCase();
    // Common garment material categories
    const categories = ['label', 'zipper', 'button', 'thread', 'elastic', 'tape', 'fabric', 'lining', 'interlining', 'fusing', 'velcro', 'buckle', 'cord', 'webbing', 'snap', 'hook', 'eyelet', 'rivet', 'patch', 'badge', 'ribbon', 'binding', 'drawstring', 'sticker', 'poly', 'carton', 'hanger', 'tag', 'needle', 'bobbin'];
    for (const cat of categories) {
      if (lower.includes(cat)) return cat.charAt(0).toUpperCase() + cat.slice(1);
    }
    // Fall back to first word
    const firstWord = description.split(/[\s-_,]+/)[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  };

  const sortedRequirements = groupByDescription
    ? [...orderRequirements].sort((a, b) => {
        const groupA = getGroupKey(a.description);
        const groupB = getGroupKey(b.description);
        if (groupA !== groupB) return groupA.localeCompare(groupB);
        return a.description.localeCompare(b.description);
      })
    : orderRequirements;

  const handleDeleteOrder = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteOrderMutation.mutate(orderId);
    if (selectedOrderId === orderId) {
      setSelectedOrderId('');
    }
  };

  const handleAddOrder = () => {
    if (!newOrder.orderNumber || !newOrder.customer) {
      toast.error('Please fill in Order Number and Customer');
      return;
    }

    const orderData: Order = {
      id: '',
      orderNumber: newOrder.orderNumber,
      customer: newOrder.customer,
      styleNo: newOrder.styleNo,
      styleName: newOrder.styleName,
      shade: newOrder.shade || 'X',
      totalQty: newOrder.totalQty,
      sizeQuantities: {},
      fabricWidth: newOrder.fabricWidth,
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      deliveryDate: newOrder.deliveryDate,
      status: 'pending',
    };

    createOrder.mutate(orderData, {
      onSuccess: (savedOrder) => {
        setSelectedOrderId(savedOrder.id);
        setNewOrder(emptyOrder());
        setIsAddOrderOpen(false);
      }
    });
  };

  const openEditOrder = () => {
    if (!selectedOrderId) return;
    const order = orders.find(o => o.id === selectedOrderId);
    if (order) {
      setEditOrder({
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

  const handleEditOrder = () => {
    if (!editOrder.orderNumber || !editOrder.customer) {
      toast.error('Please fill in Order Number and Customer');
      return;
    }

    updateOrderMutation.mutate({
      id: selectedOrderId,
      orderNumber: editOrder.orderNumber,
      customer: editOrder.customer,
      styleNo: editOrder.styleNo,
      styleName: editOrder.styleName,
      shade: editOrder.shade || 'X',
      totalQty: editOrder.totalQty,
      fabricWidth: editOrder.fabricWidth,
      deliveryDate: editOrder.deliveryDate,
    }, {
      onSuccess: () => {
        setIsEditOrderOpen(false);
      }
    });
  };

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

    // Use batch creation to prevent race conditions
    const batchItems = validItems.map(item => ({
      orderId: selectedOrderId,
      itemCode: item.itemCode,
      description: item.description,
      uom: item.uom,
      requiredQty: item.requiredQty,
      remarks: item.remarks,
    }));

    createRequirementsBatch.mutate(batchItems, {
      onSuccess: () => {
        setNewItems([emptyRequirement()]);
        toast.success(`${validItems.length} requirement(s) added successfully`);
      }
    });
  };

  const handleUpdateRequirement = (id: string, field: keyof MaterialRequirement, value: string | number) => {
    updateRequirementMutation.mutate({ id, [field]: value });
  };

  const handleDeleteRequirement = (id: string) => {
    deleteRequirementMutation.mutate(id);
  };

  const handleSaveAllChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      await syncEngine.syncAll();
      toast.success('All changes saved and synced');
    } catch (error: any) {
      toast.error('Save failed: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  if (ordersLoading || reqsLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Order Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Select or Create Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Order</Label>
              <div className="flex gap-2">
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger className="flex-1">
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
                {selectedOrderId && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={openEditOrder}
                      title="Edit this order"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={(e) => handleDeleteOrder(selectedOrderId, e)}
                      title="Delete this order"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Add New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Order</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Order Number *</Label>
                      <Input
                        value={newOrder.orderNumber}
                        onChange={(e) => setNewOrder({ ...newOrder, orderNumber: e.target.value })}
                        placeholder="e.g., ORD-2024-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Customer *</Label>
                      <Input
                        value={newOrder.customer}
                        onChange={(e) => setNewOrder({ ...newOrder, customer: e.target.value })}
                        placeholder="Customer name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Style No</Label>
                      <Input
                        value={newOrder.styleNo}
                        onChange={(e) => setNewOrder({ ...newOrder, styleNo: e.target.value })}
                        placeholder="e.g., BDU-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Style Name</Label>
                      <Input
                        value={newOrder.styleName}
                        onChange={(e) => setNewOrder({ ...newOrder, styleName: e.target.value })}
                        placeholder="e.g., Combat Uniform"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Shade</Label>
                      <Input
                        value={newOrder.shade}
                        onChange={(e) => setNewOrder({ ...newOrder, shade: e.target.value })}
                        placeholder="e.g., X, A, B"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Qty</Label>
                      <Input
                        type="number"
                        value={newOrder.totalQty || ''}
                        onChange={(e) => setNewOrder({ ...newOrder, totalQty: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fabric Width (cm)</Label>
                      <Input
                        type="number"
                        value={newOrder.fabricWidth || ''}
                        onChange={(e) => setNewOrder({ ...newOrder, fabricWidth: parseInt(e.target.value) || 145 })}
                        placeholder="145"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Date</Label>
                    <Input
                      type="date"
                      value={newOrder.deliveryDate}
                      onChange={(e) => setNewOrder({ ...newOrder, deliveryDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddOrderOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddOrder} disabled={createOrder.isPending}>
                    {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Order
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
                        value={editOrder.orderNumber}
                        onChange={(e) => setEditOrder({ ...editOrder, orderNumber: e.target.value })}
                        placeholder="e.g., ORD-2024-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Customer *</Label>
                      <Input
                        value={editOrder.customer}
                        onChange={(e) => setEditOrder({ ...editOrder, customer: e.target.value })}
                        placeholder="Customer name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Style No</Label>
                      <Input
                        value={editOrder.styleNo}
                        onChange={(e) => setEditOrder({ ...editOrder, styleNo: e.target.value })}
                        placeholder="e.g., BDU-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Style Name</Label>
                      <Input
                        value={editOrder.styleName}
                        onChange={(e) => setEditOrder({ ...editOrder, styleName: e.target.value })}
                        placeholder="e.g., Combat Uniform"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Shade</Label>
                      <Input
                        value={editOrder.shade}
                        onChange={(e) => setEditOrder({ ...editOrder, shade: e.target.value })}
                        placeholder="e.g., X, A, B"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Qty</Label>
                      <Input
                        type="number"
                        value={editOrder.totalQty || ''}
                        onChange={(e) => setEditOrder({ ...editOrder, totalQty: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fabric Width (cm)</Label>
                      <Input
                        type="number"
                        value={editOrder.fabricWidth || ''}
                        onChange={(e) => setEditOrder({ ...editOrder, fabricWidth: parseInt(e.target.value) || 145 })}
                        placeholder="145"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Date</Label>
                    <Input
                      type="date"
                      value={editOrder.deliveryDate}
                      onChange={(e) => setEditOrder({ ...editOrder, deliveryDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditOrderOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditOrder} disabled={updateOrderMutation.isPending}>
                    {updateOrderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {selectedOrder && (
              <Badge variant="outline">{selectedOrder.totalQty} pcs</Badge>
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
                <Button onClick={saveRequirements} className="gap-2" disabled={createRequirementsBatch.isPending}>
                  {createRequirementsBatch.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                <div className="flex items-center gap-2">
                  <Button
                    variant={groupByDescription ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                    onClick={() => setGroupByDescription(!groupByDescription)}
                  >
                    <Filter className="h-4 w-4" />
                    {groupByDescription ? 'Grouped' : 'Group by Type'}
                  </Button>
                  <Badge variant="secondary">{orderRequirements.length} items</Badge>
                </div>
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
                      {sortedRequirements.map((req, idx) => {
                        const currentGroup = groupByDescription ? getGroupKey(req.description) : null;
                        const prevGroup = idx > 0 && groupByDescription ? getGroupKey(sortedRequirements[idx - 1].description) : null;
                        const showGroupHeader = groupByDescription && currentGroup !== prevGroup;
                        
                        return (
                          <>
                            {showGroupHeader && (
                              <TableRow key={`group-${currentGroup}`}>
                                <TableCell colSpan={8} className="bg-muted/50 py-2 font-semibold text-sm text-foreground">
                                  {currentGroup}
                                </TableCell>
                              </TableRow>
                            )}
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
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              {orderRequirements.length > 0 && (
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={handleSaveAllChanges} 
                    disabled={isSaving}
                    className="gap-2"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
