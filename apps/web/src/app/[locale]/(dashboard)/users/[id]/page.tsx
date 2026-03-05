import { ROLE_LABELS } from "@no-wms/shared/constants/roles";
import type { Role } from "@no-wms/shared/constants/roles";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { DtDd, InfoCard, Section } from "@/components/ui/detail-page";
import { UserDetailActions } from "@/components/users/user-detail-actions";
import { getUser } from "@/lib/actions/users";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const { data: user, error } = await getUser(id);

  if (error || !user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={user.full_name}>
        <Link
          href={`/${locale}/users`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Volver a usuarios
        </Link>
        <UserDetailActions
          userId={user.id}
          isActive={user.is_active}
        />
      </PageHeader>

      {/* Key info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Nombre">
          {user.full_name}
        </InfoCard>
        <InfoCard label="Email">
          <span className="text-sm">{user.email ?? "—"}</span>
        </InfoCard>
        <InfoCard label="Estado">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              user.is_active
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {user.is_active ? "Activo" : "Inactivo"}
          </span>
        </InfoCard>
        <InfoCard label="Roles">
          <div className="flex flex-wrap gap-1">
            {user.user_roles?.map(
              (r: { id: string; role: string }) => (
                <span
                  key={r.id}
                  className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                >
                  {ROLE_LABELS[r.role as Role] ?? r.role}
                </span>
              ),
            )}
          </div>
        </InfoCard>
      </div>

      {/* Details grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <Section title="Perfil">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <DtDd label="Nombre completo" value={user.full_name} />
              <DtDd label="Teléfono" value={user.phone ?? "—"} />
              <DtDd
                label="Estado"
                value={user.is_active ? "Activo" : "Inactivo"}
              />
              <DtDd
                label="Registrado"
                value={new Date(user.created_at).toLocaleDateString("es")}
              />
            </dl>
          </Section>
        </div>

        {/* Right column: roles */}
        <div className="space-y-6">
          <Section title={`Roles asignados (${user.user_roles?.length ?? 0})`}>
            {user.user_roles?.length ? (
              <div className="space-y-2">
                {user.user_roles.map(
                  (r: {
                    id: string;
                    role: string;
                    warehouse_id: string | null;
                    destination_id: string | null;
                    agency_id: string | null;
                  }) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-md border p-2 text-sm"
                    >
                      <span className="font-medium text-gray-900">
                        {ROLE_LABELS[r.role as Role] ?? r.role}
                      </span>
                      <div className="flex gap-2 text-xs text-gray-500">
                        {r.warehouse_id && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                            Bodega
                          </span>
                        )}
                        {r.destination_id && (
                          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">
                            Destino
                          </span>
                        )}
                        {r.agency_id && (
                          <span className="rounded bg-orange-50 px-1.5 py-0.5 text-orange-700">
                            Agencia
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin roles asignados</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
