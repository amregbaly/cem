"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import ChatPanel from "./ChatPanel";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)] transition-colors">
      
      {/* Left-side Navigation Sidebar (Hidden on Home Page) */}
      {!isHomePage && (
        <Sidebar 
          isOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Main Content Area (Offset by sidebar width on desktop only when sidebar is visible) */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${!isHomePage ? "lg:pl-72" : ""}`}>
        
        {/* Top Header Bar (Hidden on Home Page) */}
        {!isHomePage && (
          <TopHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        )}

        {/* Dynamic Page Content */}
        <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${isHomePage ? "max-w-6xl" : "max-w-7xl"}`}>
          {children}
        </main>

        {/* Municipal & Compliance Footer */}
        <footer 
          className="border-t py-6 text-xs transition-colors mt-auto"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-text)"
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 opacity-80">
            <div className="flex items-center space-x-2">
              <span className="font-bold">Ilustre Municipalidad de San Carlos</span>
              <span>•</span>
              <span>Cementerios Municipales (San Carlos & Cachapoal)</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>OWASP ASVS Nivel 2</span>
              <span>•</span>
              <span>Trazabilidad Criptográfica HMAC SHA-256</span>
              <span>•</span>
              <span>Ley 21.719</span>
            </div>
          </div>
        </footer>

        {/* AI Assistant Chat Panel (Logged-in staff) */}
        <ChatPanel />

      </div>
    </div>
  );
}
