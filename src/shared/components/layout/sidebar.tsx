"use client";

import {
  ArrowRightLeft,
  BarChart,
  CreditCard,
  LayoutDashboard,
  Settings,
  Wallet,
  PiggyBank,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useEffect, useState } from "react";
import type { SidebarInfo } from "./admin-layout-wrapper";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Visão Geral",
    items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "Finanças",
    items: [
      { name: "Contas", href: "/accounts", icon: Wallet },
      { name: "Transações", href: "/transactions", icon: ArrowRightLeft },
      { name: "Cartões", href: "/credit-cards", icon: CreditCard },
      { name: "Investimentos", href: "/investments", icon: BarChart },
    ],
  },
  {
    title: "Análise",
    items: [{ name: "Relatórios", href: "/reports", icon: BarChart }],
  },
  {
    title: "Configurações",
    items: [
      {
        name: "Categorias",
        href: "/categories",
        icon: Settings,
      },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  isMobileMenuOpen?: boolean;
  onCloseMobile?: () => void;
  sidebarInfo?: SidebarInfo;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  color,
  isCollapsed,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  isCollapsed: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        isCollapsed && "justify-center",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", color)} />
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate text-muted-foreground">{label}</span>
          <span className={cn("font-semibold", color)}>{value}</span>
        </>
      )}
    </div>
  );
}

export default function Sidebar({
  isCollapsed,
  isMobileMenuOpen,
  onCloseMobile,
  sidebarInfo,
}: SidebarProps) {
  const pathname = usePathname();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 ease-in-out md:relative",
        // Mobile behavior
        isMobileMenuOpen
          ? "translate-x-0"
          : "-translate-x-full md:translate-x-0",
        // Desktop behavior (width)
        isCollapsed ? "md:w-20" : "md:w-64",
        // Base mobile width
        "w-64",
      )}
    >
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="h-8 w-8 rounded bg-sidebar-primary/20 flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5 text-sidebar-primary" />
          </div>
          {!isCollapsed && (
            <h1 className="text-lg font-bold tracking-tight whitespace-nowrap opacity-100 transition-opacity duration-300 text-sidebar-foreground">
              Finances
            </h1>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar py-6 px-3 space-y-6">
        {navGroups.map((group) => {
          return (
            <div key={group.title}>
              {!isCollapsed && (
                <h3 className="mb-2 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-all group",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        isCollapsed && "justify-center px-2",
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          isActive
                            ? "text-sidebar-primary"
                            : "text-muted-foreground group-hover:text-sidebar-foreground",
                        )}
                      />
                      {!isCollapsed && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        {!isLoaded ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : sidebarInfo ? (
          <div className="space-y-2">
            <SummaryItem
              icon={Wallet}
              label="Saldo"
              value={formatCurrency(sidebarInfo.currentBalance)}
              color="text-emerald-500"
              isCollapsed={isCollapsed}
            />
            <SummaryItem
              icon={TrendingUp}
              label="Saídas"
              value={formatCurrency(sidebarInfo.monthlyExpenses)}
              color="text-red-500"
              isCollapsed={isCollapsed}
            />
            <SummaryItem
              icon={Target}
              label="Metas"
              value={formatCurrency(sidebarInfo.totalGoals)}
              color="text-blue-500"
              isCollapsed={isCollapsed}
            />
            <SummaryItem
              icon={PiggyBank}
              label="Reservas"
              value={formatCurrency(sidebarInfo.reserves)}
              color="text-amber-500"
              isCollapsed={isCollapsed}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
