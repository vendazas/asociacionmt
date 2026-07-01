import Swal from "sweetalert2";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { associationsApi } from "../../api/resources";
import { DataTable } from "../../components/DataTable";
import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";
import { getApiError } from "../../utils/errors";

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  city: z.string().min(2),
  country: z.string().min(2).default("BO")
});

export function AssociationsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["associations"], queryFn: () => associationsApi.list({ limit: 100 }) });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", city: "", country: "BO" }
  });

  const createMutation = useMutation({
    mutationFn: associationsApi.create,
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["associations"] });
      Swal.fire({ icon: "success", title: "Asociacion creada", confirmButtonColor: "#0f766e" });
    },
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  const statusMutation = useMutation({
    mutationFn: ({ associationId, status }) => associationsApi.updateStatus(associationId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["associations"] }),
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  async function changeStatus(row) {
    const nextStatus = row.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const result = await Swal.fire({
      icon: "question",
      title: `${nextStatus === "ACTIVE" ? "Activar" : "Suspender"} asociacion`,
      text: row.name,
      showCancelButton: true,
      confirmButtonColor: "#0f766e",
      confirmButtonText: "Confirmar"
    });

    if (result.isConfirmed) {
      statusMutation.mutate({ associationId: row.association_id, status: nextStatus });
    }
  }

  if (query.isLoading) return <Loader />;

  return (
    <>
      <PageHeader title="Asociaciones" description="Tenants de la plataforma." />
      <div className="mb-5 rounded-lg border border-line bg-white p-5">
        <form className="grid gap-3 md:grid-cols-5" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Nombre" {...form.register("name")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="slug" {...form.register("slug")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Ciudad" {...form.register("city")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Pais" {...form.register("country")} />
          <button className="rounded-lg bg-brand px-4 py-2 font-semibold text-white" type="submit">
            Crear
          </button>
        </form>
      </div>
      <DataTable
        rows={query.data?.items || []}
        searchPlaceholder="Buscar asociaciones"
        columns={[
          { header: "Nombre", accessor: "name" },
          { header: "Slug", accessor: "slug" },
          { header: "Ciudad", accessor: "city" },
          { header: "Estado", accessor: "status" },
          {
            header: "Accion",
            accessor: "status",
            cell: (row) => (
              <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => changeStatus(row)}>
                {row.status === "ACTIVE" ? "Suspender" : "Activar"}
              </button>
            )
          }
        ]}
      />
    </>
  );
}
