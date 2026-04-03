import { AccountForm, AccountList } from "@/features/accounts";

export default function AccountsPage() {
  return (
    <div className="flex flex-col gap-6">
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
    </div>
  );
}
