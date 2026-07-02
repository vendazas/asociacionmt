import Swal from "sweetalert2";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { associationsApi } from "../../api/resources";
import { DataTable } from "../../components/DataTable";
import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";
import { getApiError } from "../../utils/errors";

const statuses = [
  { value: "ACTIVE", label: "ACTIVA" },
  { value: "LIMITED", label: "LIMITADA" },
  { value: "SUSPENDED", label: "SUSPENDIDA" }
];

const statusLabels = {
  ACTIVE: "ACTIVA",
  LIMITED: "LIMITADA",
  SUSPENDED: "SUSPENDIDA"
};

const optionalLimit = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().min(0).optional()
);

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  representativeName: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, "Email invalido"),
  city: z.string().min(2),
  address: z.string().optional(),
  country: z.string().min(2).default("BO"),
  driverLimit: optionalLimit,
  vehicleLimit: optionalLimit,
  status: z.enum(["ACTIVE", "LIMITED", "SUSPENDED"]),
  observation: z.string().optional()
});

const defaultValues = {
  name: "",
  slug: "",
  representativeName: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  country: "BO",
  driverLimit: "",
  vehicleLimit: "",
  status: "ACTIVE",
  observation: ""
};

function associationToForm(association) {
  return {
    name: association.name || "",
    slug: association.slug || "",
    representativeName: association.representative_name || "",
    phone: association.phone || "",
    email: association.email || "",
    city: association.city || "",
    address: association.address || "",
    country: association.country || "BO",
    driverLimit: association.driver_limit ?? "",
    vehicleLimit: association.vehicle_limit ?? "",
    status: association.status || "ACTIVE",
    observation: association.observation || ""
  };
}

function cleanPayload(values) {
  return {
    ...values,
    driverLimit: values.driverLimit === "" ? null : values.driverLimit,
    vehicleLimit: values.vehicleLimit === "" ? null : values.vehicleLimit
  };
}

