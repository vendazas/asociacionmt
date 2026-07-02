import Swal from "sweetalert2";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { driversApi, vehiclesApi } from "../../api/resources";
import { DataTable } from "../../components/DataTable";
import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";
import { getApiError } from "../../utils/errors";

const vehicleStatuses = [
  { value: "ACTIVE", label: "ACTIVO" },
  { value: "INACTIVE", label: "INACTIVO" },
  { value: "MAINTENANCE", label: "MANTENIMIENTO" }
];

const vehicleStatusLabels = Object.fromEntries(vehicleStatuses.map((status) => [status.value, status.label]));

const schema = z.object({
  plate: z.string().min(3),
  internalNumber: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  year: z.preprocess((value) => (value === "" || value === null ? undefined : Number(value)), z.number().int().min(1900).max(2100).optional()),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  driverUserId: z.string().optional()
});

const defaultValues = {
  plate: "",
  internalNumber: "",
  brand: "",
  model: "",
  color: "",
  year: "",
  status: "ACTIVE",
  driverUserId: ""
};

function vehicleToForm(vehicle) {
  return {
    plate: vehicle.plate || "",
    internalNumber: vehicle.internal_number || "",
    brand: vehicle.brand || "",
    model: vehicle.model || "",
    color: vehicle.color || "",
    year: vehicle.year || "",
    status: vehicle.status || "ACTIVE",
    driverUserId: vehicle.driver_user_id || ""
  };
}

function cleanPayload(values) {
  return {
    ...values,
    internalNumber: values.internalNumber || null,
    driverUserId: values.driverUserId || null,
    year: values.year || null
  };
}

export function VehiclesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [editingVehicle, setEditingVehicle] = useState(null);

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", statusFilter],
    queryFn: () => vehiclesApi.list({ limit: 100, status: statusFilter || undefined })
  });
  const driversQuery = useQuery({
    queryKey: ["drivers-for-vehicles"],
    queryFn: () => driversApi.list({ limit: 100 })
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues
  });

  useEffect(() => {
    form.reset(editingVehicle ? vehicleToForm(editingVehicle) : defaultValues);
  }, [editingVehicle, form]);

  const saveMutation = useMutation({
    mutationFn: (values) => {
      const payload = cleanPayload(values);
      if (editingVehicle) {
        return vehiclesApi.update(editingVehicle.id, payload);
      }

      return vehiclesApi.create(payload);
    },
    onSuccess: () => {
      form.reset(defaultValues);
      setEditingVehicle(null);
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["drivers-for-vehicles"] });
      Swal.fire({
        icon: "success",
        title: editingVehicle ? "Vehiculo actualizado" : "Vehiculo creado",
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
    mutationFn: ({ vehicleId, status }) => vehiclesApi.updateStatus(vehicleId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  async function changeStatus(vehicle, status) {
    const result = await Swal.fire({
      icon: "question",
      title: `Cambiar estado a ${vehicleStatusLabels[status]}`,
      text: vehicle.plate,
      showCancelButton: true,
      confirmButtonColor: "#0f766e",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      statusMutation.mutate({ vehicleId: vehicle.id, status });
    }
  }

  if (vehiclesQuery.isLoading || driversQuery.isLoading) return <Loader />;

  return (
    <>
      <PageHeader title="Vehiculos" description="Motos registradas para operar en la asociacion." />

      <section className="mb-5 rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">{editingVehicle ? "Editar vehiculo" : "Registrar vehiculo"}</h2>
            <p className="text-sm text-neutral-600">Controla placa, numero interno, estado y asignacion de mototaxista.</p>
          </div>
          {editingVehicle ? (
            <button className="h-10 rounded-lg border border-line px-3 text-sm font-medium" type="button" onClick={() => setEditingVehicle(null)}>
              Cancelar edicion
            </button>
          ) : null}
        </div>

        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <Field label="Placa" error={form.formState.errors.plate?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3 uppercase" {...form.register("plate")} />
          </Field>
          <Field label="Numero interno" error={form.formState.errors.internalNumber?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3 uppercase" {...form.register("internalNumber")} />
          </Field>
          <Field label="Marca" error={form.formState.errors.brand?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("brand")} />
          </Field>
          <Field label="Modelo" error={form.formState.errors.model?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("model")} />
          </Field>
          <Field label="Color" error={form.formState.errors.color?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("color")} />
          </Field>
          <Field label="Ano" error={form.formState.errors.year?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" type="number" min="1900" max="2100" {...form.register("year")} />
          </Field>
          <Field label="Estado" error={form.formState.errors.status?.message}>
            <select className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("status")}>
              {vehicleStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mototaxista" error={form.formState.errors.driverUserId?.message}>
            <select className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("driverUserId")}>
              <option value="">Sin asignar</option>
              {(driversQuery.data || []).map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name} {driver.document_number ? `- ${driver.document_number}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button className="h-10 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando" : editingVehicle ? "Guardar cambios" : "Crear vehiculo"}
            </button>
          </div>
        </form>
      </section>

      <DataTable
        rows={vehiclesQuery.data || []}
        searchPlaceholder="Buscar por placa, interno, conductor, marca"
        actions={
          <select className="h-10 rounded-lg border border-line px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            {vehicleStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        }
        columns={[
          { header: "Placa", accessor: "plate" },
          { header: "Interno", accessor: "internal_number" },
          { header: "Mototaxista", accessor: (row) => row.driver?.full_name || "-" },
          { header: "Marca", accessor: "brand" },
          { header: "Modelo", accessor: "model" },
          { header: "Color", accessor: "color" },
          { header: "Ano", accessor: "year" },
          { header: "Estado", accessor: (row) => vehicleStatusLabels[row.status] || row.status },
          {
            header: "Acciones",
            accessor: "id",
            cell: (row) => (
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => setEditingVehicle(row)}>
                  Editar
                </button>
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => changeStatus(row, "ACTIVE")}>
                  Activar
                </button>
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => changeStatus(row, "INACTIVE")}>
                  Inactivar
                </button>
                <button className="rounded-lg border border-line px-3 py-1 text-accent" type="button" onClick={() => changeStatus(row, "MAINTENANCE")}>
                  Mantenimiento
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
