import { CreditCard, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { SummaryCard } from "@/features/dashboard/components/summary-card";
import { DashboardLayout } from "@/shared/widgets/dashboard-overview/dashboard-layout";
import { getDashboardBalances, getCurrentMonthTransactions } from "@/features/dashboard/actions";

export default async function Home() {
  const MOCK_USER_ID = "cm4nt3q2v0000abc123456789";

  const { totalBalance, totalInvestments } = await getDashboardBalances(MOCK_USER_ID);
  const { incomes, expenses } = await getCurrentMonthTransactions(MOCK_USER_ID);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <DashboardLayout>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Saldo Total"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
        />
        <SummaryCard
          title="Receitas"
          value={formatCurrency(incomes)}
          icon={TrendingUp}
        />
        <SummaryCard
          title="Despesas"
          value={formatCurrency(expenses)}
          icon={CreditCard}
        />
        <SummaryCard
          title="Investimentos"
          value={formatCurrency(totalInvestments)}
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
