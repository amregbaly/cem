"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Download, 
  Building2, 
  User, 
  Calendar, 
  Hash, 
  Search,
  Lock,
  ArrowLeft,
  QrCode,
  FileCheck2,
  ExternalLink
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface CertificatePublicInfo {
  folio: string;
  token_verificacion: string;
  tipo_certificado: string;
  estado: string;
  es_valido: boolean;
  cementerio: string;
  codigo_ubicacion: string;
  fallecido_nombre: string | null;
  rut_fallecido: string | null;
  titular_nombre: string | null;
  rut_titular: string | null;
  autoridad_emisora: string;
  funcionario_emisor: string;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  sha256_hash: string;
  created_at: string | null;
}

export default function CertificatePortalPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [folioInput, setFolioInput] = useState<string>("");
  const [cert, setCert] = useState<CertificatePublicInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const handleVerify = async (targetFolio: string) => {
    const clean = targetFolio.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setCert(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/certificados/publico/${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        setCert(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || "No se encontró ningún certificado válido con el Folio o Token ingresado.");
      }
    } catch {
      setError("Error de conexión al verificar el certificado contra el nodo municipal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </Link>
        <div className="flex items-center space-x-2.5">
          <a
            href={`${apiUrl}/api/v1/certificados/exportar`}
            download
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            title="Descargar Nómina de Certificados Emitidos en CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar Nómina CSV</span>
          </a>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Ley 21.719 • Verificación Oficial
          </span>
        </div>
      </div>


      {/* Main Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          Portal de Verificación de Certificados
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Compruebe la autenticidad, vigencia y huella criptográfica SHA-256 de certificados emitidos por los Cementerios Municipales de San Carlos y Cachapoal.
        </p>
      </div>

      {/* Search / Verify Card */}
      <div
        className="p-6 sm:p-8 rounded-3xl border shadow-lg transition-all"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify(folioInput);
          }}
          className="space-y-4"
        >
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ingrese Folio Oficial o Token de Verificación QR
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ej: CERT-2026-A1B2C3 o escanee el código QR..."
                value={folioInput}
                onChange={(e) => setFolioInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border text-sm font-mono transition-all outline-none focus:ring-2 focus:ring-primary/20"
                style={{
                  backgroundColor: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !folioInput.trim()}
              className="px-7 py-3.5 rounded-2xl text-xs font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center space-x-2"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? "Verificando..." : "Verificar Certificado"}</span>
            </button>
          </div>

          {/* Quick Examples */}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground pt-1">
            <span>Ejemplo oficial válido:</span>
            <button
              type="button"
              onClick={() => {
                setFolioInput("CERT-2026-0089");
                handleVerify("CERT-2026-0089");
              }}
              className="font-mono text-primary font-bold underline hover:opacity-80"
            >
              CERT-2026-0089 (Descargable)
            </button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start space-x-3">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Certificado no encontrado o no vigente</div>
              <div className="opacity-90 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {/* Verified Certificate Card */}
        {cert && (
          <div className="mt-8 pt-6 border-t space-y-6" style={{ borderColor: "var(--color-border)" }}>
            {/* Status Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 gap-3">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <div className="font-extrabold text-sm sm:text-base text-emerald-800 dark:text-emerald-300">
                    CERTIFICADO VÁLIDO & AUTÉNTICO
                  </div>
                  <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                    Registrado en el Sistema Oficial de Cementerios Municipales • San Carlos & Cachapoal
                  </div>
                </div>
              </div>

              <a
                href={`${apiUrl}/api/v1/certificados/descargar/${cert.folio}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF Oficial</span>
              </a>
            </div>

            {/* Certificate Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-muted-foreground block text-[11px] font-bold uppercase">Folio Único</span>
                <span className="font-mono font-bold text-sm text-foreground mt-0.5 block">{cert.folio}</span>
              </div>

              <div className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-muted-foreground block text-[11px] font-bold uppercase">Tipo de Documento</span>
                <span className="font-bold text-sm text-foreground mt-0.5 block">{cert.tipo_certificado}</span>
              </div>

              <div className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-muted-foreground block text-[11px] font-bold uppercase">Cementerio</span>
                <span className="font-bold text-sm text-foreground mt-0.5 block">{cert.cementerio}</span>
              </div>

              <div className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-muted-foreground block text-[11px] font-bold uppercase">Ubicación / Sepultura</span>
                <span className="font-mono font-bold text-sm text-foreground mt-0.5 block">{cert.codigo_ubicacion}</span>
              </div>

              <div className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-muted-foreground block text-[11px] font-bold uppercase">Fallecido / Titular</span>
                <span className="font-bold text-sm text-foreground mt-0.5 block">
                  {cert.fallecido_nombre || cert.titular_nombre || "N/A"}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  RUT: {cert.rut_fallecido || cert.rut_titular || "N/A"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-muted-foreground block text-[11px] font-bold uppercase">Fecha de Emisión</span>
                <span className="font-bold text-sm text-foreground mt-0.5 block">{cert.fecha_emision || "N/A"}</span>
              </div>
            </div>

            {/* Cryptographic SHA-256 Seal */}
            <div className="p-4 rounded-xl border bg-slate-100/60 dark:bg-slate-900/60 space-y-1.5" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-2 text-xs font-bold text-foreground">
                <Hash className="w-4 h-4 text-emerald-500" />
                <span>Huella Digital SHA-256 (Inmutable)</span>
              </div>
              <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 break-all block">
                {cert.sha256_hash}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Trust & Legal Compliance Footnote */}
      <div className="p-5 rounded-2xl border text-xs text-muted-foreground space-y-2 bg-slate-50/50 dark:bg-slate-900/20" style={{ borderColor: "var(--color-border)" }}>
        <div className="font-bold text-foreground flex items-center space-x-1.5">
          <Lock className="w-4 h-4 text-primary" />
          <span>Protección de Datos & Marco Regulatorio Ley 21.719</span>
        </div>
        <p>
          Este portal público opera de conformidad con los estándares de la Ley 21.719 de Protección de Datos Personales de la República de Chile. Por resguardo del derecho a la privacidad familiar y secreto estadístico médico, las causas clínicas de defunción nunca son expuestas públicamente.
        </p>
      </div>
    </div>
  );
}
