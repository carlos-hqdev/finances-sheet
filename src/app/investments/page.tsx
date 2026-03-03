import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InvestmentActions } from "@/features/investments/components/investment-actions";
import { InvestmentDialog } from "@/features/investments/components/investment-dialog";
import { prisma } from "@/shared/lib/db";
import { DashboardLayout } from "@/shared/widgets/dashboard-overview/dashboard-layout";

export default async function InvestmentsPage() {
  const investmentsRaw = await prisma.investment.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const investments = investmentsRaw.map((inv) => ({
    ...inv,
    balance: inv.balance.toNumber(),
    yieldRate: inv.yieldRate ? inv.yieldRate.toNumber() : null,
  }));

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {investments.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            Você ainda não possui investimentos cadastrados.
          </div>
        ) : (
          investments.map((inv) => (
            <div
              key={inv.id}
              className="relative rounded-lg border border-border bg-card p-6 hover:bg-accent transition-colors"
            >
              <InvestmentActions investment={inv} />
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
              <div className="mt-4">
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
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
