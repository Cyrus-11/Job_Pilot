import type { ReactElement } from "react";

import { PendingPage } from "@/components/layout/PendingPage";

export default function DashboardPage(): ReactElement {
  return <PendingPage title="Dashboard" message="You're signed in. Your job search dashboard is not available yet." />;
}
