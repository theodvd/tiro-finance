import { TopNav } from "./TopNav";
import { useAutoRefreshPrices } from "@/hooks/useAutoRefreshPrices";

export function AppLayout({ children }: { children: React.ReactNode }) {
  useAutoRefreshPrices();

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
