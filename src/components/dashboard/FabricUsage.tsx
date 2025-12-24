import { useCuttingStore } from '@/store/cuttingStore';

export function FabricUsage() {
  const { orders, cutPlans } = useCuttingStore();
  
  const totalFabricUsed = cutPlans.reduce((sum, cp) => sum + cp.fabricUsed, 0);
  
  // Calculate estimated fabric requirement based on orders (estimate ~2.2m per piece)
  const totalOrderQty = orders.reduce((sum, o) => sum + o.totalQty, 0);
  const estimatedFabricRequired = totalOrderQty > 0 ? totalOrderQty * 2.19 : 0;
  
  const balance = estimatedFabricRequired - totalFabricUsed;
  const usagePercentage = estimatedFabricRequired > 0 ? (totalFabricUsed / estimatedFabricRequired) * 100 : 0;

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Shell Fabric Usage</h3>
        <p className="text-muted-foreground text-center py-8">No orders available</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Shell Fabric Usage</h3>
      
      <div className="space-y-4">
        {/* Visual usage bar */}
        <div className="relative h-8 rounded-lg bg-muted overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 gradient-primary transition-all duration-500"
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-foreground">
              {usagePercentage.toFixed(1)}% Used
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground mb-1">Estimated Required</p>
            <p className="text-xl font-bold font-mono text-foreground">
              {estimatedFabricRequired.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-muted-foreground">mtrs</span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground mb-1">Used</p>
            <p className="text-xl font-bold font-mono text-primary">
              {totalFabricUsed.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-normal text-muted-foreground">mtrs</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
          <span className="text-sm text-muted-foreground">Balance Remaining</span>
          <span className={`text-lg font-bold font-mono ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
            {balance.toFixed(2)} mtrs
          </span>
        </div>
      </div>
    </div>
  );
}
