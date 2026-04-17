import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ImportTransactionsDialog,
  TransactionActions,
  TransactionDialog,
  TransactionIsPaidSwitch,
  TransactionsTable,
} from "@/features/transactions";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/db";

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
        <div className="flex items-center gap-2">
          <ImportTransactionsDialog
            accounts={accounts}
            categories={categories}
          />
          <TransactionDialog
            accounts={accounts}
            categories={categories}
            creditCards={creditCards}
            investments={investments}
          />
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg bg-card">
          Nenhuma transação encontrada.
        </div>
      ) : (
        <TransactionsTable
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          creditCards={creditCards}
          investments={investments}
        />
      )}
    </>
  );
}
