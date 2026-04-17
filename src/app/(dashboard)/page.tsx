import { CreditCard, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CashFlowChart,
  DashboardMonthPicker,
  getAggregatedTransactions,
  getAvailableMonths,
  getCurrentMonthTransactions,
  getDashboardBalances,
  getPatrimonyBreakdown,
  getYearlyComparison,
  getYearlyPeriodComparison,
  PatrimonyChart,
  PeriodComparisonAnalysis,
  SummaryCard,
  YearlyComparisonChart,
} from "@/features/dashboard";
import { auth } from "@/shared/lib/auth";

interface PageProps {
  searchParams: Promise<{
    month?: string;
    targetYear?: string;
    baseYear?: string;
    type?: "INCOME" | "EXPENSE";
  }>;
}

export default async function Home({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/sign-in");
  }

  const userId = session.user.id;
  const params = await searchParams;

  const selectedMonth = params.month;
  const targetYear = params.targetYear
    ? parseInt(params.targetYear, 10)
    : new Date().getFullYear();
  const baseYear = params.baseYear
    ? parseInt(params.baseYear, 10)
    : targetYear - 1;
  const analysisType = params.type || "INCOME";

  const [
    { totalBalance, emergencyFund },
    { incomes, expenses },
    cashFlowData,
    patrimonyData,
    yearlyComparison,
    availableMonths,
    periodAnalysisData,
  ] = await Promise.all([
    getDashboardBalances(userId, selectedMonth),
    getCurrentMonthTransactions(userId, selectedMonth),
    getAggregatedTransactions(userId, 12),
    getPatrimonyBreakdown(userId, selectedMonth),
    getYearlyComparison(userId),
    getAvailableMonths(userId),
    getYearlyPeriodComparison(userId, targetYear, baseYear, analysisType),
  ]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  return (
    <>
      {/* Header com Seletor de Mês */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <DashboardMonthPicker
          availableMonths={availableMonths}
          currentMonth={selectedMonth}
        />
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
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
          title="Reserva de Emergência"
          value={formatCurrency(emergencyFund)}
          icon={PiggyBank}
        />
      </div>

      {/* Bento Grid — Gráficos Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2 bg-card rounded-xl border border-border p-6 flex flex-col h-105">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Fluxo de Caixa
          </h3>
          <CashFlowChart data={cashFlowData} />
        </div>

        <div className="bg-card rounded-xl border border-border p-6 flex flex-col h-105">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Distribuição do Patrimônio
          </h3>
          <PatrimonyChart data={patrimonyData} />
        </div>
      </div>

      {/* Comparativo Anual Simples */}
      <div className="grid grid-cols-1 gap-4 mt-4">
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col h-100">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Evolução Mensal (Comparativo Simples)
          </h3>
          <YearlyComparisonChart
            data={yearlyComparison.data}
            years={yearlyComparison.years}
          />
        </div>
      </div>

      {/* Análise por Períodos (Trimestres/Semestres) */}
      <div className="grid grid-cols-1 gap-4 mt-4">
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col min-h-125">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Análise por Períodos Agregados (Trimestres / Semestres)
          </h3>
          <PeriodComparisonAnalysis
            data={periodAnalysisData}
            targetYear={targetYear}
            baseYear={baseYear}
            type={analysisType}
          />
        </div>
      </div>
    </>
  );
}
