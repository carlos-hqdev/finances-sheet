import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TransactionActions,
  TransactionDialog,
  TransactionIsPaidSwitch,
} from "@/features/transactions";
import { prisma } from "@/shared/lib/db";
import { auth } from "@/shared/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const PAYMENT_METHODS_MAP: Record<string, string> = {
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  TRANSFER: "Transferência",
  REDEMPTION: "Resgate",
  APPLICATION: "Aplicação",
  CASH: "Dinheiro",
  PIX: "Pix",
  BOLETO: "Boleto",
  OTHER: "Outros",
};

export default async function TransactionsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/sign-in");
  }

  const userId = session.user.id;

  const transactionsRaw = await prisma.transaction.findMany({
    where: {
      account: {
        userId: userId,
      },
    },
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

  const accountsRaw = await prisma.bankAccount.findMany({
    where: { userId: userId },
    select: { id: true, name: true, balance: true, type: true },
  });

  const accounts = accountsRaw.map((acc) => ({
    ...acc,
    balance: acc.balance.toNumber(),
  }));

  const categories = await prisma.category.findMany({
    where: { userId: userId },
    select: { id: true, name: true },
  });

  // Fetch credit cards roughly, mapped to account name or create a custom name
  const creditCardsRaw = await prisma.creditCard.findMany({
    where: {
      account: {
        userId: userId,
      },
    },
    include: { account: true },
  });

  const creditCards = creditCardsRaw.map((c) => ({
    id: c.id,
    name: `${c.account.name} (Cartão)`,
    accountId: c.accountId,
    limit: c.limit.toNumber(),
  }));

  const investmentsRaw = await prisma.investment.findMany({
    where: { userId: userId },
    select: { id: true, name: true, type: true },
  });

  const investments = investmentsRaw.map((inv) => ({
    id: inv.id,
    name: inv.name,
    type: inv.type,
  }));

  return (
    <>
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
          investments={investments}
        />
      </div>

      {transactions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg bg-card">
          Nenhuma transação encontrada.
        </div>
      ) : (
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
                <th className="px-6 py-3 text-center">Pago</th>
                <th className="px-6 py-3 text-center w-12.5">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
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
                      ? PAYMENT_METHODS_MAP[tx.paymentMethod] ||
                        tx.paymentMethod.replace(/_/g, " ")
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
                    <TransactionIsPaidSwitch
                      transactionId={tx.id}
                      isPaid={tx.isPaid}
                      type={tx.type}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <TransactionActions
                      transaction={tx}
                      accounts={accounts}
                      categories={categories}
                      creditCards={creditCards}
                      investments={investments}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
