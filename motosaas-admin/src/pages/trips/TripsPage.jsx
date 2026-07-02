import { useQuery } from "@tanstack/react-query";
import { tripsApi } from "../../api/resources";
import { DataTable } from "../../components/DataTable";
import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";

export function TripsPage() {
  const query = useQuery({ queryKey: ["admin-trips"], queryFn: () => tripsApi.adminList({ limit: 100 }) });

  if (query.isLoading) return <Loader />;

  return (
    <>
      <PageHeader title="Viajes" description="Historial y estado de viajes de la asociacion." />
      <DataTable
        rows={query.data?.items || []}
        searchPlaceholder="Buscar viajes"
        columns={[
          { header: "ID", accessor: (row) => row.id.slice(0, 8) },
          { header: "Cliente", accessor: (row) => row.customer?.full_name || "-" },
          { header: "Motociclista", accessor: (row) => row.driver?.full_name || "-" },
          { header: "Estado", accessor: "status" },
          { header: "Estimado", accessor: (row) => `Bs ${row.estimated_fare}` },
          { header: "Final", accessor: (row) => (row.final_fare ? `Bs ${row.final_fare}` : "-") },
          { header: "Fecha", accessor: (row) => new Date(row.requested_at).toLocaleString() }
        ]}
      />
    </>
  );
}
