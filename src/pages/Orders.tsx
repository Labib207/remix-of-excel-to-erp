import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCuttingStore } from '@/store/cuttingStore';
import { SIZES, Order } from '@/types/cutting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

const Orders = () => {
  const { orders, addOrder, deleteOrder } = useCuttingStore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Orders</h1>
            <p className="text-muted-foreground">Manage production orders and size specifications</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Order creation form will be implemented with full size ratio planning.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Orders Grid */}
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="shadow-card transition-all hover:shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{order.orderNumber}</CardTitle>
                      <Badge variant="outline" className={statusStyles[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{order.customer}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        deleteOrder(order.id);
                        toast({ title: 'Order deleted' });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Style</p>
                    <p className="font-medium text-foreground">{order.styleNo}</p>
                    <p className="text-sm text-muted-foreground">{order.styleName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Quantity</p>
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {order.totalQty.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fabric Width</p>
                    <p className="font-medium text-foreground">{order.fabricWidth} cm</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Date</p>
                    <p className="font-medium text-foreground">
                      {new Date(order.deliveryDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Size Quantities Preview */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Size Distribution</p>
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map((size) => {
                      const qty = order.sizeQuantities[size.code];
                      if (!qty) return null;
                      return (
                        <div 
                          key={size.code}
                          className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1"
                        >
                          <span className="font-mono text-xs font-medium text-foreground">
                            {size.code}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {qty}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedOrder.orderNumber}
                  <Badge variant="outline" className={statusStyles[selectedOrder.status]}>
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedOrder.customer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Style</p>
                    <p className="font-medium">{selectedOrder.styleNo} - {selectedOrder.styleName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shade</p>
                    <p className="font-medium">{selectedOrder.shade}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fabric Width</p>
                    <p className="font-medium">{selectedOrder.fabricWidth} cm</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Size Quantities</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {SIZES.map((size) => (
                            <th key={size.code} className="px-3 py-2 text-center font-mono font-medium">
                              {size.code}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-center font-medium bg-muted">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {SIZES.map((size) => (
                            <td key={size.code} className="px-3 py-2 text-center font-mono">
                              {selectedOrder.sizeQuantities[size.code] || 0}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-mono font-bold bg-muted">
                            {selectedOrder.totalQty}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
};

export default Orders;
