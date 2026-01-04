import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStrategy } from "@/hooks/useUserStrategy";
import { StrategyOnboarding } from "@/components/onboarding/StrategyOnboarding";

// Routes that don't require onboarding to be completed
const ONBOARDING_EXEMPT_ROUTES = ['/profile', '/auth'];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { strategy, loading: strategyLoading } = useUserStrategy();
  const navigate = useNavigate();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Determine if we should show onboarding
  useEffect(() => {
    if (authLoading || strategyLoading || !user) return;
    
    // Don't force onboarding on exempt routes
    const isExempt = ONBOARDING_EXEMPT_ROUTES.some(r => location.pathname.startsWith(r));
    if (isExempt) {
      setShowOnboarding(false);
      return;
    }

    // Show onboarding if profile doesn't exist or is incomplete
    if (strategy.needsOnboarding) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [authLoading, strategyLoading, user, strategy.needsOnboarding, location.pathname]);

  // Loading state
  if (authLoading || (user && strategyLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Show onboarding wizard
  if (showOnboarding) {
    return (
      <StrategyOnboarding 
        onComplete={() => setShowOnboarding(false)} 
      />
    );
  }

  return <>{children}</>;
}
