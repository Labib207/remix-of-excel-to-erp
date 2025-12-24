import { useCuttingStore } from '@/store/cuttingStore';
import { Progress } from '@/components/ui/progress';

export function CuttingProgress() {
  const { orders, cutPlans } = useCuttingStore();
  
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Cutting Progress</h3>
        <p className="text-muted-foreground text-center py-8">No orders available</p>
      </div>
    );
  }

  // Calculate totals across ALL orders
  const totalOrderQty = orders.reduce((sum, o) => sum + o.totalQty, 0);
  const totalCutQty = cutPlans.reduce((sum, cp) => sum + cp.totalQty, 0);
  const progress = totalOrderQty > 0 ? (totalCutQty / totalOrderQty) * 100 : 0;
  const remaining = totalOrderQty - totalCutQty;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Cutting Progress</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">All Orders ({orders.length})</span>
          <span className="font-mono font-medium text-foreground">{progress.toFixed(1)}%</span>
        </div>
        
        <Progress value={progress} className="h-3" />
        
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{totalOrderQty.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Order</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{totalCutQty.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Cut Complete</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-warning">{remaining.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
}
