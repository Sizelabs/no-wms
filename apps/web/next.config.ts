import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
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
    { source: "/:locale/tariffs/handling-costs/:path*", destination: "/:locale/settings/handling-costs/:path*", permanent: true },
    { source: "/:locale/tariffs/handling-costs", destination: "/:locale/settings/handling-costs", permanent: true },
    { source: "/:locale/tariffs/modalities/:path*", destination: "/:locale/settings/modalities/:path*", permanent: true },
    { source: "/:locale/tariffs/modalities", destination: "/:locale/settings/modalities", permanent: true },
  ],
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "sizelabs-5g",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
