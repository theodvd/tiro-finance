import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAutoRefreshPrices } from "@/hooks/useAutoRefreshPrices";

export function Layout({ children }: { children: React.ReactNode }) {
  useAutoRefreshPrices();

  return (
    <SidebarProvider>
      <div className="flex w-full">
        <div className="hidden md:block fixed left-0 top-0 h-screen z-40 border-r border-border">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-h-screen md:ml-[280px]">
          <header className="h-14 border-b border-border bg-card flex items-center px-4 sticky top-0 z-50">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 text-foreground bg-background overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
