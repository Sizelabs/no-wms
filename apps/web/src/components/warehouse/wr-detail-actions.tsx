"use client";

import Link from "next/link";
import { useRef, useState } from "react";

interface WrDetailActionsProps {
  wrId: string;
  locale: string;
  backHref: string;
}

export function WrDetailActions({ wrId, locale, backHref }: WrDetailActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="flex items-center gap-2">
      <Link
        href={backHref}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        Volver
      </Link>
      <Link
        href={`/${locale}/inventory/${wrId}/edit`}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Editar documento
      </Link>
      <button
        type="button"
        onClick={() => window.open(`/${locale}/inventory/${wrId}/print`, "_blank")}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Imprimir WR
      </button>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onBlur={(e) => {
            if (!ref.current?.contains(e.relatedTarget)) {
              setOpen(false);
            }
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Mas acciones
        </button>
        {open && (
          <div className="absolute right-0 z-10 mt-1 w-56 rounded-md border bg-white py-1 shadow-lg">
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Crear Orden de Trabajo
            </button>
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Agregar a instruccion de embarque
            </button>
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Registrar novedad
            </button>
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Ver historial completo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
