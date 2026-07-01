import { useEffect } from "react";
import Swal from "sweetalert2";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { faresApi } from "../../api/resources";
import { Loader } from "../../components/Loader";
import { PageHeader } from "../../components/PageHeader";
import { getApiError } from "../../utils/errors";

const schema = z.object({
  baseFare: z.coerce.number().min(0),
  minimumFare: z.coerce.number().min(0),
  perKilometerFare: z.coerce.number().min(0),
  nightSurcharge: z.coerce.number().min(0),
  waitingPerMinuteFare: z.coerce.number().min(0),
  associationCommissionPercent: z.coerce.number().min(0),
  platformCommissionPercent: z.coerce.number().min(0),
  nightStartHour: z.coerce.number().min(0).max(23),
  nightEndHour: z.coerce.number().min(0).max(23)
});

export function FaresPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["fare"], queryFn: faresApi.current });
  const form = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (query.data) {
      form.reset({
        baseFare: query.data.base_fare,
        minimumFare: query.data.minimum_fare,
        perKilometerFare: query.data.per_kilometer_fare,
        nightSurcharge: query.data.night_surcharge,
        waitingPerMinuteFare: query.data.waiting_per_minute_fare,
        associationCommissionPercent: query.data.association_commission_percent,
        platformCommissionPercent: query.data.platform_commission_percent,
        nightStartHour: query.data.night_start_hour,
        nightEndHour: query.data.night_end_hour
      });
    }
  }, [form, query.data]);

  const mutation = useMutation({
    mutationFn: faresApi.updateCurrent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fare"] });
      Swal.fire({ icon: "success", title: "Tarifa actualizada", confirmButtonColor: "#0f766e" });
    },
    onError: (error) => Swal.fire({ icon: "error", title: getApiError(error), confirmButtonColor: "#0f766e" })
  });

  if (query.isLoading) return <Loader />;

  const fields = [
    ["baseFare", "Tarifa base"],
    ["minimumFare", "Tarifa minima"],
    ["perKilometerFare", "Por kilometro"],
    ["nightSurcharge", "Tarifa nocturna"],
    ["waitingPerMinuteFare", "Por espera/min"],
    ["associationCommissionPercent", "Comision asociacion %"],
    ["platformCommissionPercent", "Comision plataforma %"],
    ["nightStartHour", "Inicio noche"],
    ["nightEndHour", "Fin noche"]
  ];

  return (
    <>
      <PageHeader title="Tarifas" description="Configuracion economica propia de la asociacion." />
      <form className="rounded-lg border border-line bg-white p-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <div className="grid gap-4 md:grid-cols-3">
          {fields.map(([name, label]) => (
            <label key={name}>
              <span className="text-sm font-medium text-neutral-700">{label}</span>
              <input className="mt-1 w-full rounded-lg border border-line px-3 py-2" type="number" step="0.01" {...form.register(name)} />
            </label>
          ))}
        </div>
        <button className="mt-5 rounded-lg bg-brand px-4 py-2 font-semibold text-white" type="submit">
          Guardar tarifas
        </button>
      </form>
    </>
  );
}
