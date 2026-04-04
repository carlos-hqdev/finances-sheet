import { CreditCardActions, CreditCardDialog } from "@/features/credit-cards";
import { prisma } from "@/shared/lib/db";
import { auth } from "@/shared/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function CreditCardsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/sign-in");
  }

  const userId = session.user.id;

  const creditCardsRaw = await prisma.creditCard.findMany({
    where: {
      account: { userId },
    },
    include: { account: true },
  });

  const creditCards = creditCardsRaw.map((card) => ({
    ...card,
    limit: card.limit.toNumber(),
    account: {
      ...card.account,
      balance: card.account.balance.toNumber(),
    },
  }));

  const accountsRaw = await prisma.bankAccount.findMany({
    where: { userId },
    select: { id: true, name: true, balance: true },
  });

  const accounts = accountsRaw.map((acc) => ({
    ...acc,
    balance: acc.balance.toNumber(),
  }));

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Cartões de Crédito
          </h2>
          <p className="text-muted-foreground">
            Gerencie seus cartões e limites.
          </p>
        </div>
        <CreditCardDialog accounts={accounts} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {creditCards.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            Nenhum cartão de crédito cadastrado.
          </div>
        ) : (
          creditCards.map((card) => (
            <div
              key={card.id}
              className="relative overflow-hidden rounded-xl bg-card p-6 shadow-sm border border-border hover:border-sidebar-ring transition-colors"
            >
              <div className="absolute top-0 right-0 p-4">
                <CreditCardActions creditCard={card} accounts={accounts} />
              </div>
              <h3 className="text-lg font-bold text-card-foreground tracking-wide mb-1">
                {card.account.name} Cartão
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Vinculado a: {card.account.name}
              </p>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Limite
                  </p>
                  <p className="text-xl font-semibold text-card-foreground">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Number(card.limit))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Fechamento dia {card.closingDay}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento dia {card.dueDay}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
