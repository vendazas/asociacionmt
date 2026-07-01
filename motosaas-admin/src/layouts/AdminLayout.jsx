import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../features/auth/useAuth";

const routesByRole = {
  SUPER_ADMIN: [
    { to: "/", label: "Dashboard" },
    { to: "/associations", label: "Asociaciones" },
    { to: "/reports", label: "Metricas" }
  ],
  ASSOCIATION_ADMIN: [
    { to: "/", label: "Dashboard" },
    { to: "/drivers", label: "Motociclistas" },
    { to: "/vehicles", label: "Vehiculos" },
    { to: "/fares", label: "Tarifas" },
    { to: "/zones", label: "Zonas" },
    { to: "/trips", label: "Viajes" },
    { to: "/reports", label: "Reportes" }
  ]
};

export function AdminLayout() {
  const { logout, session } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const role = session?.user?.role;
  const routes = routesByRole[role] || routesByRole.ASSOCIATION_ADMIN;

  return (
    <div className="flex min-h-screen bg-stone-100 text-ink">
      <aside
        className={`hidden border-r border-line bg-white transition-all lg:block ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{collapsed ? "MS" : "MotoSaaS"}</p>
            {!collapsed ? <p className="text-xs text-neutral-500">Administracion</p> : null}
          </div>
          <button
            className="h-9 w-9 rounded-lg border border-line text-sm"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            title="Colapsar sidebar"
          >
            {collapsed ? ">" : "<"}
          </button>
        </div>

        <nav className="space-y-1 p-3">
          {routes.map((route) => (
            <NavLink
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-brand text-white" : "text-neutral-700 hover:bg-stone-100"
                }`
              }
              key={route.to}
              to={route.to}
              end={route.to === "/"}
              title={route.label}
            >
              {collapsed ? route.label.slice(0, 1) : route.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-line bg-white">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">MotoSaaS Admin</p>
              <p className="truncate text-sm text-neutral-500">
                {session?.association?.name || session?.association_id} · {role}
              </p>
            </div>
            <button
              className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-stone-50"
              type="button"
              onClick={logout}
            >
              Salir
            </button>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-line bg-white px-4 py-2 lg:hidden">
          {routes.map((route) => (
            <NavLink
              className={({ isActive }) =>
                `shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-brand text-white" : "text-neutral-700"
                }`
              }
              key={route.to}
              to={route.to}
              end={route.to === "/"}
            >
              {route.label}
            </NavLink>
          ))}
        </nav>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
