import { MainLayout } from '@/components/layout/MainLayout';
import { useCuttingStore } from '@/store/cuttingStore';
import { SIZES } from '@/types/cutting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Printer } from 'lucide-react';

const Reports = () => {
  const { orders, cutPlans } = useCuttingStore();
  const order = orders[0];

  if (!order) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No orders found</p>
        </div>
      </MainLayout>
    );
  }

  // Calculate fabric consumption
  const totalFabricUsed = cutPlans.reduce((sum, cp) => sum + cp.fabricUsed, 0);
  const requestedFabric = 6566.96;
  const wastage = requestedFabric * 0.01;

  // Calculate size-wise cutting summary
  const cutBySize: Record<string, number> = {};
  cutPlans.forEach(cp => {
    Object.entries(cp.sizes).forEach(([size, qty]) => {
      cutBySize[size] = (cutBySize[size] || 0) + qty;
    });
  });

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
            <p className="text-muted-foreground">Production and consumption reports</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button className="gradient-primary text-primary-foreground">
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Order Summary Report */}
        <Card className="shadow-card">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Order Summary Report
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                Generated: {new Date().toLocaleDateString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Company Header */}
            <div className="text-center border-b border-border pb-4 mb-6">
              <h2 className="text-xl font-bold text-foreground">ADEEM UNIFORM TRADING EST</h2>
              <p className="text-muted-foreground">{order.customer}</p>
            </div>

            {/* Order Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Order Number</p>
                <p className="font-mono font-bold">{order.orderNumber}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Style</p>
                <p className="font-medium">{order.styleNo}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Total Quantity</p>
                <p className="font-mono font-bold text-primary">{order.totalQty.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Fabric Width</p>
                <p className="font-medium">{order.fabricWidth} cm</p>
              </div>
            </div>

            {/* Size-wise Breakdown */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Size-wise Cutting Summary</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-2 py-2 text-left text-xs font-medium">Size</th>
                      {SIZES.map((size) => (
                        <th key={size.code} className="px-2 py-2 text-center font-mono text-xs font-medium">
                          {size.code}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center font-medium text-xs bg-primary/10">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="px-2 py-2 text-xs font-medium text-muted-foreground">Order Qty</td>
                      {SIZES.map((size) => (
                        <td key={size.code} className="px-2 py-2 text-center font-mono text-sm">
                          {order.sizeQuantities[size.code] || 0}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-mono font-bold bg-primary/10">
                        {order.totalQty}
                      </td>
                    </tr>
                    <tr className="border-t border-border bg-success/5">
                      <td className="px-2 py-2 text-xs font-medium text-muted-foreground">Cut Qty</td>
                      {SIZES.map((size) => (
                        <td key={size.code} className="px-2 py-2 text-center font-mono text-sm text-success">
                          {cutBySize[size.code] || 0}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-mono font-bold bg-success/10 text-success">
                        {Object.values(cutBySize).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                    <tr className="border-t border-border bg-warning/5">
                      <td className="px-2 py-2 text-xs font-medium text-muted-foreground">Balance</td>
                      {SIZES.map((size) => {
                        const ordered = order.sizeQuantities[size.code] || 0;
                        const cut = cutBySize[size.code] || 0;
                        const balance = ordered - cut;
                        return (
                          <td key={size.code} className="px-2 py-2 text-center font-mono text-sm text-warning">
                            {balance}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-mono font-bold bg-warning/10 text-warning">
                        {order.totalQty - Object.values(cutBySize).reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fabric Consumption */}
            <div>
              <h4 className="font-semibold mb-3">Shell Fabric Consumption</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Net Requirement</p>
                  <p className="text-xl font-bold font-mono">{(requestedFabric - wastage).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">meters</p>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Wastage (1%)</p>
                  <p className="text-xl font-bold font-mono text-warning">{wastage.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">meters</p>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Required</p>
                  <p className="text-xl font-bold font-mono">{requestedFabric.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">meters</p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Used</p>
                  <p className="text-xl font-bold font-mono text-primary">{totalFabricUsed.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">meters</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Average Consumption per Piece</span>
                  <span className="font-mono font-bold text-lg">
                    {(totalFabricUsed / Object.values(cutBySize).reduce((a, b) => a + b, 1)).toFixed(3)} m/pc
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cut Plan Summary */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Cut Plan Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-medium">Cut #</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">Plies</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">Marker (m)</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">Lay (m)</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">Fabric (m)</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">Unit (m/pc)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cutPlans.map((cp) => (
                    <tr key={cp.id}>
                      <td className="px-3 py-2 font-mono">{cp.cutNo}</td>
                      <td className="px-3 py-2 text-right font-mono">{cp.plies}</td>
                      <td className="px-3 py-2 text-right font-mono">{cp.markerLength}</td>
                      <td className="px-3 py-2 text-right font-mono">{cp.layLength}</td>
                      <td className="px-3 py-2 text-right font-mono font-medium">{cp.totalQty}</td>
                      <td className="px-3 py-2 text-right font-mono text-primary">{cp.fabricUsed.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono">{(cp.fabricUsed / cp.totalQty).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30 font-bold">
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2 text-right font-mono">-</td>
                    <td className="px-3 py-2 text-right font-mono">-</td>
                    <td className="px-3 py-2 text-right font-mono">-</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {cutPlans.reduce((sum, cp) => sum + cp.totalQty, 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-primary">
                      {totalFabricUsed.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Reports;
