import type { ReactNode } from "react";
import AdminLayoutWrapper from "@/shared/components/layout/admin-layout-wrapper";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Mock user for now until auth is integrated
  const mockUser = {
    id: "mock-id",
    name: "Carlos",
    email: "carlos@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return <AdminLayoutWrapper user={mockUser}>{children}</AdminLayoutWrapper>;
}
