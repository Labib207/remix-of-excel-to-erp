import { useCuttingStore } from '@/store/cuttingStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusStyles = {
  pending: 'bg-muted text-muted-foreground',
  'in-progress': 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-success/10 text-success border-success/20'
};

const statusLabels = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed'
};

export function OrdersTable() {
  const { orders } = useCuttingStore();

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">Active Orders</h3>
          <Link to="/orders">
            <Button variant="outline" size="sm">Add Order</Button>
          </Link>
        </div>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No orders yet. Add your first order to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-foreground">Active Orders ({orders.length})</h3>
        <Link to="/orders">
          <Button variant="outline" size="sm">View All</Button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Style</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-muted/30">
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="font-mono text-sm font-medium text-foreground">{order.orderNumber}</span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                  {order.customer}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.styleNo}</p>
                    <p className="text-xs text-muted-foreground">{order.styleName}</p>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {order.totalQty.toLocaleString()}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Badge variant="outline" className={statusStyles[order.status]}>
                    {statusLabels[order.status]}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link to="/orders">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/orders">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
