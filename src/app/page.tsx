import { CreditCard, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { SummaryCard } from "@/features/dashboard/components/summary-card";
import { CashFlowChart } from "@/features/dashboard/components/cash-flow-chart";
import { PatrimonyChart } from "@/features/dashboard/components/patrimony-chart";
import { YearlyComparisonChart } from "@/features/dashboard/components/yearly-comparison-chart";
import { DashboardMonthPicker } from "@/features/dashboard/components/month-picker";
import { PeriodComparisonAnalysis } from "@/features/dashboard/components/period-comparison";
import { DashboardLayout } from "@/shared/widgets/dashboard-overview/dashboard-layout";
import {
  getDashboardBalances,
  getCurrentMonthTransactions,
  getPatrimonyBreakdown,
  getYearlyComparison,
  getAvailableMonths,
  getYearlyPeriodComparison,
} from "@/features/dashboard/actions";
import { getAggregatedTransactions } from "@/features/dashboard/actions/dashboard-actions";

interface PageProps {
  searchParams: Promise<{ 
    month?: string;
    targetYear?: string;
    baseYear?: string;
    type?: "INCOME" | "EXPENSE";
  }>;
}

export default async function Home({ searchParams }: PageProps) {
  const MOCK_USER_ID = "cm4nt3q2v0000abc123456789";
  const params = await searchParams;
  
  const selectedMonth = params.month;
  const targetYear = params.targetYear ? parseInt(params.targetYear) : new Date().getFullYear();
  const baseYear = params.baseYear ? parseInt(params.baseYear) : targetYear - 1;
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
    getDashboardBalances(MOCK_USER_ID, selectedMonth),
    getCurrentMonthTransactions(MOCK_USER_ID, selectedMonth),
    getAggregatedTransactions(12),
    getPatrimonyBreakdown(MOCK_USER_ID, selectedMonth),
    getYearlyComparison(MOCK_USER_ID),
    getAvailableMonths(MOCK_USER_ID),
    getYearlyPeriodComparison(MOCK_USER_ID, targetYear, baseYear, analysisType),
  ]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <DashboardLayout>
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
        <SummaryCard title="Saldo Total" value={formatCurrency(totalBalance)} icon={Wallet} />
        <SummaryCard title="Receitas" value={formatCurrency(incomes)} icon={TrendingUp} />
        <SummaryCard title="Despesas" value={formatCurrency(expenses)} icon={CreditCard} />
        <SummaryCard title="Reserva de Emergência" value={formatCurrency(emergencyFund)} icon={PiggyBank} />
      </div>

      {/* Bento Grid — Gráficos Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2 bg-card rounded-xl border border-border p-6 flex flex-col min-h-[380px]">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Fluxo de Caixa
          </h3>
          <CashFlowChart data={cashFlowData} />
        </div>

        <div className="bg-card rounded-xl border border-border p-6 flex flex-col min-h-[380px]">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Distribuição do Patrimônio
          </h3>
          <PatrimonyChart data={patrimonyData} />
        </div>
      </div>

      {/* Comparativo Anual Simples */}
      <div className="grid grid-cols-1 gap-4 mt-4">
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col min-h-[400px]">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Evolução Mensal (Comparativo Simples)
          </h3>
          <YearlyComparisonChart data={yearlyComparison.data} years={yearlyComparison.years} />
        </div>
      </div>

      {/* Análise por Períodos (Trimestres/Semestres) */}
      <div className="grid grid-cols-1 gap-4 mt-4">
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col min-h-[600px]">
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
    </DashboardLayout>
  );
}
