import { DashboardLayout } from "@/shared/components/layout";

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            Relatórios
          </h2>
          <p className="text-zinc-400">Análise detalhada de suas finanças.</p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-zinc-800 p-12 text-center">
        <h3 className="text-lg font-medium text-zinc-300">
          Em Desenvolvimento
        </h3>
        <p className="text-sm text-zinc-500 mt-2">
          Os relatórios financeiros estarão disponíveis em breve.
        </p>
      </div>
    </DashboardLayout>
  );
}
