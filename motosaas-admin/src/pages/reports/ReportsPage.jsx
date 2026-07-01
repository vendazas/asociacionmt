import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../../api/resources";
import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { useAuth } from "../../features/auth/useAuth";

export function ReportsPage() {
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
    enabled: role !== "SUPER_ADMIN"
  });
  const todayQuery = useQuery({
    queryKey: ["today-summary"],
    queryFn: reportsApi.today,
    enabled: role !== "SUPER_ADMIN"
  });

  if (platformQuery.isLoading || associationQuery.isLoading || todayQuery.isLoading) return <Loader />;

  if (role === "SUPER_ADMIN") {
    const data = platformQuery.data || {};
    return (
      <>
        <PageHeader title="Metricas generales" description="Vista global del SaaS." />
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Asociaciones activas" value={data.associationsByStatus?.ACTIVE || 0} />
          <StatCard label="Asociaciones suspendidas" value={data.associationsByStatus?.SUSPENDED || 0} />
          <StatCard label="Usuarios cliente" value={data.usersByRole?.CUSTOMER || 0} />
          <StatCard label="Total completado" value={`Bs ${data.totalCompletedFare || 0}`} />
        </div>
      </>
    );
  }

  const summary = associationQuery.data || {};
  const today = todayQuery.data || {};

  return (
    <>
      <PageHeader title="Reportes" description="Indicadores basicos de la asociacion." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Conductores activos" value={today.activeDrivers || summary.activeDrivers || 0} />
        <StatCard label="Viajes hoy" value={today.tripsToday || 0} />
        <StatCard label="Ingresos hoy" value={`Bs ${today.incomeToday || 0}`} />
        <StatCard label="Ticket promedio" value={`Bs ${summary.revenue?.averageCompletedFare || 0}`} />
      </div>
    </>
  );
}
