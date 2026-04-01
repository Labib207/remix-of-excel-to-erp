import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ClipboardList, 
  Package, 
  FileBox,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocalOrders } from '@/hooks/useLocalOrders';
import { useLocalRequirements } from '@/hooks/useLocalRequirements';
import { MaterialDeliveryTable } from '@/components/dashboard/MaterialDeliveryTable';
import { RequestHistorySummary } from '@/components/dashboard/RequestHistorySummary';

const Dashboard = () => {
  const { data: orders = [] } = useLocalOrders();
  const { data: requirements = [] } = useLocalRequirements();
  
  // Calculate summary stats
  const totalOrders = orders.length;
  const totalRequirements = requirements.length;
  const totalPending = requirements.reduce((sum, r) => sum + r.pendingQty, 0);
  const totalRequested = requirements.reduce((sum, r) => sum + r.requestedQty, 0);
  const totalRequired = requirements.reduce((sum, r) => sum + r.requiredQty, 0);
  
  // Calculate completion percentage
  const completionPercent = totalRequired > 0 ? ((totalRequested / totalRequired) * 100) : 0;
  
  // Orders with pending requirements
  const ordersWithPending = orders.filter(order => 
    requirements.some(r => r.orderId === order.id && r.pendingQty > 0)
  ).length;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Raw Material Requirements & Request Tracking
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Orders</p>
                  <p className="text-2xl font-bold font-mono text-foreground">{totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-secondary/20 bg-secondary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                  <Package className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Material Items</p>
                  <p className="text-2xl font-bold font-mono text-foreground">{totalRequirements}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-success/20 bg-success/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <FileBox className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivery Notes</p>
                  <p className="text-2xl font-bold font-mono text-foreground">—</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-warning/20 bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Orders with Pending</p>
                  <p className="text-2xl font-bold font-mono text-foreground">{ordersWithPending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Summary */}
        <Card className="shadow-card bg-gradient-to-r from-primary/5 via-transparent to-success/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-lg font-semibold text-foreground">Overall Completion</p>
                  <p className="text-sm text-muted-foreground">
                    {totalRequested.toLocaleString()} of {totalRequired.toLocaleString()} units requested
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold font-mono text-primary">{completionPercent.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold font-mono text-warning">{totalPending.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Pending Units</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-2" />

        {/* Order-wise Material Status */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Order-wise Raw Material Status</h2>
            <Separator className="flex-1" />
            <Link to="/requirements">
              <Button variant="outline" size="sm">
                <ClipboardList className="h-4 w-4 mr-2" />
                Manage Requirements
              </Button>
            </Link>
          </div>
          <MaterialDeliveryTable />
        </div>

        <Separator className="my-2" />

        {/* Recent Requests & Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Recent Delivery Notes</h2>
              <Separator className="flex-1" />
            </div>
            <RequestHistorySummary />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
              <Separator className="flex-1" />
            </div>
            <div className="grid gap-4">
              <Link to="/requirements">
                <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-medium">Add Requirements</span>
                          <p className="text-xs text-muted-foreground">Define order-wise material needs</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/requests">
                <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                          <FileBox className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-medium">New Request</span>
                          <p className="text-xs text-muted-foreground">Submit raw material or general supplies request</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
