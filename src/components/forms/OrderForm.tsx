import { useState } from 'react';
import { Order, SIZES, SizeQuantity, Size } from '@/types/cutting';
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
import { Plus, X, Edit2 } from 'lucide-react';

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

  // Custom sizes state - use order's custom sizes or default SIZES
  const [useCustomSizes, setUseCustomSizes] = useState<boolean>(!!order?.customSizes?.length);
  const [customSizes, setCustomSizes] = useState<Size[]>(
    order?.customSizes?.length ? order.customSizes : []
  );
  const [newSizeCode, setNewSizeCode] = useState('');
  const [editingSize, setEditingSize] = useState<string | null>(null);
  const [editSizeValue, setEditSizeValue] = useState('');

  // Get active sizes based on mode
  const activeSizes = useCustomSizes && customSizes.length > 0 ? customSizes : SIZES;

  const [sizeQuantities, setSizeQuantities] = useState<SizeQuantity>(() => {
    if (order?.sizeQuantities) {
      return order.sizeQuantities;
    }
    return activeSizes.reduce((acc, size) => ({ ...acc, [size.code]: 0 }), {});
  });

  const totalQty = Object.values(sizeQuantities).reduce((sum, qty) => sum + (qty || 0), 0);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSizeChange = (sizeCode: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setSizeQuantities(prev => ({ ...prev, [sizeCode]: numValue }));
  };

  const handleAddCustomSize = () => {
    const trimmedCode = newSizeCode.trim().toUpperCase();
    if (!trimmedCode) {
      toast({ title: 'Error', description: 'Size code cannot be empty', variant: 'destructive' });
      return;
    }
    if (customSizes.some(s => s.code === trimmedCode)) {
      toast({ title: 'Error', description: 'Size code already exists', variant: 'destructive' });
      return;
    }
    
    setCustomSizes(prev => [...prev, { code: trimmedCode, label: trimmedCode }]);
    setSizeQuantities(prev => ({ ...prev, [trimmedCode]: 0 }));
    setNewSizeCode('');
  };

  const handleRemoveCustomSize = (code: string) => {
    setCustomSizes(prev => prev.filter(s => s.code !== code));
    setSizeQuantities(prev => {
      const { [code]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleEditSize = (code: string) => {
    setEditingSize(code);
    setEditSizeValue(code);
  };

  const handleSaveEditSize = (oldCode: string) => {
    const newCode = editSizeValue.trim().toUpperCase();
    if (!newCode) {
      toast({ title: 'Error', description: 'Size code cannot be empty', variant: 'destructive' });
      return;
    }
    if (newCode !== oldCode && customSizes.some(s => s.code === newCode)) {
      toast({ title: 'Error', description: 'Size code already exists', variant: 'destructive' });
      return;
    }

    setCustomSizes(prev => prev.map(s => 
      s.code === oldCode ? { code: newCode, label: newCode } : s
    ));
    
    if (newCode !== oldCode) {
      setSizeQuantities(prev => {
        const qty = prev[oldCode] || 0;
        const { [oldCode]: _, ...rest } = prev;
        return { ...rest, [newCode]: qty };
      });
    }
    
    setEditingSize(null);
    setEditSizeValue('');
  };

  const handleToggleCustomSizes = () => {
    if (!useCustomSizes) {
      // Switching to custom sizes
      setUseCustomSizes(true);
      if (customSizes.length === 0) {
        // Initialize with empty custom sizes
        setSizeQuantities({});
      }
    } else {
      // Switching back to default sizes
      setUseCustomSizes(false);
      setSizeQuantities(SIZES.reduce((acc, size) => ({ ...acc, [size.code]: 0 }), {}));
    }
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
    if (useCustomSizes && customSizes.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one size', variant: 'destructive' });
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

    // Filter sizeQuantities to only include active sizes with values > 0
    const filteredSizeQuantities: SizeQuantity = {};
    activeSizes.forEach(size => {
      if (sizeQuantities[size.code] > 0) {
        filteredSizeQuantities[size.code] = sizeQuantities[size.code];
      }
    });

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
      sizeQuantities: filteredSizeQuantities,
      customSizes: useCustomSizes && customSizes.length > 0 ? customSizes : undefined,
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

      {/* Size Mode Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Size Quantities *</Label>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant={useCustomSizes ? "default" : "outline"}
              size="sm"
              onClick={handleToggleCustomSizes}
            >
              {useCustomSizes ? "Using Custom Sizes" : "Use Custom Sizes"}
            </Button>
            <div className="text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-mono font-bold text-lg text-primary">{totalQty.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Custom Size Input */}
        {useCustomSizes && (
          <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
            <Label className="text-sm text-muted-foreground">Add custom sizes (e.g., 35, 36, 37 or S, M, L)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter size code (e.g., 35, XS)"
                value={newSizeCode}
                onChange={(e) => setNewSizeCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSize()}
                className="max-w-xs"
              />
              <Button type="button" onClick={handleAddCustomSize} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Size
              </Button>
            </div>
            
            {customSizes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {customSizes.map((size) => (
                  <div key={size.code} className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                    {editingSize === size.code ? (
                      <>
                        <Input
                          value={editSizeValue}
                          onChange={(e) => setEditSizeValue(e.target.value)}
                          className="h-6 w-16 text-xs px-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditSize(size.code);
                            if (e.key === 'Escape') setEditingSize(null);
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => handleSaveEditSize(size.code)}
                        >
                          ✓
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="font-mono text-sm">{size.code}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEditSize(size.code)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveCustomSize(size.code)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Size Quantities Grid */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted">
                  {activeSizes.map((size) => (
                    <th key={size.code} className="px-2 py-2 text-center font-mono text-xs font-medium border-r border-border last:border-r-0 min-w-[60px]">
                      {size.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {activeSizes.map((size) => (
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