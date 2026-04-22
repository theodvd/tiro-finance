import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

// ─── Pages partagées (inchangées) ──────────────────────────────────────────
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

// ─── Pages transversales (pas sous /pro ni /perso) ─────────────────────────
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Import = lazy(() => import("./pages/Import"));
const Decisions = lazy(() => import("./pages/Decisions"));
const DecisionDetail = lazy(() => import("./pages/DecisionDetail"));
const MonthlyReview = lazy(() => import("./pages/MonthlyReview"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));

// ─── Pages section /perso ──────────────────────────────────────────────────
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Investments = lazy(() => import("./pages/Investments"));
const Insights = lazy(() => import("./pages/Insights"));
const Diversification = lazy(() => import("./pages/Diversification"));

// ─── Pages section /unified ────────────────────────────────────────────────
const Projection = lazy(() => import("./pages/unified/Projection"));

// ─── Pages section /pro ────────────────────────────────────────────────────
const Invoices = lazy(() => import("./pages/pro/Invoices"));
const Charges = lazy(() => import("./pages/pro/Charges"));
const Tax = lazy(() => import("./pages/pro/Tax"));

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
              {/* ── Auth ──────────────────────────────────────────────────── */}
              <Route path="/auth" element={<Auth />} />

              {/* ── Dashboard unifié ──────────────────────────────────────── */}
              <Route
                path="/dashboard"
                element={<ProtectedPage><Dashboard /></ProtectedPage>}
              />

              {/* ── Section /perso ────────────────────────────────────────── */}
              {/* /perso/patrimoine : URL canonique (fusion Portfolio + Investments en étape 2) */}
              <Route
                path="/perso/patrimoine"
                element={<ProtectedPage><Portfolio /></ProtectedPage>}
              />
              {/* /perso/portfolio conservé temporairement — redirigé en étape 5 */}
              <Route
                path="/perso/portfolio"
                element={<ProtectedPage><Portfolio /></ProtectedPage>}
              />
              <Route
                path="/perso/investments"
                element={<ProtectedPage><Investments /></ProtectedPage>}
              />
              <Route
                path="/perso/insights"
                element={<ProtectedPage><Insights /></ProtectedPage>}
              />
              <Route
                path="/perso/diversification"
                element={<ProtectedPage><Diversification /></ProtectedPage>}
              />

              {/* ── Section /unified ─────────────────────────────────────── */}
              <Route
                path="/unified/projection"
                element={<ProtectedPage><Projection /></ProtectedPage>}
              />

              {/* ── Section /pro ──────────────────────────────────────────── */}
              <Route
                path="/pro/invoices"
                element={<ProtectedPage><Invoices /></ProtectedPage>}
              />
              <Route
                path="/pro/charges"
                element={<ProtectedPage><Charges /></ProtectedPage>}
              />
              <Route
                path="/pro/tax"
                element={<ProtectedPage><Tax /></ProtectedPage>}
              />

              {/* ── Transversal (non préfixés) ────────────────────────────── */}
              <Route
                path="/import"
                element={<ProtectedPage><Import /></ProtectedPage>}
              />
              <Route
                path="/decisions"
                element={<ProtectedPage><Decisions /></ProtectedPage>}
              />
              <Route
                path="/decisions/:decisionId"
                element={<ProtectedPage><DecisionDetail /></ProtectedPage>}
              />
              <Route
                path="/monthly-review"
                element={<ProtectedPage><MonthlyReview /></ProtectedPage>}
              />
              <Route
                path="/profile"
                element={<ProtectedPage><Profile /></ProtectedPage>}
              />
              <Route
                path="/settings"
                element={<ProtectedPage><Settings /></ProtectedPage>}
              />

              {/* ── Redirects depuis les anciennes URLs ───────────────────── */}
              {/* / → /dashboard (nouvelle page d'accueil) */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              {/* Redirects vers la nouvelle URL canonique /perso/patrimoine */}
              <Route path="/investments" element={<Navigate to="/perso/patrimoine" replace />} />
              <Route path="/perso/investments" element={<Navigate to="/perso/patrimoine" replace />} />
              {/* Redirects vers /perso/insights (fusion étape 3) */}
              <Route path="/insights" element={<Navigate to="/perso/insights" replace />} />
              <Route path="/diversification" element={<Navigate to="/perso/insights" replace />} />
              <Route path="/perso/diversification" element={<Navigate to="/perso/insights" replace />} />
              <Route path="/decisions" element={<Navigate to="/perso/insights" replace />} />

              {/* ── 404 ───────────────────────────────────────────────────── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
