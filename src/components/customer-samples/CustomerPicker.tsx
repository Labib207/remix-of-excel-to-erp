import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCustomers, Customer } from '@/hooks/useCustomerSamples';

export function CustomerPicker({ value, onPick }: { value: string | null; onPick: (c: Customer | null) => void }) {
  const { data: customers = [] } = useCustomers();
  return (
    <div>
      <Label>Pick from Customer Index</Label>
      <Select value={value ?? 'none'} onValueChange={v => onPick(customers.find(c => c.id === v) ?? null)}>
        <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— Enter manually —</SelectItem>
          {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.mobile ? ` (${c.mobile})` : ''}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
