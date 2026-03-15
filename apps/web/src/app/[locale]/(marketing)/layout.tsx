import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "no-wms | AI-Native WMS for 3PLs & Freight Forwarders",
  description:
    "Next-generation warehouse management system purpose-built for third-party logistics providers and freight forwarders.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
