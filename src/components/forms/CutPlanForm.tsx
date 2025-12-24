import { useState } from 'react';
import { CutPlan, Order, SIZES, SizeQuantity } from '@/types/cutting';
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

interface CutPlanFormProps {
  orders: Order[];
  existingCutPlans: CutPlan[];
  onSubmit: (cutPlan: CutPlan) => void;
  onCancel: () => void;
}

export const CutPlanForm = ({ orders, existingCutPlans, onSubmit, onCancel }: CutPlanFormProps) => {
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    orderId: '',
    cutNo: (Math.max(...existingCutPlans.map(cp => cp.cutNo), 0) + 1).toString(),
    shade: '',
    plies: '',
    markerLength: '',
    layLength: '',
    date: new Date().toISOString().split('T')[0],
    status: 'planned' as const,
  });

  const [sizeQuantities, setSizeQuantities] = useState<SizeQuantity>(
    SIZES.reduce((acc, size) => ({ ...acc, [size.code]: 0 }), {})
  );

  const totalQty = Object.values(sizeQuantities).reduce((sum, qty) => sum + (qty || 0), 0);
  const fabricUsed = parseFloat(formData.layLength || '0') * parseFloat(formData.plies || '0');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSizeChange = (sizeCode: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setSizeQuantities(prev => ({ ...prev, [sizeCode]: numValue }));
  };

  const handleSubmit = () => {
    if (!formData.orderId) {
      toast({ title: 'Error', description: 'Please select an order', variant: 'destructive' });
      return;
    }
    if (!formData.cutNo || parseInt(formData.cutNo) <= 0) {
      toast({ title: 'Error', description: 'Cut number is required', variant: 'destructive' });
      return;
    }
    if (!formData.plies || parseInt(formData.plies) <= 0) {
      toast({ title: 'Error', description: 'Number of plies is required', variant: 'destructive' });
      return;
    }
    if (totalQty <= 0) {
      toast({ title: 'Error', description: 'Please enter at least one size quantity', variant: 'destructive' });
      return;
    }

    const newCutPlan: CutPlan = {
      id: `cp-${Date.now()}`,
      orderId: formData.orderId,
      markerId: '', // Manual entry, no marker
      cutNo: parseInt(formData.cutNo),
      shade: formData.shade,
      plies: parseInt(formData.plies),
      markerLength: parseFloat(formData.markerLength) || 0,
      layLength: parseFloat(formData.layLength) || 0,
      sizes: sizeQuantities,
      totalQty,
      fabricUsed,
      date: formData.date,
      status: formData.status,
    };

    onSubmit(newCutPlan);
  };

  const selectedOrder = orders.find(o => o.id === formData.orderId);

  return (
    <div className="space-y-6">
      {/* Order Selection */}
      <div className="space-y-2">
        <Label htmlFor="order">Select Order *</Label>
        <Select value={formData.orderId} onValueChange={(value) => {
          handleInputChange('orderId', value);
          const order = orders.find(o => o.id === value);
          if (order) {
            handleInputChange('shade', order.shade);
          }
        }}>
          <SelectTrigger id="order">
            <SelectValue placeholder="Select an order" />
          </SelectTrigger>
          <SelectContent>
            {orders.map(order => (
              <SelectItem key={order.id} value={order.id}>
                {order.orderNumber} - {order.customer} ({order.styleNo})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedOrder && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <p><span className="text-muted-foreground">Customer:</span> {selectedOrder.customer}</p>
          <p><span className="text-muted-foreground">Style:</span> {selectedOrder.styleNo} - {selectedOrder.styleName}</p>
          <p><span className="text-muted-foreground">Order Total:</span> {selectedOrder.totalQty.toLocaleString()} pcs</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cutNo">Cut No *</Label>
          <Input
            id="cutNo"
            type="number"
            min="1"
            value={formData.cutNo}
            onChange={(e) => handleInputChange('cutNo', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shade">Shade</Label>
          <Input
            id="shade"
            placeholder="e.g., X, Black"
            value={formData.shade}
            onChange={(e) => handleInputChange('shade', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plies">Number of Plies *</Label>
          <Input
            id="plies"
            type="number"
            min="1"
            placeholder="100"
            value={formData.plies}
            onChange={(e) => handleInputChange('plies', e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="markerLength">Marker Length (m)</Label>
          <Input
            id="markerLength"
            type="number"
            step="0.01"
            placeholder="12.50"
            value={formData.markerLength}
            onChange={(e) => handleInputChange('markerLength', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="layLength">Lay Length (m)</Label>
          <Input
            id="layLength"
            type="number"
            step="0.01"
            placeholder="12.55"
            value={formData.layLength}
            onChange={(e) => handleInputChange('layLength', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Cut Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
          />
        </div>
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

      {/* Fabric Usage Preview */}
      {fabricUsed > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-muted-foreground">Estimated Fabric Usage</p>
          <p className="text-2xl font-bold font-mono text-primary">{fabricUsed.toFixed(2)} meters</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">
          Create Cut Plan
        </Button>
      </div>
    </div>
  );
};
