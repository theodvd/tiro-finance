import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import {
  MoreHorizontal,
  Menu,
  X,
  FileUp,
  Lightbulb,
  Settings,
  User,
  LogOut,
  Import,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const mainLinks = [
  { label: "Overview", to: "/", end: true },
  { label: "Investments", to: "/investments" },
  { label: "Diversification", to: "/diversification" },
  { label: "Insights", to: "/insights" },
];

const secondaryLinks = [
  { label: "Import", to: "/import", icon: FileUp },
  { label: "Décisions", to: "/decisions", icon: Lightbulb },
  { label: "Stratégie", to: "/settings", icon: Settings },
];

const linkClass =
  "px-4 py-2 rounded-lg text-sm font-medium transition-colors";
const inactiveClass = "text-muted-foreground hover:text-foreground hover:bg-secondary";
const activeClass = "text-primary bg-primary/10";

export function TopNav() {
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "U";

  if (isMobile) {
    return (
      <header className="sticky top-0 z-50 h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <NavLink to="/" className="text-lg font-bold tracking-tight text-foreground">
          Solen
        </NavLink>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <div className="flex items-center justify-between px-4 h-14 border-b border-border">
              <span className="text-lg font-bold text-foreground">Solen</span>
            </div>
            <nav className="flex flex-col p-3 gap-1">
              {mainLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn("px-4 py-2.5 rounded-lg text-sm font-medium", isActive ? activeClass : inactiveClass)
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <div className="h-px bg-border my-2" />
              {secondaryLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn("px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2", isActive ? activeClass : inactiveClass)
                  }
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </NavLink>
              ))}
              <div className="h-px bg-border my-2" />
              <NavLink
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn("px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2", isActive ? activeClass : inactiveClass)
                }
              >
                <User className="h-4 w-4" />
                Profil
              </NavLink>
              <button
                onClick={() => { setMobileOpen(false); signOut(); }}
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

  return (
    <header className="sticky top-0 z-50 h-16 bg-card border-b border-border">
      <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="text-xl font-bold tracking-tight text-foreground">
          Solen
        </NavLink>

        {/* Main nav */}
        <nav className="flex items-center gap-1">
          {mainLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(linkClass, isActive ? activeClass : inactiveClass)
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {secondaryLinks.map((l) => (
                <DropdownMenuItem key={l.to} asChild>
                  <NavLink to={l.to} className="flex items-center gap-2 cursor-pointer">
                    <l.icon className="h-4 w-4" />
                    {l.label}
                  </NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Avatar menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center hover:bg-primary/20 transition-colors">
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <NavLink to="/profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Profil
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Paramètres
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
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
