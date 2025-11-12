import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="backdrop-blur-sm hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border/60 bg-card/30 backdrop-blur supports-[backdrop-filter]:bg-card/40 flex items-center px-4 sticky top-0 z-50">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-4 sm:p-6 md:p-8 text-foreground bg-background [background:radial-gradient(1200px_600px_at_80%_-10%,#1b2431_0%,transparent_50%),radial-gradient(900px_500px_at_-10%_0%,#141b25_0%,transparent_45%)] overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
