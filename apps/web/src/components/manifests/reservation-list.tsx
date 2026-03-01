"use client";

interface Reservation {
  id: string;
  airline: string;
  reserved_mawb_numbers: string[];
  week_start: string;
  week_end: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface ReservationListProps {
  data: Reservation[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  used: "bg-gray-100 text-gray-800",
  expired: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  used: "Usada",
  expired: "Expirada",
};

export function ReservationList({ data }: ReservationListProps) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Aerolínea</th>
            <th className="px-4 py-3">Números Reservados</th>
            <th className="px-4 py-3">Semana</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Notas</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 text-xs">{r.airline}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {r.reserved_mawb_numbers.join(", ")}
              </td>
              <td className="px-4 py-3 text-xs">
                {new Date(r.week_start).toLocaleDateString("es")} —{" "}
                {new Date(r.week_end).toLocaleDateString("es")}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? ""}`}
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">{r.notes ?? "—"}</td>
            </tr>
          ))}
          {!data.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No hay reservaciones
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
