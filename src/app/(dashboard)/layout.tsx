import { AdminLayoutWrapper } from "@/shared/components/layout";

export const dynamic = "force-dynamic";
export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}
