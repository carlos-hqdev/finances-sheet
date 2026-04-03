import { AccountForm, AccountList } from "@/features/accounts";
import { DashboardLayout } from "@/shared/components/layout";

export default function AccountsPage() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Contas
          </h2>
          <p className="text-muted-foreground">
            Gerencie seus saldos e contas bancárias.
          </p>
        </div>
        <AccountForm />
      </div>

      <AccountList />
    </DashboardLayout>
  );
}
