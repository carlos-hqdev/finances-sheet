import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-black text-zinc-100 p-8 font-sans">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-400">Visão geral das suas finanças.</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Actions like period filter will go here */}
          <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-400">
            Outubro, 2024
          </div>
        </div>
      </header>
      <main className="space-y-4">{children}</main>
    </div>
  );
}
