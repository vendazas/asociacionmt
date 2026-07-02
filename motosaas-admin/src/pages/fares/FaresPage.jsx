import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { faresApi } from "../../api/resources";
import { DataTable } from "../../components/DataTable";
import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";
import { getApiError } from "../../utils/errors";

const fareStatuses = [
  { value: "ACTIVE", label: "ACTIVA" },
  { value: "INACTIVE", label: "INACTIVA" }
];

const fareStatusLabels = Object.fromEntries(fareStatuses.map((status) => [status.value, status.label]));

const schema = z.object({
  name: z.string().min(2),
  baseFare: z.coerce.number().min(0),
  minimumFare: z.coerce.number().min(0),
  perKilometerFare: z.coerce.number().min(0),
  nightSurcharge: z.coerce.number().min(0),
  waitingPerMinuteFare: z.coerce.number().min(0),
  associationCommissionPercent: z.coerce.number().min(0).max(100),
  platformCommissionPercent: z.coerce.number().min(0).max(100),
  maxDriverSearchRadiusKm: z.coerce.number().min(0.1),
  nightStartHour: z.coerce.number().int().min(0).max(23),
  nightEndHour: z.coerce.number().int().min(0).max(23),
  status: z.enum(["ACTIVE", "INACTIVE"])
});

const defaultValues = {
  name: "Tarifa principal",
  baseFare: 5,
  minimumFare: 8,
  perKilometerFare: 2.5,
  nightSurcharge: 3,
  waitingPerMinuteFare: 0.5,
  associationCommissionPercent: 8,
  platformCommissionPercent: 5,
  maxDriverSearchRadiusKm: 5,
  nightStartHour: 22,
  nightEndHour: 6,
  status: "ACTIVE"
};

function fareToForm(fare) {
  return {
    name: fare.name || "Tarifa principal",
    baseFare: fare.base_fare ?? 0,
    minimumFare: fare.minimum_fare ?? 0,
    perKilometerFare: fare.per_kilometer_fare ?? 0,
    nightSurcharge: fare.night_surcharge ?? 0,
    waitingPerMinuteFare: fare.waiting_per_minute_fare ?? 0,
    associationCommissionPercent: fare.association_commission_percent ?? 0,
    platformCommissionPercent: fare.platform_commission_percent ?? 0,
    maxDriverSearchRadiusKm: fare.max_driver_search_radius_km ?? 5,
    nightStartHour: fare.night_start_hour ?? 22,
    nightEndHour: fare.night_end_hour ?? 6,
    status: fare.status || "ACTIVE"
  };
}

const fields = [
  ["name", "Nombre", "text", "1"],
  ["baseFare", "Tarifa base", "number", "0.01"],
  ["minimumFare", "Tarifa minima", "number", "0.01"],
  ["perKilometerFare", "Por kilometro", "number", "0.01"],
  ["nightSurcharge", "Tarifa nocturna", "number", "0.01"],
  ["waitingPerMinuteFare", "Por espera/min", "number", "0.01"],
  ["associationCommissionPercent", "Comision asociacion %", "number", "0.01"],
  ["platformCommissionPercent", "Comision plataforma %", "number", "0.01"],
  ["maxDriverSearchRadiusKm", "Radio busqueda km", "number", "0.1"],
  ["nightStartHour", "Inicio noche", "number", "1"],
  ["nightEndHour", "Fin noche", "number", "1"]
];

export function FaresPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [editingFare, setEditingFare] = useState(null);

  const query = useQuery({
    queryKey: ["fares", statusFilter],
    queryFn: () => faresApi.list({ limit: 100, status: statusFilter || undefined })
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues
  });

  const activeFare = useMemo(() => (query.data || []).find((fare) => fare.status === "ACTIVE"), [query.data]);

  useEffect(() => {
    form.reset(editingFare ? fareToForm(editingFare) : defaultValues);
  }, [editingFare, form]);

  const saveMutation = useMutation({
    mutationFn: (values) => (editingFare ? faresApi.update(editingFare.id, values) : faresApi.create(values)),
    onSuccess: () => {
      form.reset(defaultValues);
      setEditingFare(null);
      queryClient.invalidateQueries({ queryKey: ["fares"] });
      Swal.fire({
        icon: "success",
        title: editingFare ? "Tarifa actualizada" : "Tarifa creada",
        confirmButtonColor: "#0f766e"
      });
    },
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  const statusMutation = useMutation({
    mutationFn: ({ fareId, status }) => faresApi.updateStatus(fareId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fares"] }),
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  const deleteMutation = useMutation({
    mutationFn: faresApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fares"] }),
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  async function changeStatus(fare, status) {
    const result = await Swal.fire({
      icon: "question",
      title: `Cambiar estado a ${fareStatusLabels[status]}`,
      text: fare.name,
      showCancelButton: true,
      confirmButtonColor: "#0f766e",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      statusMutation.mutate({ fareId: fare.id, status });
    }
  }

  async function deleteFare(fare) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Eliminar tarifa",
      text: fare.name,
      showCancelButton: true,
      confirmButtonColor: "#b45309",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      deleteMutation.mutate(fare.id);
    }
  }

  if (query.isLoading) return <Loader />;

  return (
    <>
      <PageHeader title="Tarifas" description="Configuracion economica propia de la asociacion." />

      <section className="mb-5 rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">{editingFare ? "Editar tarifa" : "Registrar tarifa"}</h2>
            <p className="text-sm text-neutral-600">
              {activeFare ? `Activa: ${activeFare.name} - radio ${activeFare.max_driver_search_radius_km} km` : "No hay tarifa activa configurada."}
            </p>
          </div>
          {editingFare ? (
            <button className="h-10 rounded-lg border border-line px-3 text-sm font-medium" type="button" onClick={() => setEditingFare(null)}>
              Cancelar edicion
            </button>
          ) : null}
        </div>

        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          {fields.map(([name, label, type, step]) => (
            <Field key={name} label={label} error={form.formState.errors[name]?.message}>
              <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" type={type} step={step} {...form.register(name)} />
            </Field>
          ))}
          <Field label="Estado" error={form.formState.errors.status?.message}>
            <select className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("status")}>
              {fareStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button className="h-10 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando" : editingFare ? "Guardar cambios" : "Crear tarifa"}
            </button>
          </div>
        </form>
      </section>

      <DataTable
        rows={query.data || []}
        searchPlaceholder="Buscar tarifa"
        actions={
          <select className="h-10 rounded-lg border border-line px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            {fareStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        }
        columns={[
          { header: "Nombre", accessor: "name" },
          { header: "Base", accessor: (row) => `Bs ${row.base_fare}` },
          { header: "Minima", accessor: (row) => `Bs ${row.minimum_fare}` },
          { header: "Km", accessor: (row) => `Bs ${row.per_kilometer_fare}` },
          { header: "Noche", accessor: (row) => `Bs ${row.night_surcharge}` },
          { header: "Espera", accessor: (row) => `Bs ${row.waiting_per_minute_fare}` },
          { header: "Radio", accessor: (row) => `${row.max_driver_search_radius_km} km` },
          { header: "Estado", accessor: (row) => fareStatusLabels[row.status] || row.status },
          {
            header: "Acciones",
            accessor: "id",
            cell: (row) => (
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => setEditingFare(row)}>
                  Editar
                </button>
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => changeStatus(row, "ACTIVE")}>
                  Activar
                </button>
                <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => changeStatus(row, "INACTIVE")}>
                  Inactivar
                </button>
                <button className="rounded-lg border border-line px-3 py-1 text-accent" type="button" onClick={() => deleteFare(row)}>
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
