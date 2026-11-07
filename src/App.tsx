import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DataSyncProvider } from "@/components/DataSyncProvider";
import Dashboard from "./pages/Dashboard";
const DeliveryNotes = lazy(() => import("./pages/DeliveryNotes"));
const Requests = lazy(() => import("./pages/Requests"));
const Requirements = lazy(() => import("./pages/Requirements"));
const ItemList = lazy(() => import("./pages/ItemList"));
const Stationery = lazy(() => import("./pages/Stationery"));
const CustomerSamples = lazy(() => import("./pages/CustomerSamples"));
import Auth from "./pages/Auth";
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(() => import("./pages/Profile"));
const Reports = lazy(() => import("./pages/Reports"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const NotFound = lazy(() => import("./pages/NotFound"));


// Tuned for solo user with growing data: cache aggressively, avoid refetch storms
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,          // 5 min — treat data fresh, skip refetch
      gcTime: 30 * 60 * 1000,            // 30 min — keep in memory when tabbing around
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 2,                          // retry failed fetches twice before showing an error
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000), // 2s, 4s backoff
      placeholderData: (prev: unknown) => prev, // keep showing previous data while refetching (no flicker)
    },
    mutations: {
      retry: 1,                          // one automatic retry for failed saves on shaky networks
      retryDelay: 1500,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DataSyncProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />

              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/items" element={<ProtectedRoute><ItemList /></ProtectedRoute>} />
              <Route path="/stationery" element={<ProtectedRoute><Stationery /></ProtectedRoute>} />
              <Route path="/customer-samples" element={<ProtectedRoute><CustomerSamples /></ProtectedRoute>} />
              <Route path="/requirements" element={<ProtectedRoute><Requirements /></ProtectedRoute>} />
              <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
              <Route path="/delivery-notes" element={<ProtectedRoute><DeliveryNotes /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </DataSyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
