import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { CuttingProgress } from '@/components/dashboard/CuttingProgress';
import { FabricUsage } from '@/components/dashboard/FabricUsage';
import { SizeBreakdown } from '@/components/dashboard/SizeBreakdown';
import { useCuttingStore } from '@/store/cuttingStore';
import { ClipboardList, Scissors, Package, Ruler } from 'lucide-react';

const Dashboard = () => {
  const { orders, cutPlans } = useCuttingStore();
  
  const totalOrders = orders.length;
  const totalCuts = cutPlans.length;
  const totalFabricUsed = cutPlans.reduce((sum, cp) => sum + cp.fabricUsed, 0);
  const totalQtyCut = cutPlans.reduce((sum, cp) => sum + cp.totalQty, 0);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Garment cutting operations overview
          </p>
        </div>

        {/* Stats Grid */}
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
            value={totalQtyCut}
            subtitle="Total quantity"
            icon={<Package className="h-6 w-6" />}
            variant="success"
          />
          <StatCard
            title="Fabric Used"
            value={`${totalFabricUsed.toFixed(0)} m`}
            subtitle="Shell fabric"
            icon={<Ruler className="h-6 w-6" />}
            variant="warning"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            <OrdersTable />
          </div>

          {/* Right Column - 1 col */}
          <div className="space-y-6">
            <CuttingProgress />
            <FabricUsage />
          </div>
        </div>

        {/* Size Breakdown */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SizeBreakdown />
          
          {/* Recent Activity */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Cut Plans</h3>
            <div className="space-y-3">
              {cutPlans.slice(0, 5).map((cp) => (
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
                        Cut No. {cp.cutNo} - {cp.totalQty} pcs
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
