import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DataSyncProvider } from "@/components/DataSyncProvider";
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
import Requirements from "./pages/Requirements";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DataSyncProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/ratios" element={<ProtectedRoute><RatioPlanning /></ProtectedRoute>} />
              <Route path="/markers" element={<ProtectedRoute><MarkerPlans /></ProtectedRoute>} />
              <Route path="/cutting" element={<ProtectedRoute><CuttingPlans /></ProtectedRoute>} />
              <Route path="/laysheets" element={<ProtectedRoute><LaySheets /></ProtectedRoute>} />
              <Route path="/bundles" element={<ProtectedRoute><Bundles /></ProtectedRoute>} />
              <Route path="/fabric" element={<ProtectedRoute><FabricCalculation /></ProtectedRoute>} />
              <Route path="/requirements" element={<ProtectedRoute><Requirements /></ProtectedRoute>} />
              <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
              <Route path="/delivery-notes" element={<ProtectedRoute><DeliveryNotes /></ProtectedRoute>} />
              <Route path="/reconciliation" element={<ProtectedRoute><Reconciliation /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DataSyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;