import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForwarderList } from "@/components/forwarders/forwarder-list";
import { PageHeader } from "@/components/layout/page-header";
import {
  getOrganizationCounts,
  getOrganizations,
} from "@/lib/actions/organizations";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function ForwardersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { permissions } = await requirePermission(locale, "forwarders", "read");
  const t = await getTranslations("nav");

  const { data: forwarders } = await getOrganizations();
  const orgs = forwarders ?? [];

  const countsEntries = await Promise.all(
    orgs.map(async (org) => {
      const counts = await getOrganizationCounts(org.id as string);
      return [org.id as string, counts] as const;
    }),
  );
  const counts = Object.fromEntries(countsEntries);

  const canCreate = permissions.forwarders.create;

  return (
    <div className="space-y-6">
      <PageHeader title={t("forwarders")}>
        {canCreate && (
          <Link
            href={`/${locale}/forwarders/new`}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo Freight Forwarder
          </Link>
        )}
      </PageHeader>
      <ForwarderList forwarders={orgs} counts={counts} />
    </div>
  );
}
