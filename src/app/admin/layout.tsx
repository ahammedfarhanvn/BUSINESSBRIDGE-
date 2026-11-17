import React from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export const metadata = {
  title: "Admin Console | BusinessBridge",
  description: "Platform governance, user management, and mentor verification audits.",
};

export default function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="admin">{children}</DashboardLayout>;
}
