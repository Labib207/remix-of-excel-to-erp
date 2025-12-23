import { useCuttingStore } from '@/store/cuttingStore';
import { Progress } from '@/components/ui/progress';

export function CuttingProgress() {
  const { orders, cutPlans } = useCuttingStore();
  
  const order = orders[0];
  if (!order) return null;

  const cutQty = cutPlans
    .filter(cp => cp.orderId === order.id)
    .reduce((sum, cp) => sum + cp.totalQty, 0);
  
  const progress = (cutQty / order.totalQty) * 100;
  const remaining = order.totalQty - cutQty;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Cutting Progress</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Order: {order.orderNumber}</span>
          <span className="font-mono font-medium text-foreground">{progress.toFixed(1)}%</span>
        </div>
        
        <Progress value={progress} className="h-3" />
        
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{order.totalQty.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Order</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{cutQty.toLocaleString()}</p>
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
