import type { ReactNode } from "react";

import { NotificationProvider } from "@/components/layout/notification";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
