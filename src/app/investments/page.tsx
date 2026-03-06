import { InvestmentDialog } from "@/features/investments/components/investment-dialog";
import { SavingsList } from "@/features/investments/components/savings-list";
import { prisma } from "@/shared/lib/db";
import { DashboardLayout } from "@/shared/widgets/dashboard-overview/dashboard-layout";
import { Lock } from "lucide-react";

function FutureSection({ title, description, genericName }: { title: string, description: string, genericName: string }) {
  return (
    <div className="opacity-80">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-muted-foreground tracking-tight flex items-center gap-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground/70">{description}</p>
      </div>
      <div className="rounded-lg border border-dashed border-border py-8 flex flex-col items-center justify-center bg-muted/20 text-muted-foreground">
        <Lock className="w-8 h-8 mb-3 opacity-20" />
        <p className="font-medium text-center px-4">Em breve: Controle de {genericName} será liberado na versão 1.1.0</p>
      </div>
    </div>
  );
}

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

  const activeInvestments = investments.filter((inv) => inv.type === "SAVINGS");

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
            <h3 className="text-xl font-semibold tracking-tight">Minhas Caixinhas</h3>
            <p className="text-sm text-muted-foreground">Suas reservas e objetivos</p>
          </div>
          <SavingsList investments={activeInvestments} />
        </div>

        <FutureSection title="Fixas (Tesouro, CDBs longos)" description="Títulos públicos e privados travados até o vencimento." genericName="Fixas" />
        <FutureSection title="Ações (BR)" description="Ações negociadas na B3." genericName="Ações" />
        <FutureSection title="FIIs" description="Fundos Imobiliários e Fiagros." genericName="FIIs" />
        <FutureSection title="Cripto" description="Bitcoin, Ethereum e outras criptomoedas." genericName="Cripto" />
        <FutureSection title="Outros Investimentos" description="Previdência privada, exterior, etc." genericName="Outros Investimentos" />
      </div>
    </DashboardLayout>
  );
}
