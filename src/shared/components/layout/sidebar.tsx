"use client";

import type { User } from "@prisma/client";
import {
  ArrowRightLeft,
  BarChart,
  CreditCard,
  LayoutDashboard,
  Settings,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { signOut } from "@/shared/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";


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

// Extend User to allow extra props if needed, though mostly standard User is fine
type SidebarUser = User;

interface SidebarProps {
  user?: SidebarUser;
  isCollapsed: boolean;
  isMobileMenuOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  user,
  isCollapsed,
  isMobileMenuOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Handle potential null/undefined name
  const firstName = user?.name ? user.name.split(" ")[0] : "Usuário";

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
        },
      },
    });
  };

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className={cn(
                "block rounded-lg  border border-sidebar-border p-3 mb-2 transition-all hover:bg-sidebar-accent cursor-pointer outline-none",
                isCollapsed ? "flex justify-center" : "",
              )}
            >
              <div className="flex items-center gap-3">
                {user?.name ? (
                  <div suppressHydrationWarning className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-xs shrink-0">
                    {firstName.substring(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <div suppressHydrationWarning className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-xs shrink-0">
                    U
                  </div>
                )}
                {!isCollapsed && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate text-sidebar-foreground">
                      {user?.name || "Convidado"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email || "guest@example.com"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isCollapsed ? "right" : "top"}
            align={isCollapsed ? "start" : "end"}
            className="w-56"
          >
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                <span>Perfil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer flex items-center gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
