import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { CuttingProgress } from '@/components/dashboard/CuttingProgress';
import { FabricUsage } from '@/components/dashboard/FabricUsage';
import { SizeBreakdown } from '@/components/dashboard/SizeBreakdown';
import { useCuttingStore } from '@/store/cuttingStore';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  Scissors, 
  Package, 
  Ruler, 
  ArrowRight,
  Calculator,
  Layers,
  Tag,
  FileText,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Conversion factor: meters to yards
const METERS_TO_YARDS = 1.0936133;

const Dashboard = () => {
  const { orders, cutPlans, bundles, ratios, markerPlans, laySheets, fabricCalculations } = useCuttingStore();
  
  const totalOrders = orders.length;
  const totalCuts = cutPlans.length;
  const totalFabricUsed = cutPlans.reduce((sum, cp) => sum + cp.fabricUsed, 0);
  const totalQtyCut = cutPlans.reduce((sum, cp) => sum + cp.totalQty, 0);
  const totalBundles = bundles.length;
  const activeRatios = ratios.filter(r => r.isActive).length;

  // Calculate fabric summary by type
  const topFabricUsed = fabricCalculations
    .filter(fc => fc.fabricType === 'TOP')
    .reduce((sum, fc) => sum + fc.usedMeters, 0);
  const fusingFabricUsed = fabricCalculations
    .filter(fc => fc.fabricType === 'FUSING')
    .reduce((sum, fc) => sum + fc.usedMeters, 0);
  const tabFabricUsed = fabricCalculations
    .filter(fc => fc.fabricType === 'TAB')
    .reduce((sum, fc) => sum + fc.usedMeters, 0);

  // Calculate with 1% allowance
  const topWithAllowance = totalFabricUsed * 1.01;
  const topInYards = totalFabricUsed * METERS_TO_YARDS;

  // Workflow steps with counts
  const workflowSteps = [
    { label: 'Orders', count: totalOrders, icon: ClipboardList, path: '/orders', color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Ratios', count: ratios.length, icon: Calculator, path: '/ratios', color: 'bg-purple-500/10 text-purple-600' },
    { label: 'Markers', count: markerPlans.length, icon: Ruler, path: '/markers', color: 'bg-orange-500/10 text-orange-600' },
    { label: 'Cut Plans', count: totalCuts, icon: Scissors, path: '/cutting', color: 'bg-green-500/10 text-green-600' },
    { label: 'Lay Sheets', count: laySheets.length, icon: Layers, path: '/laysheets', color: 'bg-teal-500/10 text-teal-600' },
    { label: 'Bundles', count: totalBundles, icon: Tag, path: '/bundles', color: 'bg-pink-500/10 text-pink-600' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Cutting & Fabric Planning System Overview
          </p>
        </div>

        {/* Workflow Progress Indicator */}
        <Card className="shadow-card bg-gradient-to-r from-primary/5 via-transparent to-success/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {workflowSteps.map((step, index) => (
                <div key={step.label} className="flex items-center gap-2">
                  <Link 
                    to={step.path}
                    className="flex flex-col items-center gap-1.5 min-w-[80px] p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${step.color} group-hover:scale-110 transition-transform`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                      {step.label}
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {step.count}
                    </Badge>
                  </Link>
                  {index < workflowSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section: Statistics Overview */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Statistics Overview</h2>
            <Separator className="flex-1" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Orders"
              value={totalOrders}
              subtitle="In production"
              icon={<ClipboardList className="h-6 w-6" />}
              variant="primary"
            />
            <StatCard
              title="Cut Plans"
              value={totalCuts}
              subtitle="This month"
              icon={<Scissors className="h-6 w-6" />}
              variant="default"
            />
            <StatCard
              title="Pieces Cut"
              value={totalQtyCut.toLocaleString()}
              subtitle="Total quantity"
              icon={<Package className="h-6 w-6" />}
              variant="success"
            />
            <StatCard
              title="Bundle Tags"
              value={totalBundles.toLocaleString()}
              subtitle="Generated"
              icon={<Tag className="h-6 w-6" />}
              variant="warning"
            />
          </div>
        </div>

        <Separator className="my-2" />

        {/* Section: Fabric Request Summary */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Fabric Request Summary</h2>
            <Separator className="flex-1" />
            <Link to="/fabric">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-card border-blue-500/20 bg-blue-500/5">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">TOP (Shell)</p>
                  <p className="text-2xl font-bold font-mono text-blue-600">
                    {totalFabricUsed.toFixed(2)} m
                  </p>
                  <p className="text-sm text-muted-foreground">
                    = {topInYards.toFixed(2)} yards
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-green-500/20 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">With 1% Allowance</p>
                  <p className="text-2xl font-bold font-mono text-green-600">
                    {topWithAllowance.toFixed(2)} m
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Request amount
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-purple-500/20 bg-purple-500/5">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">FUSING Used</p>
                  <p className="text-2xl font-bold font-mono text-purple-600">
                    {fusingFabricUsed.toFixed(2)} m
                  </p>
                  <p className="text-sm text-muted-foreground">
                    = {(fusingFabricUsed * METERS_TO_YARDS).toFixed(2)} yards
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card border-orange-500/20 bg-orange-500/5">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">TAB Used</p>
                  <p className="text-2xl font-bold font-mono text-orange-600">
                    {tabFabricUsed.toFixed(2)} m
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Extras/Tabbing
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Section: Orders & Progress */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Orders & Progress</h2>
            <Separator className="flex-1" />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - 2 cols */}
            <div className="lg:col-span-2 space-y-6">
              <OrdersTable />
            </div>

            {/* Right Column - 1 col */}
            <div className="space-y-6">
              <CuttingProgress />
              <Separator />
              <FabricUsage />
            </div>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Section: Size Breakdown & Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Details & Recent Activity</h2>
            <Separator className="flex-1" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
          <SizeBreakdown />
          
          {/* Recent Cut Plans */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Cut Plans</h3>
            <div className="space-y-3">
              {cutPlans.slice(0, 5).map((cp) => {
                const order = orders.find(o => o.id === cp.orderId);
                return (
                  <div 
                    key={cp.id} 
                    className="flex items-center justify-between rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
                        #{cp.cutNo}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {order?.orderNumber || 'Unknown'} - {cp.totalQty} pcs
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cp.plies} plies × {cp.markerLength}m marker
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium text-foreground">
                        {cp.fabricUsed.toFixed(2)}m
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Shade {cp.shade}
                      </p>
                    </div>
                  </div>
                );
              })}
              {cutPlans.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No cut plans yet. Create a marker plan first.
                </div>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            <Separator className="flex-1" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/orders">
              <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <span className="font-medium">New Order</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/ratios">
              <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                        <Calculator className="h-5 w-5" />
                      </div>
                      <span className="font-medium">Ratio Planning</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/fabric">
              <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                        <Ruler className="h-5 w-5" />
                      </div>
                      <span className="font-medium">Fabric Calc</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/bundles">
              <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600">
                        <Tag className="h-5 w-5" />
                      </div>
                      <span className="font-medium">Bundle Tags</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
