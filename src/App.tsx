import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DataSyncProvider } from "@/components/DataSyncProvider";
import Dashboard from "./pages/Dashboard";
import DeliveryNotes from "./pages/DeliveryNotes";
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
              <Route path="/requirements" element={<ProtectedRoute><Requirements /></ProtectedRoute>} />
              <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
              <Route path="/delivery-notes" element={<ProtectedRoute><DeliveryNotes /></ProtectedRoute>} />
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
