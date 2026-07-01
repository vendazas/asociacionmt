import Swal from "sweetalert2";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { driversApi, vehiclesApi } from "../../api/resources";
import { DataTable } from "../../components/DataTable";
import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";
import { getApiError } from "../../utils/errors";

const schema = z.object({
  driverUserId: z.string().min(1),
  plate: z.string().min(3),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  year: z.coerce.number().optional()
});

export function VehiclesPage() {
  const queryClient = useQueryClient();
  const vehiclesQuery = useQuery({ queryKey: ["vehicles"], queryFn: () => vehiclesApi.list({ limit: 100 }) });
  const driversQuery = useQuery({ queryKey: ["drivers"], queryFn: () => driversApi.list({ limit: 100 }) });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { driverUserId: "", plate: "", brand: "", model: "", color: "", year: "" }
  });

  const mutation = useMutation({
    mutationFn: vehiclesApi.create,
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      Swal.fire({ icon: "success", title: "Vehiculo creado", confirmButtonColor: "#0f766e" });
    },
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  if (vehiclesQuery.isLoading || driversQuery.isLoading) return <Loader />;

  return (
    <>
      <PageHeader title="Vehiculos" description="Unidades asociadas a motociclistas." />
      <div className="mb-5 rounded-lg border border-line bg-white p-5">
        <form className="grid gap-3 md:grid-cols-4 xl:grid-cols-7" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <select className="rounded-lg border border-line px-3 py-2" {...form.register("driverUserId")}>
            <option value="">Motociclista</option>
            {(driversQuery.data || []).map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name}
              </option>
            ))}
          </select>
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Placa" {...form.register("plate")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Marca" {...form.register("brand")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Modelo" {...form.register("model")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Color" {...form.register("color")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Año" {...form.register("year")} />
          <button className="rounded-lg bg-brand px-4 py-2 font-semibold text-white" type="submit">
            Crear
          </button>
        </form>
      </div>
      <DataTable
        rows={vehiclesQuery.data || []}
        searchPlaceholder="Buscar vehiculos"
        columns={[
          { header: "Placa", accessor: "plate" },
          { header: "Motociclista", accessor: (row) => row.driver?.full_name || "-" },
          { header: "Marca", accessor: "brand" },
          { header: "Modelo", accessor: "model" },
          { header: "Color", accessor: "color" },
          { header: "Estado", accessor: "status" }
        ]}
      />
    </>
  );
}
