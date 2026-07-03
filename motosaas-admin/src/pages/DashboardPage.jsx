import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../components/DataTable";
import { Loader } from "../components/Loader";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { reportsApi } from "../api/resources";
import { useAuth } from "../features/auth/useAuth";

const tripStatuses = [
  "REQUESTED",
  "SEARCHING_DRIVER",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "TRIP_STARTED",
  "TRIP_FINISHED",
  "TRIP_CANCELLED",
  "REJECTED",
  "EXPIRED"
];

function currency(value) {
  return `Bs ${Number(value || 0).toFixed(2)}`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  const headers = Array.from(rows.reduce((keys, row) => {
    Object.keys(row).forEach((key) => keys.add(key));
    return keys;
  }, new Set()));
  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportReport(data) {
  const rows = [];
  const summary = data.summary || {};

  Object.entries(summary).forEach(([key, value]) => {
    rows.push({ section: "summary", metric: key, value });
  });

  Object.entries(data.tripsByStatus || {}).forEach(([status, count]) => {
    rows.push({ section: "tripsByStatus", status, count });
  });

  (data.tripsByCity || []).forEach((item) => {
    rows.push({ section: "tripsByCity", city: item.city, trips: item.trips, income: item.income });
  });

  (data.tripsByAssociation || []).forEach((item) => {
    rows.push({
      section: "tripsByAssociation",
      association_id: item.association_id,
      name: item.name,
      city: item.city,
      status: item.status,
      trips: item.trips,
      income: item.income
    });
  });

  (data.topDrivers || []).forEach((item) => {
    rows.push({
      section: "topDrivers",
      driver_user_id: item.driver_user_id,
      name: item.name,
      phone: item.phone,
      trips: item.trips,
      income: item.income
    });
  });

  downloadCsv(`motosaas-reportes-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

function BarList({ rows, labelKey, valueKey, moneyValue = false }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);

  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="space-y-3">
        {rows.length ? rows.map((row) => {
          const value = Number(row[valueKey] || 0);
          const width = `${Math.max((value / max) * 100, value > 0 ? 8 : 0)}%`;

          return (
            <div key={row.id || row[labelKey]}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-neutral-700">{row[labelKey] || "-"}</span>
                <span className="text-neutral-500">{moneyValue ? currency(value) : value}</span>
              </div>
              <div className="h-2 rounded-lg bg-stone-100">
                <div className="h-2 rounded-lg bg-brand" style={{ width }} />
              </div>
            </div>
          );
        }) : <p className="text-sm text-neutral-500">Sin datos para mostrar.</p>}
      </div>
    </section>
  );
}

function FilterPanel({ filters, isSuperAdmin, onChange, onClear }) {
  return (
    <section className="mb-5 rounded-lg border border-line bg-white p-4">
      <div className="grid gap-3 md:grid-cols-5">
        <label className="text-sm font-medium text-neutral-600">
          Desde
          <input
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-teal-100"
            type="date"
            value={filters.startDate}
            onChange={(event) => onChange("startDate", event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Hasta
          <input
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-teal-100"
            type="date"
            value={filters.endDate}
            onChange={(event) => onChange("endDate", event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Estado
          <select
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-teal-100"
            value={filters.status}
            onChange={(event) => onChange("status", event.target.value)}
          >
            <option value="">Todos</option>
            {tripStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Mototaxista
          <input
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-teal-100"
            placeholder="ID usuario"
            value={filters.driverId}
            onChange={(event) => onChange("driverId", event.target.value)}
          />
        </label>
        {isSuperAdmin ? (
          <label className="text-sm font-medium text-neutral-600">
            Asociacion
            <input
              className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-teal-100"
              placeholder="association_id"
              value={filters.associationId}
              onChange={(event) => onChange("associationId", event.target.value)}
            />
          </label>
        ) : null}
      </div>
      <div className="mt-3 flex justify-end">
        <button className="h-10 rounded-lg border border-line px-4 text-sm font-semibold text-neutral-700" type="button" onClick={onClear}>
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}

function SuperDashboard({ data }) {
  const cityRows = data.tripsByCity || [];
  const associationRows = data.tripsByAssociation || [];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total asociaciones" value={data.summary?.totalAssociations || 0} />
        <StatCard label="Activas" value={data.summary?.activeAssociations || 0} />
        <StatCard label="Suspendidas" value={data.summary?.suspendedAssociations || 0} />
        <StatCard label="Mototaxistas" value={data.summary?.totalDrivers || 0} />
        <StatCard label="Viajes" value={data.summary?.totalTrips || 0} />
        <StatCard label="Ingresos" value={currency(data.summary?.totalIncome)} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-ink">Viajes por ciudad</h2>
          <BarList rows={cityRows} labelKey="city" valueKey="trips" />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold text-ink">Ingresos por ciudad</h2>
          <BarList rows={cityRows} labelKey="city" valueKey="income" moneyValue />
        </div>
      </div>

      <div className="mt-5">
        <h2 className="mb-3 text-lg font-semibold text-ink">Viajes por asociacion</h2>
        <DataTable
          rows={associationRows}
          searchPlaceholder="Buscar asociacion"
          pageSize={6}
          columns={[
            { header: "Asociacion", accessor: "name" },
            { header: "Ciudad", accessor: "city" },
            { header: "Estado", accessor: "status" },
            { header: "Viajes", accessor: "trips" },
            { header: "Ingresos", accessor: (row) => currency(row.income) }
          ]}
        />
      </div>
    </>
  );
}

function AssociationDashboard({ data }) {
  const statusRows = Object.entries(data.tripsByStatus || {}).map(([status, trips]) => ({ id: status, status, trips }));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Viajes dia" value={data.summary?.tripsToday || 0} />
        <StatCard label="Viajes mes" value={data.summary?.tripsMonth || 0} />
        <StatCard label="Activos" value={data.summary?.activeDrivers || 0} />
        <StatCard label="Inactivos" value={data.summary?.inactiveDrivers || 0} />
        <StatCard label="Ingresos dia" value={currency(data.summary?.incomeToday)} />
        <StatCard label="Ingresos mes" value={currency(data.summary?.incomeMonth)} />
        <StatCard label="Cancelados" value={data.summary?.cancelledTrips || 0} />
        <StatCard label="Finalizados" value={data.summary?.finishedTrips || 0} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-ink">Viajes por estado</h2>
          <BarList rows={statusRows} labelKey="status" valueKey="trips" />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold text-ink">Top mototaxistas</h2>
          <DataTable
            rows={data.topDrivers || []}
            searchPlaceholder="Buscar mototaxista"
            pageSize={5}
            columns={[
              { header: "Mototaxista", accessor: "name" },
              { header: "Telefono", accessor: "phone" },
              { header: "Viajes", accessor: "trips" },
              { header: "Ingresos", accessor: (row) => currency(row.income) }
            ]}
          />
        </div>
      </div>
    </>
  );
}

export function DashboardPage() {
  const { session } = useAuth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [filters, setFilters] = useState({
    associationId: "",
    driverId: "",
    endDate: "",
    startDate: "",
    status: ""
  });

  const params = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(([, value]) => String(value || "").trim())
      ),
    [filters]
  );

  const dashboardQuery = useQuery({
    queryKey: ["reports-dashboard", role, params],
    queryFn: () => reportsApi.dashboard(params),
    enabled: Boolean(role === "SUPER_ADMIN" || role === "ASSOCIATION_ADMIN")
  });

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setFilters({
      associationId: "",
      driverId: "",
      endDate: "",
      startDate: "",
      status: ""
    });
  }

  if (dashboardQuery.isLoading) {
    return <Loader />;
  }

  const data = dashboardQuery.data || {};

  return (
    <>
      <PageHeader
        title={data.scope === "SUPER_ADMIN" ? "Reportes globales" : "Reportes de asociacion"}
        description="Metricas operativas y financieras."
        actions={
          <button
            className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"
            type="button"
            disabled={!dashboardQuery.data}
            onClick={() => exportReport(data)}
          >
            Exportar CSV
          </button>
        }
      />

      <FilterPanel filters={filters} isSuperAdmin={isSuperAdmin} onChange={updateFilter} onClear={clearFilters} />

      {dashboardQuery.error ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {dashboardQuery.error.response?.data?.error?.message || "No se pudieron cargar los reportes."}
        </section>
      ) : null}

      {data.scope === "SUPER_ADMIN" ? <SuperDashboard data={data} /> : <AssociationDashboard data={data} />}
    </>
  );
}
