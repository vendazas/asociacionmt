import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { AdminLayout } from "../layouts/AdminLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { AssociationsPage } from "../pages/associations/AssociationsPage";
import { DriversPage } from "../pages/drivers/DriversPage";
import { FaresPage } from "../pages/fares/FaresPage";
import { ReportsPage } from "../pages/reports/ReportsPage";
import { TripsPage } from "../pages/trips/TripsPage";
import { VehiclesPage } from "../pages/vehicles/VehiclesPage";
import { ZonesPage } from "../pages/zones/ZonesPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "../features/auth/useAuth";

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate replace to="/" /> : <LoginPage />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="associations" element={<AssociationsPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="fares" element={<FaresPage />} />
          <Route path="zones" element={<ZonesPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
