import { useCuttingStore } from '@/store/cuttingStore';
import { SIZES } from '@/types/cutting';

export function SizeBreakdown() {
  const { orders, cutPlans } = useCuttingStore();
  
  const order = orders[0];
  if (!order) return null;

  // Calculate cut quantities per size
  const cutBySize: Record<string, number> = {};
  cutPlans
    .filter(cp => cp.orderId === order.id)
    .forEach(cp => {
      Object.entries(cp.sizes).forEach(([size, qty]) => {
        cutBySize[size] = (cutBySize[size] || 0) + qty;
      });
    });

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Size Breakdown</h3>
      
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
        {SIZES.map((size) => {
          const ordered = order.sizeQuantities[size.code] || 0;
          const cut = cutBySize[size.code] || 0;
          const percentage = ordered > 0 ? (cut / ordered) * 100 : 0;
          const remaining = ordered - cut;
          
          if (ordered === 0) return null;
          
          return (
            <div key={size.code} className="group">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-mono font-medium text-foreground">{size.code}</span>
                <span className="text-xs text-muted-foreground">
                  {cut}/{ordered} 
                  <span className={remaining > 0 ? 'text-warning ml-2' : 'text-success ml-2'}>
                    ({remaining > 0 ? `-${remaining}` : '✓'})
                  </span>
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300 group-hover:bg-accent"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
