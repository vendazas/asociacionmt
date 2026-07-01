import { useMemo, useState } from "react";

function getValue(row, accessor) {
  if (typeof accessor === "function") {
    return accessor(row);
  }

  return String(accessor)
    .split(".")
    .reduce((value, key) => value?.[key], row);
}

export function DataTable({ columns, rows = [], searchPlaceholder = "Buscar", pageSize = 8, actions }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return rows;
    }

    return rows.filter((row) =>
      columns.some((column) => {
        const value = getValue(row, column.accessor);
        return String(value ?? "").toLowerCase().includes(term);
      })
    );
  }, [columns, rows, search]);

  const pageCount = Math.max(Math.ceil(filteredRows.length / pageSize), 1);
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = filteredRows.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  return (
    <section className="rounded-lg border border-line bg-white">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-teal-100 sm:max-w-xs"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          placeholder={searchPlaceholder}
        />
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-normal text-neutral-500">
            <tr>
              {columns.map((column) => (
                <th className="px-4 py-3" key={column.header}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visibleRows.map((row, index) => (
              <tr className="align-top hover:bg-stone-50" key={row.id || row.association_id || index}>
                {columns.map((column) => (
                  <td className="px-4 py-3 text-neutral-700" key={column.header}>
                    {column.cell ? column.cell(row) : String(getValue(row, column.accessor) ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-neutral-600">
        <span>
          {filteredRows.length} registros · pagina {currentPage + 1} de {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            className="h-9 rounded-lg border border-line px-3 disabled:opacity-50"
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage((value) => Math.max(value - 1, 0))}
          >
            Anterior
          </button>
          <button
            className="h-9 rounded-lg border border-line px-3 disabled:opacity-50"
            type="button"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage((value) => Math.min(value + 1, pageCount - 1))}
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}
