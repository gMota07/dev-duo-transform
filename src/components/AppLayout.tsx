import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  Tags,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const AppLayout = () => {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const userLinks = [
    { to: "/", label: "Minhas Demandas", icon: FileText },
    { to: "/nova", label: "Nova Demanda", icon: PlusCircle },
  ];

  const adminLinks = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/usuarios", label: "Usuários", icon: Users },
    { to: "/admin/categorias", label: "Categorias", icon: Tags },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-sidebar-foreground leading-tight">FS Consultores</h1>
              <p className="text-[11px] text-muted-foreground">Sistema de Demandas</p>
            </div>
          </div>
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
            className="w-full justify-start text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};
