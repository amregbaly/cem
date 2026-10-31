"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { 
  Building2, 
  Users, 
  MapPin, 
  ShieldCheck, 
  Database, 
  Palette, 
  Sun, 
  Moon, 
  Languages,
  Menu,
  X,
  Clock,
  HardHat,
  FileCheck
} from "lucide-react";
import ThemeCustomizerModal from "./ThemeCustomizerModal";

export default function Navbar() {
  const pathname = usePathname();
  const { t, language, toggleLanguage } = useLanguage();
  const { isDarkMode, toggleDayNight, currentTheme } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: t("navDashboard"), icon: Building2 },
    { href: "/ubicaciones", label: t("navUbicaciones"), icon: MapPin },
    { href: "/arriendos", label: t("navArriendos"), icon: Clock },
    { href: "/campo", label: t("navModoTerreno"), icon: HardHat },
    { href: "/inhumaciones", label: t("navInhumaciones"), icon: Users },
    { href: "/auditoria", label: t("navAuditoria"), icon: ShieldCheck },
    { href: "/migracion", label: t("navMigracion"), icon: Database },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors"
        style={{
          backgroundColor: isDarkMode ? "rgba(17, 24, 39, 0.92)" : "rgba(255, 255, 255, 0.92)",
          borderColor: "var(--color-border)"
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md font-bold text-white text-lg transition-transform hover:scale-105"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                SC
              </div>
              <div>
                <Link href="/" className="font-bold text-base sm:text-lg leading-tight block tracking-tight">
                  {t("appTitle")}
                </Link>
                <div className="flex items-center space-x-2 text-xs opacity-75">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">● San Carlos</span>
                  <span>•</span>
                  <span>Cachapoal</span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? "shadow-sm" 
                        : "opacity-80 hover:opacity-100"
                    }`}
                    style={{
                      backgroundColor: isActive ? "var(--color-primary)" : "transparent",
                      color: isActive ? "#FFFFFF" : "var(--color-text)",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Controls: Day/Night Toggle, Language Switcher, Theme Customizer */}
            <div className="flex items-center space-x-2">
              
              {/* Day / Night Toggle */}
              <button
                onClick={toggleDayNight}
                aria-label={t("themeDayNight")}
                title={isDarkMode ? t("themeLight") : t("themeDark")}
                className="p-2 rounded-lg border transition-all hover:scale-105 active:scale-95"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-700" />
                )}
              </button>

              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                title={`Cambiar idioma (${language.toUpperCase()})`}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all hover:scale-105"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
              >
                <Languages className="w-4 h-4 text-primary" />
                <span>{language.toUpperCase()}</span>
              </button>

              {/* Theme Palette Modal Trigger */}
              <button
                onClick={() => setShowThemeModal(true)}
                title={t("themeSettings")}
                className="p-2 rounded-lg border text-xs font-medium transition-all hover:scale-105"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-accent)"
                }}
              >
                <Palette className="w-5 h-5" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg border"
                style={{ borderColor: "var(--color-border)" }}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t px-4 pt-2 pb-4 space-y-1" style={{ borderColor: "var(--color-border)" }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: isActive ? "var(--color-primary)" : "transparent",
                    color: isActive ? "#FFFFFF" : "var(--color-text)",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Theme Customizer Modal */}
      {showThemeModal && (
        <ThemeCustomizerModal onClose={() => setShowThemeModal(false)} />
      )}
    </>
  );
}
