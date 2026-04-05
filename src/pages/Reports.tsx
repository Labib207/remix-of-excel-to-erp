import { MainLayout } from '@/components/layout/MainLayout';
import { MonthlyReport } from '@/components/dashboard/MonthlyReport';
import { CustomItemReport } from '@/components/reports/CustomItemReport';

const Reports = () => {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate monthly reports and search item history</p>
        </div>

        <MonthlyReport />
        <CustomItemReport />
      </div>
    </MainLayout>
  );
};

export default Reports;
