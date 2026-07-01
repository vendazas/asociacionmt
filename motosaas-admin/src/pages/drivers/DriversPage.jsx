import Swal from "sweetalert2";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { driversApi, usersApi } from "../../api/resources";
import { DataTable } from "../../components/DataTable";
import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";
import { getApiError } from "../../utils/errors";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  licenseNumber: z.string().optional()
});

export function DriversPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["drivers"], queryFn: () => driversApi.list({ limit: 100 }) });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", licenseNumber: "" }
  });

  const mutation = useMutation({
    mutationFn: (values) => usersApi.create({ ...values, role: "DRIVER" }),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      Swal.fire({ icon: "success", title: "Motociclista creado", confirmButtonColor: "#0f766e" });
    },
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  if (query.isLoading) return <Loader />;

  return (
    <>
      <PageHeader title="Motociclistas" description="Conductores propios de la asociacion." />
      <div className="mb-5 rounded-lg border border-line bg-white p-5">
        <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Nombre" {...form.register("fullName")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Email" {...form.register("email")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Telefono" {...form.register("phone")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Licencia" {...form.register("licenseNumber")} />
          <input className="rounded-lg border border-line px-3 py-2" placeholder="Password" type="password" {...form.register("password")} />
          <button className="rounded-lg bg-brand px-4 py-2 font-semibold text-white" type="submit">
            Crear
          </button>
        </form>
      </div>
      <DataTable
        rows={query.data || []}
        searchPlaceholder="Buscar motociclistas"
        columns={[
          { header: "Nombre", accessor: "full_name" },
          { header: "Email", accessor: "email" },
          { header: "Telefono", accessor: "phone" },
          { header: "Disponibilidad", accessor: (row) => row.driver_profile?.availability_status || "-" },
          { header: "Vehiculos", accessor: (row) => row.vehicles?.length || 0 },
          { header: "Estado", accessor: "status" }
        ]}
      />
    </>
  );
}
