import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

const Auth = lazy(() => import("./pages/Auth"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Investments = lazy(() => import("./pages/Investments"));
const Insights = lazy(() => import("./pages/Insights"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Import = lazy(() => import("./pages/Import"));
const Diversification = lazy(() => import("./pages/Diversification"));
const Decisions = lazy(() => import("./pages/Decisions"));
const DecisionDetail = lazy(() => import("./pages/DecisionDetail"));
const MonthlyReview = lazy(() => import("./pages/MonthlyReview"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedPage><Portfolio /></ProtectedPage>} />
              <Route path="/investments" element={<ProtectedPage><Investments /></ProtectedPage>} />
              <Route path="/insights" element={<ProtectedPage><Insights /></ProtectedPage>} />
              <Route path="/import" element={<ProtectedPage><Import /></ProtectedPage>} />
              <Route path="/diversification" element={<ProtectedPage><Diversification /></ProtectedPage>} />
              <Route path="/decisions" element={<ProtectedPage><Decisions /></ProtectedPage>} />
              <Route path="/decisions/:decisionId" element={<ProtectedPage><DecisionDetail /></ProtectedPage>} />
              <Route path="/monthly-review" element={<ProtectedPage><MonthlyReview /></ProtectedPage>} />
              <Route path="/profile" element={<ProtectedPage><Profile /></ProtectedPage>} />
              <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
