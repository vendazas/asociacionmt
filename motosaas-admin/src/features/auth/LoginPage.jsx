import Swal from "sweetalert2";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { loginSchema } from "./auth.schema";
import { useAuth } from "./useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      associationSlug: "platform",
      email: "admin@motosaas.local",
      password: "ChangeMe123!"
    }
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => navigate("/", { replace: true }),
    onError: (error) => {
      Swal.fire({
        icon: "error",
        title: "No se pudo iniciar sesion",
        text: error.response?.data?.error?.message || "Verifica las credenciales.",
        confirmButtonColor: "#0f766e"
      });
    }
  });

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-normal text-brand">MotoSaaS</p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-normal sm:text-5xl">
            Panel administrativo
          </h1>
          <p className="max-w-lg text-base leading-7 text-neutral-600">
            Acceso seguro por asociacion para operar la plataforma desde la API REST.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-white p-6 shadow-panel sm:p-8">
          <h2 className="text-xl font-semibold">Ingresar</h2>
          <form className="mt-6 space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Asociacion</span>
              <input
                className="mt-2 w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-teal-100"
                {...form.register("associationSlug")}
              />
              <FieldError message={form.formState.errors.associationSlug?.message} />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Email</span>
              <input
                className="mt-2 w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-teal-100"
                type="email"
                autoComplete="email"
                {...form.register("email")}
              />
              <FieldError message={form.formState.errors.email?.message} />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Password</span>
              <input
                className="mt-2 w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-teal-100"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              <FieldError message={form.formState.errors.password?.message} />
            </label>

            <button
              className="h-11 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Ingresando" : "Ingresar"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-sm text-accent">{message}</p>;
}
