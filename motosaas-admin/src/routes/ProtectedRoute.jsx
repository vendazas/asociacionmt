import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";

export function ProtectedRoute() {
  const { isAuthenticated, isBooting } = useAuth();

  if (isBooting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 text-ink">
        <div className="rounded-lg border border-line bg-white px-5 py-4 text-sm font-medium shadow-panel">
          Cargando sesion
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  return <Outlet />;
}
