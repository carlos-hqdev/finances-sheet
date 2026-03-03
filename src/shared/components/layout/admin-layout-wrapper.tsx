"use client";

import type { User } from "@prisma/client";
import { useState } from "react";
import Header from "./header";
import Sidebar from "./sidebar";

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
  user?: User; // Make user optional for now as we might not have it initially
}

export default function AdminLayoutWrapper({
  children,
  user,
}: AdminLayoutWrapperProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden glass"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        user={user}
        isCollapsed={isSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent bg-background">
        <div className="p-4 md:p-6 min-h-full flex flex-col gap-4 2xl:max-w-[1800px] 2xl:mx-auto w-full transition-all duration-300">
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
