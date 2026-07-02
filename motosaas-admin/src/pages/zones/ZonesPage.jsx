import { useEffect, useState } from "react";
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

const zoneStatuses = [
  { value: "ACTIVE", label: "ACTIVA" },
  { value: "INACTIVE", label: "INACTIVA" }
];

const zoneStatusLabels = Object.fromEntries(zoneStatuses.map((status) => [status.value, status.label]));

const requiredNumber = (min, max) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z.number().min(min).max(max)
  );

const schema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  description: z.string().optional(),
  centerLatitude: requiredNumber(-90, 90),
  centerLongitude: requiredNumber(-180, 180),
  radiusKm: requiredNumber(0.1, 1000),
  status: z.enum(["ACTIVE", "INACTIVE"])
});

const defaultValues = {
  name: "",
  city: "",
  description: "",
  centerLatitude: "",
  centerLongitude: "",
  radiusKm: "",
  status: "ACTIVE"
};

function zoneToForm(zone) {
  return {
    name: zone.name || "",
    city: zone.city || "",
    description: zone.description || "",
    centerLatitude: zone.center_latitude ?? "",
    centerLongitude: zone.center_longitude ?? "",
    radiusKm: zone.radius_km ?? "",
    status: zone.status || "ACTIVE"
  };
}

export function ZonesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [editingZone, setEditingZone] = useState(null);

  const query = useQuery({
    queryKey: ["zones", statusFilter],
    queryFn: () => zonesApi.list({ limit: 100, status: statusFilter || undefined })
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues
  });

  useEffect(() => {
    form.reset(editingZone ? zoneToForm(editingZone) : defaultValues);
  }, [editingZone, form]);

  const saveMutation = useMutation({
    mutationFn: (values) => (editingZone ? zonesApi.update(editingZone.id, values) : zonesApi.create(values)),
    onSuccess: () => {
      form.reset(defaultValues);
      setEditingZone(null);
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      Swal.fire({
        icon: "success",
        title: editingZone ? "Zona actualizada" : "Zona creada",
        confirmButtonColor: "#0f766e"
      });
    },
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  const statusMutation = useMutation({
    mutationFn: ({ zoneId, status }) => zonesApi.updateStatus(zoneId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["zones"] }),
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  const deleteMutation = useMutation({
    mutationFn: zonesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["zones"] }),
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  async function changeStatus(zone, status) {
    const result = await Swal.fire({
      icon: "question",
      title: `Cambiar estado a ${zoneStatusLabels[status]}`,
      text: zone.name,
      showCancelButton: true,
      confirmButtonColor: "#0f766e",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      statusMutation.mutate({ zoneId: zone.id, status });
    }
  }

  async function deleteZone(zone) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Eliminar zona",
      text: zone.name,
      showCancelButton: true,
      confirmButtonColor: "#b45309",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      deleteMutation.mutate(zone.id);
    }
  }

  if (query.isLoading) return <Loader />;

  return (
    <>
      <PageHeader title="Zonas" description="Cobertura operativa de la asociacion." />

      <section className="mb-5 rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">{editingZone ? "Editar zona" : "Registrar zona"}</h2>
            <p className="text-sm text-neutral-600">Define centro geografico y radio de cobertura.</p>
          </div>
          {editingZone ? (
            <button className="h-10 rounded-lg border border-line px-3 text-sm font-medium" type="button" onClick={() => setEditingZone(null)}>
              Cancelar edicion
            </button>
          ) : null}
        </div>

        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <Field label="Nombre" error={form.formState.errors.name?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("name")} />
          </Field>
          <Field label="Ciudad" error={form.formState.errors.city?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("city")} />
          </Field>
          <Field label="Descripcion" error={form.formState.errors.description?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("description")} />
          </Field>
          <Field label="Latitud centro" error={form.formState.errors.centerLatitude?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" type="number" step="0.000001" {...form.register("centerLatitude")} />
          </Field>
          <Field label="Longitud centro" error={form.formState.errors.centerLongitude?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" type="number" step="0.000001" {...form.register("centerLongitude")} />
          </Field>
          <Field label="Radio km" error={form.formState.errors.radiusKm?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" type="number" step="0.1" {...form.register("radiusKm")} />
          </Field>
          <Field label="Estado" error={form.formState.errors.status?.message}>
            <select className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("status")}>
              {zoneStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button className="h-10 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando" : editingZone ? "Guardar cambios" : "Crear zona"}
            </button>
          </div>
        </form>
      </section>

      <DataTable
        rows={query.data || []}
        searchPlaceholder="Buscar por zona, ciudad o descripcion"
        actions={
          <select className="h-10 rounded-lg border border-line px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            {zoneStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        }
        columns={[
          { header: "Nombre", accessor: "name" },
          { header: "Ciudad", accessor: "city" },
          { header: "Descripcion", accessor: "description" },
          { header: "Latitud", accessor: "center_latitude" },
          { header: "Longitud", accessor: "center_longitude" },
          { header: "Radio", accessor: (row) => `${row.radius_km} km` },
          { header: "Estado", accessor: (row) => zoneStatusLabels[row.status] || row.status },
          {
            header: "Acciones",
            accessor: "id",
            cell: (row) => (
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => setEditingZone(row)}>
                  Editar
                </button>
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => changeStatus(row, "ACTIVE")}>
                  Activar
                </button>
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => changeStatus(row, "INACTIVE")}>
                  Inactivar
                </button>
                <button className="rounded-lg border border-line px-3 py-1 text-accent" type="button" onClick={() => deleteZone(row)}>
                  Eliminar
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
