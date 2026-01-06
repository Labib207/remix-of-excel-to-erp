import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import MarkerPlans from "./pages/MarkerPlans";
import CuttingPlans from "./pages/CuttingPlans";
import Bundles from "./pages/Bundles";
import LaySheets from "./pages/LaySheets";
import DeliveryNotes from "./pages/DeliveryNotes";
import Reports from "./pages/Reports";
import Reconciliation from "./pages/Reconciliation";
import RatioPlanning from "./pages/RatioPlanning";
import FabricCalculation from "./pages/FabricCalculation";
import Requests from "./pages/Requests";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/ratios" element={<RatioPlanning />} />
          <Route path="/markers" element={<MarkerPlans />} />
          <Route path="/cutting" element={<CuttingPlans />} />
          <Route path="/laysheets" element={<LaySheets />} />
          <Route path="/bundles" element={<Bundles />} />
          <Route path="/fabric" element={<FabricCalculation />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/delivery-notes" element={<DeliveryNotes />} />
          <Route path="/reconciliation" element={<Reconciliation />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
