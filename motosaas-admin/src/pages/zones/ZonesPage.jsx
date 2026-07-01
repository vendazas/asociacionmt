import Swal from "sweetalert2";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zonesApi } from "../../api/resources";
import { DataTable } from "../../components/DataTable";
import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";
import { getApiError } from "../../utils/errors";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  centerLatitude: z.coerce.number().optional(),
  centerLongitude: z.coerce.number().optional(),
  radiusKm: z.coerce.number().optional()
});

export function ZonesPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["zones"], queryFn: zonesApi.list });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", centerLatitude: "", centerLongitude: "", radiusKm: "" }
  });

  const mutation = useMutation({
    mutationFn: zonesApi.create,
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      Swal.fire({ icon: "success", title: "Zona creada", confirmButtonColor: "#0f766e" });
    },
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  if (query.isLoading) return <Loader />;

  return (
    <>
      <PageHeader title="Zonas" description="Cobertura operativa de la asociacion." />
      <div className="mb-5 rounded-lg border border-line bg-white p-5">
        <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Nombre" {...form.register("name")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Descripcion" {...form.register("description")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Latitud centro" {...form.register("centerLatitude")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Longitud centro" {...form.register("centerLongitude")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Radio km" {...form.register("radiusKm")} />
          <button className="rounded-lg bg-brand px-4 py-2 font-semibold text-white" type="submit">
            Crear
          </button>
        </form>
      </div>
      <DataTable
        rows={query.data || []}
        searchPlaceholder="Buscar zonas"
        columns={[
          { header: "Nombre", accessor: "name" },
          { header: "Descripcion", accessor: "description" },
          { header: "Latitud", accessor: "center_latitude" },
          { header: "Longitud", accessor: "center_longitude" },
          { header: "Radio km", accessor: "radius_km" },
          { header: "Estado", accessor: "status" }
        ]}
      />
    </>
  );
}
