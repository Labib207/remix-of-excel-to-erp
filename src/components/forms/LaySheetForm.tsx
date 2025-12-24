import { useState } from 'react';
import { LaySheet, CutPlan } from '@/types/cutting';
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

interface LaySheetFormProps {
  laySheet?: LaySheet | null;
  cutPlans: CutPlan[];
  existingLaySheets: LaySheet[];
  onSubmit: (laySheet: LaySheet) => void;
  onCancel: () => void;
}

export const LaySheetForm = ({ laySheet, cutPlans, existingLaySheets, onSubmit, onCancel }: LaySheetFormProps) => {
  const { toast } = useToast();
  const isEditing = !!laySheet;

  const [formData, setFormData] = useState({
    cutPlanId: laySheet?.cutPlanId || '',
    layNo: laySheet?.layNo?.toString() || (Math.max(...existingLaySheets.map(ls => ls.layNo), 0) + 1).toString(),
    plies: laySheet?.plies?.toString() || '',
    layLength: laySheet?.layLength?.toString() || '',
    fabricRoll: laySheet?.fabricRoll || '',
    operator: laySheet?.operator || '',
    startTime: laySheet?.startTime || '',
    endTime: laySheet?.endTime || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.cutPlanId) {
      toast({ title: 'Error', description: 'Please select a cut plan', variant: 'destructive' });
      return;
    }
    if (!formData.layNo || parseInt(formData.layNo) <= 0) {
      toast({ title: 'Error', description: 'Lay number is required', variant: 'destructive' });
      return;
    }
    if (!formData.plies || parseInt(formData.plies) <= 0) {
      toast({ title: 'Error', description: 'Number of plies is required', variant: 'destructive' });
      return;
    }
    if (!formData.layLength || parseFloat(formData.layLength) <= 0) {
      toast({ title: 'Error', description: 'Lay length is required', variant: 'destructive' });
      return;
    }

    const newLaySheet: LaySheet = {
      id: laySheet?.id || `ls-${Date.now()}`,
      cutPlanId: formData.cutPlanId,
      layNo: parseInt(formData.layNo),
      plies: parseInt(formData.plies),
      layLength: parseFloat(formData.layLength),
      fabricRoll: formData.fabricRoll,
      operator: formData.operator || undefined,
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined,
    };

    onSubmit(newLaySheet);
  };

  const selectedCutPlan = cutPlans.find(cp => cp.id === formData.cutPlanId);

  return (
    <div className="space-y-6">
      {/* Cut Plan Selection */}
      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="cutPlan">Select Cut Plan *</Label>
          <Select value={formData.cutPlanId} onValueChange={(value) => {
            handleInputChange('cutPlanId', value);
            const cutPlan = cutPlans.find(cp => cp.id === value);
            if (cutPlan) {
              handleInputChange('plies', cutPlan.plies.toString());
              handleInputChange('layLength', cutPlan.layLength.toString());
            }
          }}>
            <SelectTrigger id="cutPlan">
              <SelectValue placeholder="Select a cut plan" />
            </SelectTrigger>
            <SelectContent>
              {cutPlans.map(cp => (
                <SelectItem key={cp.id} value={cp.id}>
                  Cut #{cp.cutNo} - {cp.totalQty} pcs ({cp.shade})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedCutPlan && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <p><span className="text-muted-foreground">Cut No:</span> #{selectedCutPlan.cutNo}</p>
          <p><span className="text-muted-foreground">Plies:</span> {selectedCutPlan.plies}</p>
          <p><span className="text-muted-foreground">Total Qty:</span> {selectedCutPlan.totalQty.toLocaleString()} pcs</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="layNo">Lay No *</Label>
          <Input
            id="layNo"
            type="number"
            min="1"
            value={formData.layNo}
            onChange={(e) => handleInputChange('layNo', e.target.value)}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="layLength">Lay Length (m) *</Label>
          <Input
            id="layLength"
            type="number"
            step="0.01"
            placeholder="12.50"
            value={formData.layLength}
            onChange={(e) => handleInputChange('layLength', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fabricRoll">Fabric Roll</Label>
          <Input
            id="fabricRoll"
            placeholder="ROLL-001"
            value={formData.fabricRoll}
            onChange={(e) => handleInputChange('fabricRoll', e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="operator">Operator</Label>
          <Input
            id="operator"
            placeholder="Operator name"
            value={formData.operator}
            onChange={(e) => handleInputChange('operator', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => handleInputChange('startTime', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => handleInputChange('endTime', e.target.value)}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">
          {isEditing ? 'Update Lay Sheet' : 'Create Lay Sheet'}
        </Button>
      </div>
    </div>
  );
};
