import { useRequirementStore } from '@/store/requirementStore';
import { useRequestStore } from '@/store/requestStore';
import { useCuttingStore } from '@/store/cuttingStore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package, AlertCircle } from 'lucide-react';

export function MaterialDeliveryTable() {
  const { requirements } = useRequirementStore();
  const { submittedRequests } = useRequestStore();
  const { orders } = useCuttingStore();

  // Group requirements by order
  const orderSummary = orders.map(order => {
    const orderReqs = requirements.filter(r => r.orderId === order.id);
    const orderRequests = submittedRequests.filter(r => r.form.department);
    
    const totalRequired = orderReqs.reduce((sum, r) => sum + r.requiredQty, 0);
    const totalRequested = orderReqs.reduce((sum, r) => sum + r.requestedQty, 0);
    const totalPending = orderReqs.reduce((sum, r) => sum + r.pendingQty, 0);
    
    const progress = totalRequired > 0 ? ((totalRequested / totalRequired) * 100) : 0;
    
    return {
      order,
      totalRequired,
      totalRequested,
      totalPending,
      progress,
      itemCount: orderReqs.length,
      requestCount: orderRequests.length,
    };
  }).filter(os => os.itemCount > 0);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Order-wise Material Status
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            {orderSummary.length} Orders
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {orderSummary.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No requirements added yet</p>
            <p className="text-xs">Add requirements in the Requirements section</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Required</TableHead>
                  <TableHead className="text-right">Requested</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="w-[150px]">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderSummary.map(({ order, totalRequired, totalRequested, totalPending, progress, itemCount }) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium font-mono">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.customer}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{itemCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {totalRequired.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-success">
                      {totalRequested.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {totalPending > 0 ? (
                        <span className="text-warning">{totalPending.toLocaleString()}</span>
                      ) : (
                        <span className="text-success">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="flex-1 h-2" />
                        <span className="text-xs font-mono w-10 text-right">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
