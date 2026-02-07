import { MainLayout } from '@/components/layout/MainLayout';
import { RequirementsTab } from '@/components/requests/RequirementsTab';

const Requirements = () => {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Requirements</h1>
          <p className="text-muted-foreground">
            Manage order-wise raw material requirements
          </p>
        </div>

        <RequirementsTab />
      </div>
    </MainLayout>
  );
};

export default Requirements;
