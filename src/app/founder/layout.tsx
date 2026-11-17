import React from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export const metadata = {
  title: "Founder Dashboard | BusinessBridge",
  description: "Manage your startup profile, advisory board, and strategic journey.",
};

export default function FounderRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="founder">{children}</DashboardLayout>;
}
