"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { createAirlineReservation } from "@/lib/actions/manifests";

export function ReservationCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [show, setShow] = useState(false);
  const [airline, setAirline] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [numbers, setNumbers] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    if (!airline.trim() || !weekStart || !weekEnd || !numbers.trim()) {
      setError("Complete todos los campos requeridos");
      return;
    }

    const numberList = numbers.split(/[,\n]+/).map((n) => n.trim()).filter(Boolean);
    if (!numberList.length) {
      setError("Ingrese al menos un número MAWB");
      return;
    }

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("airline", airline.trim());
      fd.set("week_start", weekStart);
      fd.set("week_end", weekEnd);
      fd.set("reserved_mawb_numbers", JSON.stringify(numberList));
      if (notes) fd.set("notes", notes);

      const result = await createAirlineReservation(fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        setShow(false);
        setAirline("");
        setWeekStart("");
        setWeekEnd("");
        setNumbers("");
        setNotes("");
        router.refresh();
      }
    });
  }, [airline, weekStart, weekEnd, numbers, notes, router]);

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Nueva Reservación
      </button>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold">Nueva Reservación de Aerolínea</h3>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-700">Aerolínea</label>
          <input
            type="text"
            value={airline}
            onChange={(e) => setAirline(e.target.value)}
            placeholder="e.g. LATAM, Avianca"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Números MAWB reservados</label>
          <input
            type="text"
            value={numbers}
            onChange={(e) => setNumbers(e.target.value)}
            placeholder="906-1320, 906-1321 (separar con comas)"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Inicio de semana</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Fin de semana</label>
          <input
            type="date"
            value={weekEnd}
            onChange={(e) => setWeekEnd(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">Notas (opcional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
        <button
          onClick={() => setShow(false)}
          className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
