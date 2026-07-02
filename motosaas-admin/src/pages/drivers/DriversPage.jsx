import Swal from "sweetalert2";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { driversApi, vehiclesApi } from "../../api/resources";
import { DataTable } from "../../components/DataTable";
import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";
import { getApiError } from "../../utils/errors";

const driverStatuses = [
  { value: "PENDING", label: "PENDIENTE" },
  { value: "ACTIVE", label: "ACTIVO" },
  { value: "INACTIVE", label: "INACTIVO" },
  { value: "BLOCKED", label: "BLOQUEADO" }
];

const driverStatusLabels = Object.fromEntries(driverStatuses.map((status) => [status.value, status.label]));

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(5),
  documentNumber: z.string().min(3),
  email: z.string().email(),
  username: z.string().min(3).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().optional(),
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "BLOCKED"]),
  vehicleId: z.string().optional()
});

const defaultValues = {
  firstName: "",
  lastName: "",
  phone: "",
  documentNumber: "",
  email: "",
  username: "",
  password: "",
  status: "PENDING",
  vehicleId: ""
};

function driverToForm(driver) {
  return {
    firstName: driver.first_name || driver.full_name?.split(" ")[0] || "",
    lastName: driver.last_name || driver.full_name?.split(" ").slice(1).join(" ") || "",
    phone: driver.phone || "",
    documentNumber: driver.document_number || "",
    email: driver.email || "",
    username: driver.username || "",
    password: "",
    status: driver.status || "PENDING",
    vehicleId: driver.vehicles?.[0]?.id || ""
  };
}

function cleanPayload(values, isEditing) {
  const payload = {
    ...values,
    vehicleId: values.vehicleId || null
  };

  if (isEditing && !payload.password) {
    delete payload.password;
  }

  return payload;
}

export function DriversPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [editingDriver, setEditingDriver] = useState(null);

  const query = useQuery({
    queryKey: ["drivers", statusFilter],
    queryFn: () => driversApi.list({ limit: 100, status: statusFilter || undefined })
  });
  const vehiclesQuery = useQuery({
    queryKey: ["vehicles-for-drivers"],
    queryFn: () => vehiclesApi.list({ limit: 100 })
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues
  });

  useEffect(() => {
    form.reset(editingDriver ? driverToForm(editingDriver) : defaultValues);
  }, [editingDriver, form]);

  const availableVehicles = useMemo(() => {
    const currentDriverId = editingDriver?.id;
    return (vehiclesQuery.data || []).filter((vehicle) => !vehicle.driver_user_id || vehicle.driver_user_id === currentDriverId);
  }, [editingDriver?.id, vehiclesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (values) => {
      if (!editingDriver && !values.password) {
        throw new Error("La contrasena temporal es requerida.");
      }

      const payload = cleanPayload(values, Boolean(editingDriver));
      if (editingDriver) {
        return driversApi.update(editingDriver.id, payload);
      }

      return driversApi.create(payload);
    },
    onSuccess: () => {
      form.reset(defaultValues);
      setEditingDriver(null);
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-for-drivers"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      Swal.fire({
        icon: "success",
        title: editingDriver ? "Mototaxista actualizado" : "Mototaxista creado",
        confirmButtonColor: "#0f766e"
      });
    },
    onError: (error) => {
      Swal.fire({
        icon: "error",
        title: getApiError(error, error.message),
        confirmButtonColor: "#0f766e"
      });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ driverId, status }) => driversApi.updateStatus(driverId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  async function changeStatus(driver, status) {
    const result = await Swal.fire({
      icon: "question",
      title: `Cambiar estado a ${driverStatusLabels[status]}`,
      text: driver.full_name,
      showCancelButton: true,
      confirmButtonColor: "#0f766e",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      statusMutation.mutate({ driverId: driver.id, status });
    }
  }

  if (query.isLoading || vehiclesQuery.isLoading) return <Loader />;

  return (
    <>
      <PageHeader title="Mototaxistas" description="Conductores propios de la asociacion." />

      <section className="mb-5 rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">{editingDriver ? "Editar mototaxista" : "Registrar mototaxista"}</h2>
            <p className="text-sm text-neutral-600">Crea credenciales y asigna una moto si corresponde.</p>
          </div>
          {editingDriver ? (
            <button className="h-10 rounded-lg border border-line px-3 text-sm font-medium" type="button" onClick={() => setEditingDriver(null)}>
              Cancelar edicion
            </button>
          ) : null}
        </div>

        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <Field label="Nombre" error={form.formState.errors.firstName?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("firstName")} />
          </Field>
          <Field label="Apellido" error={form.formState.errors.lastName?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("lastName")} />
          </Field>
          <Field label="Telefono" error={form.formState.errors.phone?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("phone")} />
          </Field>
          <Field label="Documento" error={form.formState.errors.documentNumber?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("documentNumber")} />
          </Field>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" type="email" {...form.register("email")} />
          </Field>
          <Field label="Usuario" error={form.formState.errors.username?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("username")} />
          </Field>
          <Field label={editingDriver ? "Nueva contrasena" : "Contrasena temporal"} error={form.formState.errors.password?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" type="password" {...form.register("password")} />
          </Field>
          <Field label="Estado" error={form.formState.errors.status?.message}>
            <select className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("status")}>
              {driverStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Moto asignada" error={form.formState.errors.vehicleId?.message}>
            <select className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("vehicleId")}>
              <option value="">Sin moto asignada</option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} {vehicle.internal_number ? `- ${vehicle.internal_number}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button className="h-10 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando" : editingDriver ? "Guardar cambios" : "Crear mototaxista"}
            </button>
          </div>
        </form>
      </section>

      <DataTable
        rows={query.data || []}
        searchPlaceholder="Buscar por nombre, documento, usuario, email"
        actions={
          <select className="h-10 rounded-lg border border-line px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            {driverStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        }
        columns={[
          { header: "Nombre", accessor: "full_name" },
          { header: "Documento", accessor: "document_number" },
          { header: "Usuario", accessor: "username" },
          { header: "Email", accessor: "email" },
          { header: "Telefono", accessor: "phone" },
          { header: "Moto", accessor: (row) => row.vehicles?.[0]?.plate || "-" },
          { header: "Disponibilidad", accessor: (row) => row.driver_profile?.availability_status || "-" },
          { header: "Estado", accessor: (row) => driverStatusLabels[row.status] || row.status },
          {
            header: "Acciones",
            accessor: "id",
            cell: (row) => (
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => setEditingDriver(row)}>
                  Editar
                </button>
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => changeStatus(row, "ACTIVE")}>
                  Activar
                </button>
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => changeStatus(row, "INACTIVE")}>
                  Inactivar
                </button>
                <button className="rounded-lg border border-line px-3 py-1 text-accent" type="button" onClick={() => changeStatus(row, "BLOCKED")}>
                  Bloquear
                </button>
              </div>
            )
          }
        ]}
      />
    </>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      {children}
      {error ? <p className="mt-1 text-sm text-accent">{error}</p> : null}
    </label>
  );
}
