// import { ModeToggle } from "@/components/mode-toggle"; // Not implemented yet
// import { NotificationPopover } from "@/features/notifications/components/notification-popover"; // Not implemented yet
// import { logout } from "@/features/users/actions-auth"; // Not implemented yet
// import { SessionTimer } from "@/features/users/components/session-timer"; // Not implemented yet
import type { User } from "@prisma/client";
import { PanelLeft, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  user?: User;
}

export default function Header({
  toggleSidebar,
  isSidebarCollapsed,
}: HeaderProps) {
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

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Perfil"
        >
          <UserIcon className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
