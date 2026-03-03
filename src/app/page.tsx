import { CreditCard, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { SummaryCard } from "@/features/dashboard/components/summary-card";
import { DashboardLayout } from "@/shared/widgets/dashboard-overview/dashboard-layout";

export default function Home() {
  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Saldo Total"
          value="R$ 12.450,00"
          icon={Wallet}
          trend={{ value: 2.5, isPositive: true }}
        />
        <SummaryCard
          title="Receitas"
          value="R$ 5.230,00"
          icon={TrendingUp}
          description="+10% vs mês passado"
        />
        <SummaryCard
          title="Despesas"
          value="R$ 3.100,00"
          icon={CreditCard}
          trend={{ value: 5, isPositive: false }}
        />
        <SummaryCard
          title="Investimentos"
          value="R$ 1.000,00"
          icon={DollarSign}
        />
      </div>
      {/* Bento Grid Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2 min-h-[300px] bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Fluxo de Caixa
          </h3>
          {/* Chart placeholder */}
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Gráfico de Fluxo de Caixa (Recharts)
          </div>
        </div>
        <div className="min-h-[300px] bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Gastos por Categoria
          </h3>
          {/* Chart placeholder */}
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Pie Chart
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
