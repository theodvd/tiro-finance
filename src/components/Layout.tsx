import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAutoRefreshPrices } from "@/hooks/useAutoRefreshPrices";

export function Layout({ children }: { children: React.ReactNode }) {
  // Auto-refresh prices on mount, every 3 min, and on tab focus
  useAutoRefreshPrices();

  return (
    <SidebarProvider>
      <div className="flex w-full">
        <div className="hidden md:block fixed left-0 top-0 h-screen backdrop-blur-sm z-40">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-h-screen md:ml-[280px]">
          <header className="h-14 border-b border-border/60 bg-card/30 backdrop-blur supports-[backdrop-filter]:bg-card/40 flex items-center px-4 sticky top-0 z-50">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 text-foreground bg-background [background:radial-gradient(1200px_600px_at_80%_-10%,#1b2431_0%,transparent_50%),radial-gradient(900px_500px_at_-10%_0%,#141b25_0%,transparent_45%)] overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
