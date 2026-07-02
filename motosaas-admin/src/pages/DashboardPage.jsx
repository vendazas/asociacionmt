import { useQuery } from "@tanstack/react-query";
import { Loader } from "../components/Loader";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { reportsApi } from "../api/resources";
import { useAuth } from "../features/auth/useAuth";

export function DashboardPage() {
  const { session } = useAuth();
  const role = session?.user?.role;

  const platformQuery = useQuery({
    queryKey: ["platform-summary"],
    queryFn: reportsApi.platformSummary,
    enabled: role === "SUPER_ADMIN"
  });

  const associationQuery = useQuery({
    queryKey: ["association-summary"],
    queryFn: reportsApi.associationSummary,
    enabled: role === "ASSOCIATION_ADMIN"
  });

  const todayQuery = useQuery({
    queryKey: ["today-summary"],
    queryFn: reportsApi.today,
    enabled: role === "ASSOCIATION_ADMIN"
  });

  if (platformQuery.isLoading || associationQuery.isLoading || todayQuery.isLoading) {
    return <Loader />;
  }

  if (role === "SUPER_ADMIN") {
    const data = platformQuery.data || {};
    return (
      <>
        <PageHeader title="Dashboard global" description="Metricas generales de la plataforma." />
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Asociaciones activas" value={data.associationsByStatus?.ACTIVE || 0} />
          <StatCard label="Asociaciones suspendidas" value={data.associationsByStatus?.SUSPENDED || 0} />
          <StatCard label="Viajes completados" value={data.tripsByStatus?.TRIP_FINISHED || 0} />
          <StatCard label="Facturacion bruta" value={`Bs ${data.totalCompletedFare || 0}`} />
        </div>
      </>
    );
  }

  const summary = associationQuery.data || {};
  const today = todayQuery.data || {};

  return (
    <>
      <PageHeader title="Dashboard asociacion" description="Operacion y actividad de tu asociacion." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Motociclistas activos" value={summary.activeDrivers || 0} />
        <StatCard label="Clientes" value={summary.customers || 0} />
        <StatCard label="Viajes hoy" value={today.tripsToday || 0} />
        <StatCard label="Ingresos hoy" value={`Bs ${today.incomeToday || 0}`} />
      </div>
    </>
  );
}
