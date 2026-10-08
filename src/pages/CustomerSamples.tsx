import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerOrdersTab } from '@/components/customer-samples/CustomerOrdersTab';
import { SamplesTab } from '@/components/customer-samples/SamplesTab';
import { CustomersTab } from '@/components/customer-samples/CustomersTab';

const CustomerSamples = () => (
  <MainLayout>
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl">Customer & Samples</h1>
        <p className="text-sm text-muted-foreground">Customer orders with stage tracking, sample store with gate passes, and customer index.</p>
      </div>
      <Tabs defaultValue="orders">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="orders">Customer Orders</TabsTrigger>
          <TabsTrigger value="samples">Sample Room & Gate Pass</TabsTrigger>
          <TabsTrigger value="customers">Customer Index</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><CustomerOrdersTab /></TabsContent>
        <TabsContent value="samples"><SamplesTab /></TabsContent>
        <TabsContent value="customers"><CustomersTab /></TabsContent>
      </Tabs>
    </div>
  </MainLayout>
);

export default CustomerSamples;
