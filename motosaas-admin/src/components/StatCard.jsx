export function StatCard({ label, value, hint }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold text-ink">{value ?? "-"}</p>
      {hint ? <p className="mt-1 text-sm text-neutral-500">{hint}</p> : null}
    </section>
  );
}
