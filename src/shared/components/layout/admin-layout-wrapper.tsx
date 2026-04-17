"use client";

import type { User } from "@prisma/client";
import { useState } from "react";
import Header from "./header";
import Sidebar from "./sidebar";

export interface SidebarInfo {
  name: string;
  displayName: string | null;
  email: string;
  image: string | null;
  currentBalance: number;
  reserves: number;
  totalGoals: number;
  monthlyExpenses: number;
}

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
  user: User;
  sidebarInfo: SidebarInfo;
}

export default function AdminLayoutWrapper({
  children,
  user,
  sidebarInfo,
}: AdminLayoutWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden font-sans">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden glass"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        sidebarInfo={sidebarInfo}
      />

      <div className="flex-1 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent bg-background">
        <div className="p-4 md:p-6 min-h-full flex flex-col gap-4 2xl:max-w-450 2xl:mx-auto w-full transition-all duration-300">
          <div className="flex-1 flex flex-col bg-card rounded-3xl border border-border shadow-sm">
            <Header
              toggleSidebar={toggleSidebar}
              isSidebarCollapsed={isSidebarCollapsed}
              user={user}
            />
            <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
