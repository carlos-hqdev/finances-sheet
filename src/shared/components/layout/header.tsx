"use client";

// import { NotificationPopover } from "@/features/notifications/components/notification-popover"; // Not implemented yet
// import { logout } from "@/features/users/actions-auth"; // Not implemented yet
// import { SessionTimer } from "@/features/users/components/session-timer"; // Not implemented yet
import type { User } from "@prisma/client";
import { PanelLeft, User as UserIcon, LogOut, Settings } from "lucide-react";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { Button } from "@/shared/components/ui/button";
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
import Link from "next/link";

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  user?: any; // Alterado para any temporariamente ou tipo estendido do Better Auth
}

export default function Header({
  toggleSidebar,
  isSidebarCollapsed,
  user,
}: HeaderProps) {
  const router = useRouter();

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
    <header className="flex h-16 items-center justify-between px-6 sticky top-0 bg-card rounded-t-3xl border-b z-10 transition-all duration-300">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-muted-foreground hover:text-foreground"
        >
          <PanelLeft
            className={cn(
              "h-5 w-5 transition-transform",
              isSidebarCollapsed && "rotate-180",
            )}
          />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {/* Placeholders for future features */}
        {/* <SessionTimer /> */}
        {/* <NotificationPopover /> */}
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary transition-colors outline-none"
              title={user?.displayName || user?.name || "Perfil"}
            >
              <UserIcon className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.displayName || user?.name || "Usuário"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "guest@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer flex items-center gap-2">
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
    </header>
  );
}
