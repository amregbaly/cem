"use client";

import React, { useState, useEffect } from "react";
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
  Clock,
  HardHat,
  UserCog,
  X,
  LogOut,
  Sparkles,
  Download,
  ChevronRight,
  Shield,
  Layers,
  FileCheck2
} from "lucide-react";
import ThemeCustomizerModal from "./ThemeCustomizerModal";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t, language, toggleLanguage } = useLanguage();
  const { isDarkMode, toggleDayNight, currentTheme } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedCemetery, setSelectedCemetery] = useState<string>("all");
  const [permitirListaFallecidos, setPermitirListaFallecidos] = useState(false);

  useEffect(() => {
    const readUser = () => {
      const savedUser = localStorage.getItem("cem_auth_user");
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    };

    readUser();

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
    fetch(`${apiUrl}/api/v1/portal/config`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.permitir_lista_fallecidos === "boolean") {
          setPermitirListaFallecidos(data.permitir_lista_fallecidos);
        }
      })
      .catch(() => {});

    window.addEventListener("storage", readUser);
    window.addEventListener("cem_auth_change", readUser);
    return () => {
      window.removeEventListener("storage", readUser);
      window.removeEventListener("cem_auth_change", readUser);
    };
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("cem_auth_token");
    localStorage.removeItem("cem_auth_user");
    setCurrentUser(null);
    window.dispatchEvent(new Event("cem_auth_change"));
    window.dispatchEvent(new Event("storage"));
    window.location.reload();
  };

  const navSections = [
    {
      title: "OPERACIONES",
      items: [
        { href: "/", label: t("navDashboard") || "Inicio / Panel General", icon: Building2, badge: "En vivo" },
        { href: "/ubicaciones", label: t("navUbicaciones") || "Ubicaciones & GIS", icon: MapPin },
        { href: "/arriendos", label: t("navArriendos") || "Arriendos & Concesiones", icon: Clock },
        { href: "/inhumaciones", label: t("navInhumaciones") || "Inhumaciones & Libros", icon: Users },
        { href: "/campo", label: t("navModoTerreno") || "Modo Terreno & Obras", icon: HardHat, badge: "Offline" },
      ]
    },
    {
      title: "GOBERNANZA & SEGURIDAD",
      items: [
        { href: "/auditoria", label: t("navAuditoria") || "Auditoría HMAC SHA-256", icon: ShieldCheck, badge: "Inmutable" },
        { href: "/migracion", label: t("navMigracion") || "Migración ETL Histórica", icon: Database },
      ]
    },
    {
      title: "ADMINISTRACIÓN MUNICIPAL",
      items: [
        { href: "/admin", label: "Control de Acceso & Grupos", icon: UserCog, badge: "RBAC" },
        { href: "/admin/temas", label: "Identidad Visual & Temas", icon: Palette },
      ]
    }
  ];

  const visitorSections = [
    {
      title: "PORTAL CIUDADANO (PÚBLICO)",
      items: [
        { href: "/verify/certificate", label: "Certificados Oficiales", icon: FileCheck2, badge: "Público" },
        ...(permitirListaFallecidos
          ? [{ href: "/inhumaciones", label: "Lista de Sepultaciones", icon: Users, badge: "Público" }]
          : []),
      ]
    },
    {
      title: "ÁREA MUNICIPAL",
      items: [
        { href: "/admin", label: "Acceso Funcionarios / Login", icon: UserCog, badge: "Seguro" },
      ]
    }
  ];

  const sectionsToRender = currentUser ? navSections : visitorSections;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 flex flex-col border-r transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
          borderColor: "var(--color-border)",
          color: "var(--color-text)"
        }}
      >
        {/* Brand & Municipal Header */}
        <div 
          className="p-5 border-b flex flex-col gap-3 relative"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              onClick={onClose}
              className="flex items-center space-x-3 group min-w-0"
            >
              <div className="bg-white/95 dark:bg-slate-800/95 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-center shrink-0 transition-all group-hover:scale-105">
                <img 
                  src="/logo.png" 
                  alt="Municipalidad de San Carlos" 
                  className="h-8 w-auto max-w-[90px] object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm tracking-tight leading-tight uppercase truncate" style={{ color: "var(--color-text)" }}>
                  Cementerios
                </span>
                <span className="text-xs font-semibold opacity-75 tracking-normal truncate">
                  San Carlos & Cachapoal
                </span>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg border text-muted-foreground hover:text-foreground"
              style={{ borderColor: "var(--color-border)" }}
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Compliance & Live System Seal */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <div className="flex items-center space-x-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>En Línea • Ley 21.719</span>
            </div>
            <span className="font-bold text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/20">
              ASVS L2
            </span>
          </div>

          {/* Cemetery Context Switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium">
            <button
              onClick={() => setSelectedCemetery("all")}
              className={`py-1 rounded text-center transition-all ${
                selectedCemetery === "all" 
                  ? "bg-white dark:bg-slate-900 shadow-xs font-bold text-primary" 
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              Ambos
            </button>
            <button
              onClick={() => setSelectedCemetery("san_carlos")}
              className={`py-1 rounded text-center transition-all ${
                selectedCemetery === "san_carlos" 
                  ? "bg-white dark:bg-slate-900 shadow-xs font-bold text-primary" 
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              S. Carlos
            </button>
            <button
              onClick={() => setSelectedCemetery("cachapoal")}
              className={`py-1 rounded text-center transition-all ${
                selectedCemetery === "cachapoal" 
                  ? "bg-white dark:bg-slate-900 shadow-xs font-bold text-primary" 
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              Cachapoal
            </button>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {sectionsToRender.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-1.5">
              <div className="px-3 text-[10px] font-bold tracking-widest uppercase opacity-50">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        isActive
                          ? "shadow-sm font-semibold"
                          : "opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                      style={{
                        backgroundColor: isActive ? "var(--color-primary)" : "transparent",
                        color: isActive ? "#FFFFFF" : "var(--color-text)",
                      }}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? "text-white" : "opacity-75"
                        }`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span 
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isActive 
                              ? "bg-white/20 text-white" 
                              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Session & Status Card */}
        <div 
          className="p-4 border-t flex flex-col gap-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          {currentUser ? (
            <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div 
                  className="w-9 h-9 rounded-lg font-bold text-white text-xs flex items-center justify-center shrink-0 shadow-xs"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {currentUser.username ? currentUser.username.slice(0, 2).toUpperCase() : "US"}
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs font-bold truncate">
                    {currentUser.nombre_completo || currentUser.username}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      ● {currentUser.role || "ADMINISTRATIVO"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg border text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                style={{ borderColor: "var(--color-border)" }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/admin"
              onClick={onClose}
              className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between group hover:border-primary transition-all"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold group-hover:text-primary transition-colors">
                    Sesión Municipal
                  </span>
                  <span className="text-[10px] opacity-70">
                    Acceder a Panel Admin
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}

          {/* Quick Preferences Toolbar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-1.5">
              {/* Day / Night Toggle */}
              <button
                onClick={toggleDayNight}
                aria-label={t("themeDayNight")}
                title={isDarkMode ? t("themeLight") : t("themeDark")}
                className="p-2 rounded-lg border transition-all hover:scale-105"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>

              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                title={`Idioma actual: ${language.toUpperCase()}`}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all hover:scale-105"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
              >
                <Languages className="w-3.5 h-3.5 text-primary" />
                <span>{language.toUpperCase()}</span>
              </button>

              {/* Theme Palette Modal */}
              <button
                onClick={() => setShowThemeModal(true)}
                title={t("themeSettings")}
                className="p-2 rounded-lg border transition-all hover:scale-105"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-accent)"
                }}
              >
                <Palette className="w-4 h-4" />
              </button>
            </div>

            {/* Version & EETT Badge */}
            <span className="text-[10px] font-mono opacity-50">
              EETT 2026
            </span>
          </div>
        </div>
      </aside>

      {/* Theme Customizer Modal */}
      {showThemeModal && (
        <ThemeCustomizerModal onClose={() => setShowThemeModal(false)} />
      )}
    </>
  );
}
