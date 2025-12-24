import { useState, useEffect } from 'react';
import { Order, SIZES, SizeQuantity } from '@/types/cutting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface OrderFormProps {
  order?: Order | null;
  onSubmit: (order: Order) => void;
  onCancel: () => void;
}

export const OrderForm = ({ order, onSubmit, onCancel }: OrderFormProps) => {
  const { toast } = useToast();
  const isEditing = !!order;

  const [formData, setFormData] = useState({
    orderNumber: order?.orderNumber || '',
    customer: order?.customer || '',
    styleNo: order?.styleNo || '',
    styleName: order?.styleName || '',
    shade: order?.shade || '',
    fabricWidth: order?.fabricWidth?.toString() || '145',
    orderDate: order?.orderDate || new Date().toISOString().split('T')[0],
    deliveryDate: order?.deliveryDate || '',
    status: order?.status || 'pending' as const,
  });

  const [sizeQuantities, setSizeQuantities] = useState<SizeQuantity>(
    order?.sizeQuantities || SIZES.reduce((acc, size) => ({ ...acc, [size.code]: 0 }), {})
  );

  const totalQty = Object.values(sizeQuantities).reduce((sum, qty) => sum + (qty || 0), 0);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSizeChange = (sizeCode: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setSizeQuantities(prev => ({ ...prev, [sizeCode]: numValue }));
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.orderNumber.trim()) {
      toast({ title: 'Error', description: 'Order number is required', variant: 'destructive' });
      return;
    }
    if (!formData.customer.trim()) {
      toast({ title: 'Error', description: 'Customer name is required', variant: 'destructive' });
      return;
    }
    if (!formData.styleNo.trim()) {
      toast({ title: 'Error', description: 'Style number is required', variant: 'destructive' });
      return;
    }
    if (totalQty <= 0) {
      toast({ title: 'Error', description: 'Please enter at least one size quantity', variant: 'destructive' });
      return;
    }
    if (!formData.deliveryDate) {
      toast({ title: 'Error', description: 'Delivery date is required', variant: 'destructive' });
      return;
    }

    const newOrder: Order = {
      id: order?.id || `order-${Date.now()}`,
      orderNumber: formData.orderNumber.trim(),
      customer: formData.customer.trim(),
      styleNo: formData.styleNo.trim(),
      styleName: formData.styleName.trim(),
      shade: formData.shade.trim(),
      fabricWidth: parseFloat(formData.fabricWidth) || 145,
      orderDate: formData.orderDate,
      deliveryDate: formData.deliveryDate,
      status: formData.status,
      sizeQuantities,
      totalQty,
    };

    onSubmit(newOrder);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="orderNumber">Order Number *</Label>
          <Input
            id="orderNumber"
            placeholder="e.g., ORD-001"
            value={formData.orderNumber}
            onChange={(e) => handleInputChange('orderNumber', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer">Customer Name *</Label>
          <Input
            id="customer"
            placeholder="Customer name"
            value={formData.customer}
            onChange={(e) => handleInputChange('customer', e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="styleNo">Style No *</Label>
          <Input
            id="styleNo"
            placeholder="Style number"
            value={formData.styleNo}
            onChange={(e) => handleInputChange('styleNo', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="styleName">Style Name</Label>
          <Input
            id="styleName"
            placeholder="Style name"
            value={formData.styleName}
            onChange={(e) => handleInputChange('styleName', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shade">Shade</Label>
          <Input
            id="shade"
            placeholder="e.g., Black, Navy"
            value={formData.shade}
            onChange={(e) => handleInputChange('shade', e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="fabricWidth">Fabric Width (cm)</Label>
          <Input
            id="fabricWidth"
            type="number"
            placeholder="145"
            value={formData.fabricWidth}
            onChange={(e) => handleInputChange('fabricWidth', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="orderDate">Order Date</Label>
          <Input
            id="orderDate"
            type="date"
            value={formData.orderDate}
            onChange={(e) => handleInputChange('orderDate', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryDate">Delivery Date *</Label>
          <Input
            id="deliveryDate"
            type="date"
            value={formData.deliveryDate}
            onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
          <SelectTrigger id="status" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Size Quantities Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Size Quantities *</Label>
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-mono font-bold text-lg text-primary">{totalQty.toLocaleString()}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted">
                  {SIZES.map((size) => (
                    <th key={size.code} className="px-2 py-2 text-center font-mono text-xs font-medium border-r border-border last:border-r-0 min-w-[60px]">
                      {size.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {SIZES.map((size) => (
                    <td key={size.code} className="p-1 border-r border-border last:border-r-0">
                      <Input
                        type="number"
                        min="0"
                        className="h-8 text-center font-mono text-sm px-1"
                        value={sizeQuantities[size.code] || ''}
                        onChange={(e) => handleSizeChange(size.code, e.target.value)}
                        placeholder="0"
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">
          {isEditing ? 'Update Order' : 'Create Order'}
        </Button>
      </div>
    </div>
  );
};
