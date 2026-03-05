import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@no-wms/shared"],
  redirects: async () => [
    { source: "/:locale/forwarders/:path*", destination: "/:locale/settings/forwarders/:path*", permanent: true },
    { source: "/:locale/forwarders", destination: "/:locale/settings/forwarders", permanent: true },
    { source: "/:locale/warehouses/:path*", destination: "/:locale/settings/warehouses/:path*", permanent: true },
    { source: "/:locale/warehouses", destination: "/:locale/settings/warehouses", permanent: true },
    { source: "/:locale/couriers/:path*", destination: "/:locale/settings/couriers/:path*", permanent: true },
    { source: "/:locale/couriers", destination: "/:locale/settings/couriers", permanent: true },
    { source: "/:locale/users/:path*", destination: "/:locale/settings/users/:path*", permanent: true },
    { source: "/:locale/users", destination: "/:locale/settings/users", permanent: true },
    { source: "/:locale/tariffs/charge-types/:path*", destination: "/:locale/settings/charge-types/:path*", permanent: true },
    { source: "/:locale/tariffs/charge-types", destination: "/:locale/settings/charge-types", permanent: true },
    { source: "/:locale/tariffs/modalities/:path*", destination: "/:locale/settings/modalities/:path*", permanent: true },
    { source: "/:locale/tariffs/modalities", destination: "/:locale/settings/modalities", permanent: true },
  ],
};

export default withNextIntl(nextConfig);
