import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import {
  MoreHorizontal,
  Menu,
  FileUp,
  Lightbulb,
  Settings,
  User,
  LogOut,
  LayoutDashboard,
  Calendar,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Définition des liens par section
// ─────────────────────────────────────────────────────────────

const proLinks = [
  { label: "Factures", to: "/pro/invoices" },
  { label: "Charges", to: "/pro/charges" },
  { label: "Impôts", to: "/pro/tax" },
];

const persoLinks = [
  { label: "Patrimoine", to: "/perso/portfolio" },
  { label: "Investissements", to: "/perso/investments" },
  { label: "Insights", to: "/perso/insights" },
  { label: "Diversification", to: "/perso/diversification" },
];

const secondaryLinks = [
  { label: "Import", to: "/import", icon: FileUp },
  { label: "Décisions", to: "/decisions", icon: Lightbulb },
  { label: "Revue mensuelle", to: "/monthly-review", icon: Calendar },
  { label: "Paramètres", to: "/settings", icon: Settings },
];

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Section = "pro" | "perso";

// ─────────────────────────────────────────────────────────────
// Toggle Pro / Perso
// ─────────────────────────────────────────────────────────────

function SectionToggle({
  active,
  onChange,
}: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  return (
    <div className="flex rounded-lg border border-border bg-secondary/40 p-0.5 gap-0.5">
      <button
        onClick={() => onChange("perso")}
        className={cn(
          "px-3 py-1 rounded-md text-xs font-medium transition-colors",
          active === "perso"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Personnel
      </button>
      <button
        onClick={() => onChange("pro")}
        className={cn(
          "px-3 py-1 rounded-md text-xs font-medium transition-colors",
          active === "pro"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Pro
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles des liens
// ─────────────────────────────────────────────────────────────

const linkClass = "px-3 py-2 rounded-lg text-sm font-medium transition-colors";
const inactiveClass =
  "text-muted-foreground hover:text-foreground hover:bg-secondary";
const activeClass = "text-primary bg-primary/10";

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

export function TopNav() {
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Initialise la section active d'après l'URL courante.
  // Pas de sync en temps réel : le toggle est indépendant de la navigation.
  const [activeSection, setActiveSection] = useState<Section>(
    location.pathname.startsWith("/pro") ? "pro" : "perso"
  );

  const mainLinks = activeSection === "pro" ? proLinks : persoLinks;

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "U";

  // ── Mobile ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <header className="sticky top-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <NavLink
          to="/dashboard"
          className="text-lg font-bold tracking-tight text-foreground"
        >
          Solvio
        </NavLink>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <div className="flex items-center justify-between px-4 h-14 border-b border-border">
              <span className="text-lg font-bold text-foreground">Solvio</span>
            </div>
            <nav className="flex flex-col p-3 gap-1">
              {/* Dashboard */}
              <NavLink
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2",
                    isActive ? activeClass : inactiveClass
                  )
                }
              >
                <LayoutDashboard className="h-4 w-4" />
                Tableau de bord
              </NavLink>

              <div className="h-px bg-border my-1" />

              {/* Toggle mobile */}
              <div className="px-2 py-1">
                <SectionToggle
                  active={activeSection}
                  onChange={setActiveSection}
                />
              </div>

              {/* Section Pro */}
              <p className="px-4 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="h-3 w-3" />
                Professionnel
              </p>
              {proLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "px-4 py-2.5 rounded-lg text-sm font-medium",
                      isActive ? activeClass : inactiveClass
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}

              <div className="h-px bg-border my-1" />

              {/* Section Perso */}
              <p className="px-4 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                Personnel
              </p>
              {persoLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "px-4 py-2.5 rounded-lg text-sm font-medium",
                      isActive ? activeClass : inactiveClass
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}

              <div className="h-px bg-border my-1" />

              {/* Secondaire */}
              {secondaryLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2",
                      isActive ? activeClass : inactiveClass
                    )
                  }
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </NavLink>
              ))}

              <div className="h-px bg-border my-1" />

              <NavLink
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2",
                    isActive ? activeClass : inactiveClass
                  )
                }
              >
                <User className="h-4 w-4" />
                Profil
              </NavLink>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2 text-left"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </header>
    );
  }

  // ── Desktop ─────────────────────────────────────────────────
  return (
    <header className="sticky top-0 z-50 h-16 bg-card border-b border-border">
      <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center gap-4 justify-between">
        {/* Logo */}
        <NavLink
          to="/dashboard"
          className="text-xl font-bold tracking-tight text-foreground shrink-0"
        >
          Solvio
        </NavLink>

        {/* Dashboard link */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            cn(linkClass, "shrink-0", isActive ? activeClass : inactiveClass)
          }
        >
          <span className="flex items-center gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Tableau de bord
          </span>
        </NavLink>

        {/* Toggle Pro / Perso */}
        <SectionToggle active={activeSection} onChange={setActiveSection} />

        {/* Liens contextuels */}
        <nav className="flex items-center gap-1 flex-1">
          {mainLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(linkClass, isActive ? activeClass : inactiveClass)
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Droite : secondaire + avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {secondaryLinks.map((l) => (
                <DropdownMenuItem key={l.to} asChild>
                  <NavLink
                    to={l.to}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <l.icon className="h-4 w-4" />
                    {l.label}
                  </NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center hover:bg-primary/20 transition-colors">
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <NavLink
                  to="/profile"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  Profil
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
