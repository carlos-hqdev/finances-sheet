import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionDialog } from "@/features/transactions/components/transaction-dialog";
import { prisma } from "@/shared/lib/db";
import { DashboardLayout } from "@/shared/widgets/dashboard-overview/dashboard-layout";
import { TransactionActions } from "@/features/transactions/components/transaction-actions";

export default async function TransactionsPage() {
  const transactionsRaw = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
    include: { account: true, category: true },
  });

  const transactions = transactionsRaw.map((tx) => ({
    ...tx,
    amount: tx.amount.toNumber(),
    account: {
      ...tx.account,
      balance: tx.account.balance.toNumber(),
    },
  }));

  const accountsRaw = await prisma.account.findMany({
    select: { id: true, name: true, balance: true },
  });

  const accounts = accountsRaw.map(acc => ({
    ...acc,
    balance: acc.balance.toNumber()
  }));

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
  });

  // Fetch credit cards roughly, mapped to account name or create a custom name
  const creditCardsRaw = await prisma.creditCard.findMany({
    include: { account: true },
  });

  const creditCards = creditCardsRaw.map((c) => ({
    id: c.id,
    name: `${c.account.name} (Cartão)`,
    accountId: c.accountId,
  }));

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Transações
          </h2>
          <p className="text-muted-foreground">
            Visualize e gerencie suas receitas e despesas.
          </p>
        </div>
        <TransactionDialog
          accounts={accounts}
          categories={categories}
          creditCards={creditCards}
        />
      </div>

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <table className="w-full text-sm text-left text-muted-foreground">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3">Descrição</th>
              <th className="px-6 py-3">Categoria</th>
              <th className="px-6 py-3">Conta</th>
              <th className="px-6 py-3">Método</th>
              <th className="px-6 py-3 text-right">Valor</th>
              <th className="px-6 py-3 text-center w-[50px]">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-muted-foreground"
                >
                  Nenhuma transação encontrada.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium backdrop-blur-sm">
                    {format(tx.date, "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 text-foreground">
                    {tx.description}
                  </td>
                  <td className="px-6 py-4">
                    {tx.category?.name ? (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
                        {tx.category.name}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {tx.account.name}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {tx.paymentMethod
                      ? tx.paymentMethod.replace(/_/g, " ")
                      : "-"}
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-semibold ${tx.type === "EXPENSE" ? "text-red-500 dark:text-red-400" : "text-emerald-500 dark:text-emerald-400"}`}
                  >
                    {tx.type === "EXPENSE" ? "-" : "+"}
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Number(tx.amount))}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <TransactionActions
                      transaction={tx}
                      accounts={accounts}
                      categories={categories}
                      creditCards={creditCards}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
