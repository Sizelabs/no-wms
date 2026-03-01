import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { ManifestsTabs } from "@/components/manifests/manifests-tabs";
import {
  getAirlineReservations,
  getMawbs,
  getPickupRequests,
  getSacas,
  getTransferRequests,
} from "@/lib/actions/manifests";

export default async function ManifestsPage() {
  const t = await getTranslations("nav");

  const [mawbsResult, sacasResult, reservationsResult, transfersResult, pickupsResult] =
    await Promise.all([
      getMawbs(),
      getSacas(),
      getAirlineReservations(),
      getTransferRequests(),
      getPickupRequests(),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("manifests")}>
        <div className="flex gap-2">
          <Link
            href="manifests/new-mawb"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + MAWB
          </Link>
          <Link
            href="manifests/new-saca"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + Saca
          </Link>
        </div>
      </PageHeader>
      <ManifestsTabs
        mawbs={mawbsResult.data ?? []}
        sacas={sacasResult.data ?? []}
        reservations={reservationsResult.data ?? []}
        transfers={transfersResult.data ?? []}
        pickups={pickupsResult.data ?? []}
      />
    </div>
  );
}
