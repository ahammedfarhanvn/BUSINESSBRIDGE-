import React from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export const metadata = {
  title: "Mentor Dashboard | BusinessBridge",
  description: "Executive advisory portal, board invitations, and startup milestones.",
};

export default function MentorRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="mentor">{children}</DashboardLayout>;
}
