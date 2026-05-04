import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import MinhasDemandas from "./pages/MinhasDemandas";
import NovaDemanda from "./pages/NovaDemanda";
import DemandaDetalhe from "./pages/DemandaDetalhe";
import Perfil from "./pages/Perfil";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDemandas from "./pages/AdminDemandas";
import AdminUsuarios from "./pages/AdminUsuarios";
import AdminCategorias from "./pages/AdminCategorias";
import AdminEmailNotifications from "./pages/AdminEmailNotifications";
import AdminCalendario from "./pages/AdminCalendario";
import MinhaEscala from "./pages/MinhaEscala";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const HomeRedirect = () => {
  const { role, loading } = useAuth();
  if (loading) return null;
  return role === "admin" ? <Navigate to="/admin" replace /> : <MinhasDemandas />;
};

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/nova" element={<NovaDemanda />} />
                <Route path="/demanda/:id" element={<DemandaDetalhe />} />
                <Route path="/minha-escala" element={<MinhaEscala />} />
                <Route path="/perfil" element={<Perfil />} />

                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/demandas" element={<ProtectedRoute requireAdmin><AdminDemandas /></ProtectedRoute>} />
                <Route path="/admin/calendario" element={<ProtectedRoute requireAdmin><AdminCalendario /></ProtectedRoute>} />
                <Route path="/admin/usuarios" element={<ProtectedRoute requireAdmin><AdminUsuarios /></ProtectedRoute>} />
                <Route path="/admin/categorias" element={<ProtectedRoute requireAdmin><AdminCategorias /></ProtectedRoute>} />
                <Route path="/admin/email-notifications" element={<ProtectedRoute requireAdmin><AdminEmailNotifications /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
