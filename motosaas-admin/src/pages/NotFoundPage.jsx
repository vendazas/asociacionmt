import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 p-6 text-ink">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 text-center shadow-panel">
        <h1 className="text-xl font-semibold">Ruta no encontrada</h1>
        <Link className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white" to="/">
          Volver
        </Link>
      </section>
    </main>
  );
}
