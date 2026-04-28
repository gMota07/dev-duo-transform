import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  Tags,
  LogOut,
  Inbox,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const AppLayout = () => {
  const { profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const userLinks = [
    { to: "/", label: "Minhas Demandas", icon: FileText },
    { to: "/nova", label: "Nova Demanda", icon: PlusCircle },
    { to: "/perfil", label: "Meu Perfil", icon: Settings },
  ];

  const adminLinks = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/demandas", label: "Demandas", icon: Inbox },
    { to: "/admin/usuarios", label: "Usuários", icon: Users },
    { to: "/admin/categorias", label: "Categorias", icon: Tags },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
        <div className="p-6 border-b border-sidebar-border flex justify-center">
            <img src="/logo.png" alt="Logo" className="h-10 object-contain" />
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/" || link.to === "/admin"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.nome ?? "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded bg-accent text-accent-foreground">
              {isAdmin ? "Administrador" : "Usuário"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground mb-2"
            onClick={toggleTheme}
          >
            {theme === "light" ? (
              <>
                <Moon className="h-4 w-4 mr-2" />
                Tema Escuro
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 mr-2" />
                Tema Claro
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto ml-64">
        <Outlet />
      </main>
    </div>
  );
};
