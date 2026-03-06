import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InvestmentActions } from "@/features/investments/components/investment-actions";
import { InvestmentDialog } from "@/features/investments/components/investment-dialog";
import { SavingsList } from "@/features/investments/components/savings-list";
import { prisma } from "@/shared/lib/db";
import { DashboardLayout } from "@/shared/widgets/dashboard-overview/dashboard-layout";

export default async function InvestmentsPage() {
  const investmentsRaw = await prisma.investment.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const investments = investmentsRaw.map((inv) => ({
    id: inv.id,
    name: inv.name,
    type: inv.type,
    institution: inv.institution,
    balance: inv.balance.toNumber(),
    targetAmount: inv.targetAmount ? inv.targetAmount.toNumber() : null,
    amount: inv.amount ? inv.amount.toNumber() : null,
    yieldRate: inv.yieldRate ? inv.yieldRate.toNumber() : null,
    isDailyYield: inv.isDailyYield,
    indexer: inv.indexer,
    updatedAt: inv.updatedAt,
  }));

  const savingsInvestments = investments.filter((inv) => inv.type === "SAVINGS");
  const fixedInvestments = investments.filter((inv) => inv.type === "FIXED");
  const otherInvestments = investments.filter((inv) => inv.type !== "FIXED" && inv.type !== "SAVINGS");

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Investimentos
          </h2>
          <p className="text-muted-foreground">
            Acompanhe seus ativos e atualize os valores mensalmente.
          </p>
        </div>
        <InvestmentDialog />
      </div>

      <div className="space-y-12">
        {/* Seção das Caixinhas */}
        <div>
          <div className="mb-4">
            <h3 className="text-xl font-semibold tracking-tight">Minhas Caixinhas (Liquidez Diária)</h3>
            <p className="text-sm text-muted-foreground">Suas reservas e objetivos de curto prazo</p>
          </div>
          <SavingsList investments={savingsInvestments} />
        </div>

        {/* Seção de Renda Fixa */}
        <div>
          <div className="mb-4">
            <h3 className="text-xl font-semibold tracking-tight">Renda Fixa</h3>
            <p className="text-sm text-muted-foreground">Investimentos para o futuro (Tesouro Direto, CDBs de liquidez no vencimento, etc)</p>
          </div>
          <SavingsList investments={fixedInvestments} />
        </div>

        {/* Seção de Outros Ativos */}
        <div>
          <div className="mb-4">
            <h3 className="text-xl font-semibold tracking-tight">Outros Ativos</h3>
            <p className="text-sm text-muted-foreground">Renda variável, Criptomoedas e outros ativos</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherInvestments.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                Você ainda não possui outros ativos cadastrados.
              </div>
            ) : (
              otherInvestments.map((inv) => (
                <div
                  key={inv.id}
                  className="relative rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors"
                >
                  <InvestmentActions investment={inv} />
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20 mb-2">
                          {inv.type}
                        </span>
                        <h3 className="text-lg font-semibold text-card-foreground">
                          {inv.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {inv.institution || "Instituição não informada"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex-grow flex flex-col justify-end">
                      <p className="text-sm text-muted-foreground">Saldo Atual</p>
                      <p className="text-2xl font-bold text-card-foreground">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(inv.balance))}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Atualizado em{" "}
                        {format(inv.updatedAt, "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
