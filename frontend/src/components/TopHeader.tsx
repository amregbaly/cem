"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Menu, 
  Search, 
  ShieldCheck, 
  Download, 
  ChevronRight, 
  ExternalLink,
  Building,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

export default function TopHeader({ onOpenMobileMenu }: TopHeaderProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Generate breadcrumb items
  const getBreadcrumbs = () => {
    if (pathname === "/") {
      return [{ label: "Panel General", href: "/" }];
    }
    const parts = pathname.split("/").filter(Boolean);
    const crumbs = [{ label: "Inicio", href: "/" }];
    
    let currentPath = "";
    for (const part of parts) {
      currentPath += `/${part}`;
      let label = part;
      if (part === "admin") label = "Control de Acceso & Grupos";
      else if (part === "temas") label = "Personalización de Temas";
      else if (part === "ubicaciones") label = "Mapa GIS & Sepulturas";
      else if (part === "arriendos") label = "Arriendos & Vencimientos";
      else if (part === "inhumaciones") label = "Registro de Inhumaciones";
      else if (part === "campo") label = "Modo Terreno & Obras";
      else if (part === "auditoria") label = "Auditoría HMAC";
      else if (part === "migracion") label = "Migración ETL";
      else if (part === "verify") label = "Verificación de Certificado";
      
      crumbs.push({ label, href: currentPath });
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const apiUrl = "";  // always relative — proxied by Next.js rewrites + Nginx

  const handleDownloadExitPackage = async () => {
    setDownloading(true);
    setDownloadSuccess(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/export/exit-package`, {
        method: "GET",
      });
      if (!res.ok) {
        throw new Error("No se pudo generar el paquete de salida.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cem_exit_package_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setDownloadSuccess("Paquete de salida exportado con éxito.");
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: any) {
      alert("Error al descargar el paquete de salida: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <header 
      className="sticky top-0 z-30 border-b backdrop-blur-md transition-colors h-16 flex items-center px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.88)",
        borderColor: "var(--color-border)"
      }}
    >
      <div className="w-full flex items-center justify-between gap-4">
        
        {/* Left: Hamburger Button (mobile) & Breadcrumbs */}
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            style={{ borderColor: "var(--color-border)" }}
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb path */}
          <nav className="flex items-center space-x-1.5 text-xs sm:text-sm overflow-hidden" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.href}>
                  {idx > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                  )}
                  {isLast ? (
                    <span className="font-bold truncate" style={{ color: "var(--color-primary)" }}>
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="opacity-70 hover:opacity-100 transition-opacity truncate hidden sm:inline"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Right: Security Badge, Exit Package & Quick Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          
          {/* Security Compliance Seal */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
            style={{ 
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-surface)"
            }}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="opacity-90">HMAC SHA-256</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          {/* Exit Package Export */}
          <button
            onClick={handleDownloadExitPackage}
            disabled={downloading}
            title="Descargar Paquete de Salida Municipal (Exit Package EETT 2026)"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-primary)"
            }}
          >
            <Download className={`w-3.5 h-3.5 ${downloading ? "animate-bounce" : ""}`} />
            <span className="hidden sm:inline">
              {downloading ? "Exportando..." : "Exit Package"}
            </span>
          </button>

          {/* Direct Public Certificate Verification Link */}
          <Link
            href="/verify"
            className="p-2 rounded-xl border text-xs font-medium opacity-80 hover:opacity-100 transition-all hover:scale-105"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-surface)"
            }}
            title="Verificador Público de Certificados"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </header>
  );
}
