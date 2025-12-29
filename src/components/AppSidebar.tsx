import { Home, Briefcase, TrendingUp, BarChart3, LogOut, PieChart, Lightbulb } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefetchOnHover } from "@/hooks/usePrefetchOnHover";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Overview", url: "/", icon: Home },
  { title: "Investments", url: "/investments", icon: Briefcase },
  { title: "Diversification", url: "/diversification", icon: PieChart },
  { title: "Décisions", url: "/decisions", icon: Lightbulb },
  { title: "Insights", url: "/insights", icon: BarChart3 },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { handleMouseEnter, handleMouseLeave } = usePrefetchOnHover();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold flex items-center gap-2 py-4">
            <div className="p-1.5 bg-sidebar-primary rounded-md">
              <TrendingUp className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <span>Invest Dashboard</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      onMouseEnter={handleMouseEnter(item.url)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
