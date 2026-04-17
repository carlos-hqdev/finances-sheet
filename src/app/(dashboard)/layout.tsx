import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserSidebarInfo } from "@/features/dashboard";
import { AdminLayoutWrapper } from "@/shared/components/layout";
import { auth } from "@/shared/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/sign-in");
  }

  const sidebarInfo = await getUserSidebarInfo(session.user.id);

  const user = {
    ...session.user,
    image: session.user.image ?? null,
    displayName: session.user.displayName ?? null,
    cpf: session.user.cpf ?? null,
  };

  return (
    <AdminLayoutWrapper user={user} sidebarInfo={sidebarInfo}>
      {children}
    </AdminLayoutWrapper>
  );
}
