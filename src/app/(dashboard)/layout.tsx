import { AdminLayoutWrapper } from "@/shared/components/layout";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}
