import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";

const Auth = lazy(() => import("./pages/Auth"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Investments = lazy(() => import("./pages/Investments"));
const Insights = lazy(() => import("./pages/Insights"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Diversification = lazy(() => import("./pages/Diversification"));
const Decisions = lazy(() => import("./pages/Decisions"));
const DecisionDetail = lazy(() => import("./pages/DecisionDetail"));
const MonthlyReview = lazy(() => import("./pages/MonthlyReview"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
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
          <Suspense fallback={null}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Portfolio />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/investments"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Investments />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/insights"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Insights />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/diversification"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Diversification />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/decisions"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Decisions />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/decisions/:decisionId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DecisionDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/monthly-review"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <MonthlyReview />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Profile />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Settings />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
