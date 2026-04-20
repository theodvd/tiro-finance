import {
  LayoutDashboard,
  FileText,
  Receipt,
  Calculator,
  TrendingUp,
  Briefcase,
  BarChart3,
  PieChart,
  FileUp,
  Lightbulb,
  Calendar,
  LogOut,
  Settings,
  User,
} from "lucide-react";
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
  SidebarHeader,
} from "@/components/ui/sidebar";

/**
 * Sidebar de navigation Solvio.
 * Structure : Dashboard | Pro | Perso | Transversal | Profil
 *
 * NOTE : ce composant n'est pas encore branché dans AppLayout (Phase A).
 * La navigation active est assurée par TopNav.tsx.
 * L'intégration sidebar complète (SidebarProvider dans AppLayout) sera
 * décidée en Phase B si on souhaite passer à un layout sidebar+contenu.
 */

const proItems = [
  { title: "Factures", url: "/pro/invoices", icon: FileText },
  { title: "Charges & URSSAF", url: "/pro/charges", icon: Receipt },
  { title: "Impôts & Provisions", url: "/pro/tax", icon: Calculator },
];

const persoItems = [
  { title: "Patrimoine", url: "/perso/portfolio", icon: TrendingUp },
  { title: "Investissements", url: "/perso/investments", icon: Briefcase },
  { title: "Insights", url: "/perso/insights", icon: BarChart3 },
  { title: "Diversification", url: "/perso/diversification", icon: PieChart },
];

const transversalItems = [
  { title: "Import", url: "/import", icon: FileUp },
  { title: "Décisions", url: "/decisions", icon: Lightbulb },
  { title: "Revue mensuelle", url: "/monthly-review", icon: Calendar },
  { title: "Paramètres", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { handleMouseEnter, handleMouseLeave } = usePrefetchOnHover();

  const navLinkProps = (url: string) => ({
    to: url,
    className: "hover:bg-sidebar-accent",
    activeClassName: "bg-sidebar-accent text-sidebar-primary font-medium",
    onMouseEnter: handleMouseEnter(url),
    onMouseLeave: handleMouseLeave,
  });

  return (
    <Sidebar>
      {/* En-tête : logo + lien dashboard */}
      <SidebarHeader>
        <NavLink
          to="/dashboard"
          className="flex items-center gap-2 px-2 py-3 text-lg font-bold tracking-tight hover:opacity-80"
          activeClassName=""
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Solvio</span>
        </NavLink>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink {...navLinkProps("/dashboard")}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Tableau de bord</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Section Professionnel */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <Briefcase className="w-3.5 h-3.5" />
            Professionnel
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {proItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink {...navLinkProps(item.url)}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Section Personnel */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            Personnel
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {persoItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink {...navLinkProps(item.url)}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Transversal */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider">
            Outils
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {transversalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink {...navLinkProps(item.url)}>
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

      {/* Footer : profil + déconnexion */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink {...navLinkProps("/profile")}>
                <User className="w-4 h-4" />
                <span>Profil</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