export function AssociationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [editingAssociation, setEditingAssociation] = useState(null);
  const [detailAssociationId, setDetailAssociationId] = useState(null);

  const query = useQuery({
    queryKey: ["associations", statusFilter],
    queryFn: () => associationsApi.list({ limit: 100, status: statusFilter || undefined })
  });

  const detailQuery = useQuery({
    queryKey: ["association-detail", detailAssociationId],
    queryFn: () => associationsApi.detail(detailAssociationId),
    enabled: Boolean(detailAssociationId)
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues
  });

  useEffect(() => {
    if (editingAssociation) {
      form.reset(associationToForm(editingAssociation));
    } else {
      form.reset(defaultValues);
    }
  }, [editingAssociation, form]);

  const saveMutation = useMutation({
    mutationFn: (values) => {
      const payload = cleanPayload(values);
      if (editingAssociation) {
        return associationsApi.update(editingAssociation.association_id, payload);
      }

      return associationsApi.create(payload);
    },
    onSuccess: () => {
      form.reset(defaultValues);
      setEditingAssociation(null);
      queryClient.invalidateQueries({ queryKey: ["associations"] });
      Swal.fire({
        icon: "success",
        title: editingAssociation ? "Asociacion actualizada" : "Asociacion creada",
        confirmButtonColor: "#0f766e"
      });
    },
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  const statusMutation = useMutation({
    mutationFn: ({ associationId, status }) => associationsApi.updateStatus(associationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["associations"] });
      if (detailAssociationId) {
        queryClient.invalidateQueries({ queryKey: ["association-detail", detailAssociationId] });
      }
    },
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  async function changeStatus(row, status) {
    const result = await Swal.fire({
      icon: "question",
      title: `Cambiar estado a ${statusLabels[status]}`,
      text: row.name,
      showCancelButton: true,
      confirmButtonColor: "#0f766e",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      statusMutation.mutate({ associationId: row.association_id, status });
    }
  }

  const rows = query.data?.items || [];

  return (
    <>
      <PageHeader
        title="Asociaciones"
        description="Administracion de asociaciones, limites y estado operativo."
      />

      <section className="mb-5 rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">
              {editingAssociation ? "Editar asociacion" : "Registrar asociacion"}
            </h2>
            <p className="text-sm text-neutral-600">Define datos de contacto, limites y estado.</p>
          </div>
          {editingAssociation ? (
            <button
              className="h-10 rounded-lg border border-line px-3 text-sm font-medium text-neutral-700"
              type="button"
              onClick={() => setEditingAssociation(null)}
            >
              Cancelar edicion
            </button>
          ) : null}
        </div>

        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <Field label="Nombre" error={form.formState.errors.name?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("name")} />
          </Field>
          <Field label="Slug" error={form.formState.errors.slug?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("slug")} />
          </Field>
          <Field label="Representante" error={form.formState.errors.representativeName?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("representativeName")} />
          </Field>
          <Field label="Telefono" error={form.formState.errors.phone?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("phone")} />
          </Field>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" type="email" {...form.register("email")} />
          </Field>
          <Field label="Ciudad" error={form.formState.errors.city?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("city")} />
          </Field>
          <Field label="Direccion" error={form.formState.errors.address?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("address")} />
          </Field>
          <Field label="Pais" error={form.formState.errors.country?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("country")} />
          </Field>
          <Field label="Limite mototaxistas" error={form.formState.errors.driverLimit?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" min="0" type="number" {...form.register("driverLimit")} />
          </Field>
          <Field label="Limite vehiculos" error={form.formState.errors.vehicleLimit?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" min="0" type="number" {...form.register("vehicleLimit")} />
          </Field>
          <Field label="Estado" error={form.formState.errors.status?.message}>
            <select className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("status")}>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Observacion" error={form.formState.errors.observation?.message}>
            <input className="mt-1 h-10 w-full rounded-lg border border-line px-3" {...form.register("observation")} />
          </Field>

          <div className="flex items-end">
            <button
              className="h-10 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Guardando" : editingAssociation ? "Guardar cambios" : "Crear asociacion"}
            </button>
          </div>
        </form>
      </section>

      {query.isLoading ? (
        <Loader />
      ) : (
        <DataTable
          rows={rows}
          pageSize={8}
          searchPlaceholder="Buscar por nombre, slug, ciudad, representante"
          actions={
            <select
              className="h-10 rounded-lg border border-line px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Todos los estados</option>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          }
          columns={[
            { header: "Nombre", accessor: "name" },
            { header: "Representante", accessor: "representative_name" },
            { header: "Ciudad", accessor: "city" },
            { header: "Estado", accessor: (row) => statusLabels[row.status] || row.status },
            { header: "Mototaxistas", accessor: (row) => `${row.counts?.drivers ?? 0}/${row.driver_limit ?? "-"}` },
            { header: "Vehiculos", accessor: (row) => `${row.counts?.vehicles ?? 0}/${row.vehicle_limit ?? "-"}` },
            { header: "Viajes", accessor: (row) => row.counts?.trips ?? 0 },
            { header: "Alta", accessor: (row) => (row.created_at ? new Date(row.created_at).toLocaleDateString() : "-") },
            {
              header: "Acciones",
              accessor: "association_id",
              cell: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => setDetailAssociationId(row.association_id)}>
                    Ver
                  </button>
                  <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => setEditingAssociation(row)}>
                    Editar
                  </button>
                  <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => changeStatus(row, "ACTIVE")}>
                    Activar
                  </button>
                  <button className="rounded-lg border border-line px-3 py-1" type="button" onClick={() => changeStatus(row, "LIMITED")}>
                    Limitar
                  </button>
                  <button className="rounded-lg border border-line px-3 py-1 text-accent" type="button" onClick={() => changeStatus(row, "SUSPENDED")}>
                    Suspender
                  </button>
                </div>
              )
            }
          ]}
        />
      )}

      {detailAssociationId ? (
        <AssociationDetailModal
          association={detailQuery.data}
          isLoading={detailQuery.isLoading}
          onClose={() => setDetailAssociationId(null)}
          onEdit={(association) => {
            setEditingAssociation(association);
            setDetailAssociationId(null);
          }}
        />
      ) : null}
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

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-normal text-neutral-500">{label}</p>
      <p className="mt-1 text-sm text-neutral-800">{value || "-"}</p>
    </div>
  );
}

function AssociationDetailModal({ association, isLoading, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-panel">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">Detalle de asociacion</h2>
            <p className="text-sm text-neutral-600">{association?.name || "Cargando"}</p>
          </div>
          <button className="h-9 rounded-lg border border-line px-3 text-sm" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {isLoading ? (
          <Loader />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <DetailRow label="Nombre" value={association?.name} />
              <DetailRow label="Slug" value={association?.slug} />
              <DetailRow label="Estado" value={statusLabels[association?.status] || association?.status} />
              <DetailRow label="Representante" value={association?.representative_name} />
              <DetailRow label="Telefono" value={association?.phone} />
              <DetailRow label="Email" value={association?.email} />
              <DetailRow label="Ciudad" value={association?.city} />
              <DetailRow label="Direccion" value={association?.address} />
              <DetailRow label="Pais" value={association?.country} />
              <DetailRow label="Mototaxistas" value={`${association?.counts?.drivers ?? 0}/${association?.driver_limit ?? "-"}`} />
              <DetailRow label="Vehiculos" value={`${association?.counts?.vehicles ?? 0}/${association?.vehicle_limit ?? "-"}`} />
              <DetailRow label="Viajes" value={association?.counts?.trips ?? 0} />
              <DetailRow label="Fecha de alta" value={association?.created_at ? new Date(association.created_at).toLocaleString() : "-"} />
              <DetailRow label="Observacion" value={association?.observation} />
            </div>

            <div className="mt-5 flex justify-end">
              <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => onEdit(association)}>
                Editar asociacion
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
