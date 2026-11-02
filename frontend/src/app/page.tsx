"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  MapPin, 
  ShieldCheck, 
  Database, 
  Palette, 
  PlusCircle, 
  Eye, 
  EyeOff, 
  ArrowUpRight,
  CheckCircle,
  FileText,
  FileArchive,
  Download,
  Search,
  Lock,
  XCircle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Shield,
  ArrowRight
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import AutocompleteSearch from "@/components/AutocompleteSearch";
import StatCard from "@/components/StatCard";
import AuditVerificationBadge from "@/components/AuditVerificationBadge";

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
  sha256_hash: string;
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedCemetery, setSelectedCemetery] = useState<"all" | "sancarlos" | "cachapoal">("all");
  const [maskCause, setMaskCause] = useState<boolean>(true);

  // Portal Public Configuration
  const [portalConfig, setPortalConfig] = useState({
    permitir_lista_fallecidos: false,
    titulo_portal: "Portal Ciudadano de Certificados Municipales",
    mensaje_portal: "Verificación digital y autenticidad de certificados para los Cementerios de San Carlos y Cachapoal (Ley 21.719)."
  });

  // Certificate Verification Form for Visitors
  const [certFolioInput, setCertFolioInput] = useState("");
  const [certResult, setCertResult] = useState<CertificatePublicInfo | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  useEffect(() => {
    setMounted(true);
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

    // Fetch public portal config
    fetch(`${apiUrl}/api/v1/portal/config`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.permitir_lista_fallecidos === "boolean") {
          setPortalConfig(data);
        }
      })
      .catch(() => {});

    window.addEventListener("storage", readUser);
    window.addEventListener("cem_auth_change", readUser);
    return () => {
      window.removeEventListener("storage", readUser);
      window.removeEventListener("cem_auth_change", readUser);
    };
  }, [apiUrl]);

  const handleVerifyCertificate = async (folioToTest?: string) => {
    const target = (folioToTest || certFolioInput).trim();
    if (!target) return;
    setCertLoading(true);
    setCertError(null);
    setCertResult(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/certificados/publico/${encodeURIComponent(target)}`);
      if (res.ok) {
        const data = await res.json();
        setCertResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setCertError(errData.detail || "No se encontró ningún certificado con el Folio ingresado.");
      }
    } catch {
      setCertError("Error de conexión al consultar el servidor municipal.");
    } finally {
      setCertLoading(false);
    }
  };

  // Sample recent burials
  const recentBurials = [
    {
      id: 101,
      nombre: "MANUEL JESUS MUÑOZ SEPULVEDA",
      rut: "7.842.119-4",
      fecha_sepultacion: "2026-10-28",
      cementerio: "San Carlos",
      sector: "PAB-B",
      fila: "F-03",
      numero: "142",
      tipo: "Pabellón",
      causa: "Insuficiencia Cardiorrespiratoria Aguda",
      folio: "FOL-2026-0891"
    },
    {
      id: 102,
      nombre: "MARIA DEL CARMEN YAÑEZ VENEGAS",
      rut: "11.239.812-K",
      fecha_sepultacion: "2026-10-26",
      cementerio: "San Carlos",
      sector: "PAT-01",
      fila: "F-12",
      numero: "088",
      tipo: "Patio Común",
      causa: "Neumonía Severa Multifocal",
      folio: "FOL-2026-0888"
    },
    {
      id: 103,
      nombre: "HECTOR OSVALDO RETAMAL ACUÑA",
      rut: "8.319.445-1",
      fecha_sepultacion: "2026-10-22",
      cementerio: "Cachapoal",
      sector: "PAT-R",
      fila: "F-01",
      numero: "019",
      tipo: "Patio Rural",
      causa: "Shock Séptico de Foco Pulmonar",
      folio: "FOL-2026-0884"
    },
    {
      id: 104,
      nombre: "ROSA ANGELICA FUENTES BRAVO",
      rut: "13.441.982-3",
      fecha_sepultacion: "2026-10-18",
      cementerio: "San Carlos",
      sector: "BOV-NORTE",
      fila: "F-05",
      numero: "007",
      tipo: "Bóveda Familiar",
      causa: "Accidente Cerebrovascular Isquémico",
      folio: "FOL-2026-0879"
    },
    {
      id: 105,
      nombre: "JUAN CARLOS DE LA FUENTE SILVA",
      rut: "9.182.744-8",
      fecha_sepultacion: "2026-10-15",
      cementerio: "Cachapoal",
      sector: "SP4-A",
      fila: "F-02",
      numero: "034",
      tipo: "Sepultura en Altura",
      causa: "Infarto Agudo al Miocardio",
      folio: "FOL-2026-0870"
    }
  ];

  const filteredBurials = recentBurials.filter(b => {
    if (selectedCemetery === "sancarlos") return b.cementerio === "San Carlos";
    if (selectedCemetery === "cachapoal") return b.cementerio === "Cachapoal";
    return true;
  });

  // ==========================================
  // VIEW A: PUBLIC CITIZEN VISITOR PORTAL
  // ==========================================
  if (mounted && !currentUser) {
    return (
      <div className="space-y-10 animate-fadeIn max-w-5xl mx-auto pb-12">
        {/* Visitor Municipal Banner */}
        <div
          className="p-6 sm:p-8 rounded-3xl border shadow-sm transition-all"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white/95 dark:bg-slate-800/95 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs inline-flex">
                  <img 
                    src="/logo.png" 
                    alt="Ilustre Municipalidad de San Carlos" 
                    className="h-9 sm:h-10 w-auto object-contain"
                  />
                </div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Portal Oficial • San Carlos & Cachapoal</span>
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
                {portalConfig.titulo_portal}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                {portalConfig.mensaje_portal}
              </p>
            </div>

            <Link
              href="/admin"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all hover:bg-black/5 dark:hover:bg-white/5 self-start md:self-center shrink-0"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>Acceso Funcionarios</span>
            </Link>
          </div>
        </div>

        {/* SECTION 1: PUBLIC CERTIFICATE VERIFICATION (ALWAYS VISIBLE TO VISITORS) */}
        <div
          className="p-6 sm:p-8 rounded-3xl border shadow-lg space-y-6 transition-all"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-center space-x-3 pb-4 border-b" style={{ borderColor: "var(--color-border)" }}>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--color-text)" }}>
                Verificación Digital de Certificados Municipales
              </h2>
              <p className="text-xs text-muted-foreground">
                Consulte la autenticidad e integridad de certificados de sepultación y derechos mediante Folio o token QR.
              </p>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyCertificate();
            }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Ingrese el Folio (ej: CERT-2026-0891)..."
                  value={certFolioInput}
                  onChange={(e) => setCertFolioInput(e.target.value)}
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
                disabled={certLoading || !certFolioInput.trim()}
                className="px-6 py-3.5 rounded-2xl text-xs font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center space-x-2"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{certLoading ? "Comprobando..." : "Comprobar Folio"}</span>
              </button>
            </div>

            {/* Quick Sample Links */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
              <span>Folio de demostración oficial:</span>
              <button
                type="button"
                onClick={() => {
                  setCertFolioInput("CERT-2026-0089");
                  handleVerifyCertificate("CERT-2026-0089");
                }}
                className="font-mono text-primary font-bold underline hover:opacity-80"
              >
                CERT-2026-0089 (Válido / Descargable)
              </button>
            </div>
          </form>

          {/* Error Message */}
          {certError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start space-x-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Certificado no válido o no emitido</div>
                <div className="opacity-90 mt-0.5">{certError}</div>
              </div>
            </div>
          )}

          {/* Verified Certificate Card */}
          {certResult && (
            <div className="p-6 rounded-2xl border bg-emerald-500/5 border-emerald-500/30 space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-base font-extrabold text-emerald-800 dark:text-emerald-300">
                      CERTIFICADO VÁLIDO & REGISTRADO EN MATRIZ OFICIAL
                    </h3>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                      Emitido bajo firma y resguardo de la Dirección de Cementerios Municipales.
                    </p>
                  </div>
                </div>

                <a
                  href={`${apiUrl}/api/v1/certificados/descargar/${certResult.folio}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Documento PDF</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl border bg-white/60 dark:bg-slate-900/60" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">Folio Municipal</span>
                  <span className="font-mono font-bold text-sm text-foreground mt-0.5 block">{certResult.folio}</span>
                </div>
                <div className="p-3 rounded-xl border bg-white/60 dark:bg-slate-900/60" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">Tipo</span>
                  <span className="font-bold text-sm text-foreground mt-0.5 block">{certResult.tipo_certificado}</span>
                </div>
                <div className="p-3 rounded-xl border bg-white/60 dark:bg-slate-900/60" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">Cementerio</span>
                  <span className="font-bold text-sm text-foreground mt-0.5 block">{certResult.cementerio}</span>
                </div>
                <div className="p-3 rounded-xl border bg-white/60 dark:bg-slate-900/60" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">Ubicación</span>
                  <span className="font-mono font-bold text-sm text-foreground mt-0.5 block">{certResult.codigo_ubicacion}</span>
                </div>
                <div className="p-3 rounded-xl border bg-white/60 dark:bg-slate-900/60" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">Titular / Persona</span>
                  <span className="font-bold text-sm text-foreground mt-0.5 block">
                    {certResult.fallecido_nombre || certResult.titular_nombre || "N/A"}
                  </span>
                </div>
                <div className="p-3 rounded-xl border bg-white/60 dark:bg-slate-900/60" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">Fecha de Emisión</span>
                  <span className="font-bold text-sm text-foreground mt-0.5 block">{certResult.fecha_emision || "N/A"}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-[11px] font-mono" style={{ borderColor: "var(--color-border)" }}>
                <span className="text-muted-foreground font-sans block text-[10px] font-bold uppercase">Huella Criptográfica SHA-256</span>
                <span className="text-emerald-700 dark:text-emerald-400 break-all">{certResult.sha256_hash}</span>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: DEATH LIST (GOVERNED STRICTLY BY ADMIN TOGGLE) */}
        {!portalConfig.permitir_lista_fallecidos ? (
          /* When death list is disabled by admin for visitors */
          <div
            className="p-6 sm:p-8 rounded-3xl border shadow-sm transition-all"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start space-x-4 max-w-2xl">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-muted-foreground shrink-0 mt-1">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base sm:text-lg" style={{ color: "var(--color-text)" }}>
                      Nómina de Sepultaciones Restringida para Visitantes
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-muted-foreground">
                      Protegido por Admin
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Por política municipal de privacidad y resguardo de datos (Ley 21.719), el acceso a los libros de sepultaciones y nómina general está reservado para personal municipal. Los visitantes pueden verificar cualquier documento oficial con su número de Folio arriba.
                  </p>
                </div>
              </div>

              <Link
                href="/admin"
                className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <span>Ingresar como Funcionario</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* When death list IS enabled by admin for visitors */
          <div
            className="rounded-3xl border overflow-hidden shadow-sm transition-all"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div
              className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-base sm:text-lg" style={{ color: "var(--color-text)" }}>
                    Nómina Oficial de Sepultaciones (Acceso Ciudadano)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    Habilitado por Administración
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Registros verificados. Diagnóstico médico protegido de conformidad a la Ley 21.719.
                </p>
              </div>

              {/* Cemetery Filter Pills */}
              <div
                className="p-1 rounded-2xl border flex items-center self-start sm:self-center shadow-xs"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <button
                  onClick={() => setSelectedCemetery("all")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    selectedCemetery === "all" ? "text-white shadow-xs" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: selectedCemetery === "all" ? "var(--color-primary)" : "transparent" }}
                >
                  Ambos
                </button>
                <button
                  onClick={() => setSelectedCemetery("sancarlos")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    selectedCemetery === "sancarlos" ? "text-white shadow-xs" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: selectedCemetery === "sancarlos" ? "var(--color-primary)" : "transparent" }}
                >
                  San Carlos
                </button>
                <button
                  onClick={() => setSelectedCemetery("cachapoal")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    selectedCemetery === "cachapoal" ? "text-white shadow-xs" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: selectedCemetery === "cachapoal" ? "#059669" : "transparent" }}
                >
                  Cachapoal
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead
                  className="text-xs uppercase font-semibold opacity-60 border-b"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <tr>
                    <th className="p-4">{t("deceasedName")}</th>
                    <th className="p-4">{t("rut")}</th>
                    <th className="p-4">Cementerio</th>
                    <th className="p-4">{t("location")}</th>
                    <th className="p-4">{t("burialDate")}</th>
                    <th className="p-4">{t("causeOfDeath")}</th>
                    <th className="p-4 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {filteredBurials.map((burial) => {
                    const isSanCarlos = burial.cementerio === "San Carlos";
                    return (
                      <tr key={burial.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold" style={{ color: "var(--color-text)" }}>
                          {burial.nombre}
                        </td>
                        <td className="p-4 font-mono font-medium text-muted-foreground">{burial.rut}</td>
                        <td className="p-4">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-xs"
                            style={{ backgroundColor: isSanCarlos ? "var(--color-primary)" : "#059669" }}
                          >
                            {burial.cementerio}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          <div className="font-semibold text-foreground">{burial.tipo}</div>
                          <div>Sec. {burial.sector} • Fila {burial.fila} • N° {burial.numero}</div>
                        </td>
                        <td className="p-4 text-muted-foreground">{burial.fecha_sepultacion}</td>
                        <td className="p-4">
                          <span className="italic text-muted-foreground select-none text-xs">
                            [Confidencial • Ley 21.719]
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setCertFolioInput(burial.folio);
                              handleVerifyCertificate(burial.folio);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold hover:opacity-80 transition-all text-primary"
                            style={{ borderColor: "var(--color-border)" }}
                            title="Verificar Certificado Oficial"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Verificar</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW B: AUTHENTICATED STAFF OPERATIONS DASHBOARD
  // ==========================================
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Cemetery Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {t("appSubtitle")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("appTitle")} • San Carlos & Cachapoal • Sesión: {currentUser?.nombre_completo || currentUser?.username || "Funcionario"}
          </p>
        </div>

        {/* Cemetery Filter Pills */}
        <div 
          className="p-1 rounded-2xl border flex items-center self-start shadow-xs"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <button
            onClick={() => setSelectedCemetery("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCemetery === "all" ? "text-white shadow-xs" : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
            style={{ backgroundColor: selectedCemetery === "all" ? "var(--color-primary)" : "transparent" }}
          >
            {t("allCemeteries")}
          </button>
          <button
            onClick={() => setSelectedCemetery("sancarlos")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCemetery === "sancarlos" ? "text-white shadow-xs" : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
            style={{ backgroundColor: selectedCemetery === "sancarlos" ? "var(--color-primary)" : "transparent" }}
          >
            San Carlos
          </button>
          <button
            onClick={() => setSelectedCemetery("cachapoal")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCemetery === "cachapoal" ? "text-white shadow-xs" : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
            style={{ backgroundColor: selectedCemetery === "cachapoal" ? "#059669" : "transparent" }}
          >
            Cachapoal
          </button>
        </div>
      </div>

      {/* Autocomplete Search Hero */}
      <div className="max-w-3xl mx-auto w-full text-center space-y-3">
        <label className="text-xs uppercase tracking-wider font-bold text-gray-400 block">
          {t("searchPlaceholder")}
        </label>
        <AutocompleteSearch />
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t("statTotalGraves")}
          value={selectedCemetery === "cachapoal" ? "2,150" : selectedCemetery === "sancarlos" ? "14,820" : "16,970"}
          subtitle="Pabellones, Patios, Bóvedas y SP4"
          icon={MapPin}
          accentColor="var(--color-primary)"
        />
        <StatCard
          title={t("statOccupied")}
          value={selectedCemetery === "cachapoal" ? "1,620" : selectedCemetery === "sancarlos" ? "11,430" : "13,050"}
          subtitle="76.9% territorial occupancy"
          icon={Users}
          badge="76.9%"
          badgeColor="amber"
          accentColor="#D97706"
        />
        <StatCard
          title={t("statAvailable")}
          value={selectedCemetery === "cachapoal" ? "530" : selectedCemetery === "sancarlos" ? "3,390" : "3,920"}
          subtitle="Ready for lease & assignment"
          icon={CheckCircle}
          badge={t("statusDisponible")}
          badgeColor="emerald"
          accentColor="#059669"
        />
        <StatCard
          title={t("statInhumations")}
          value="86,499"
          subtitle="Historical records migrated (R1–R12)"
          icon={Database}
          badge="Reconciled"
          badgeColor="blue"
          accentColor="var(--color-secondary)"
        />
      </div>

      {/* Cryptographic Audit Log Widget */}
      <AuditVerificationBadge />

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          href="/inhumaciones" 
          className="p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center justify-between"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl text-white shadow-xs" style={{ backgroundColor: "var(--color-primary)" }}>
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block" style={{ color: "var(--color-text)" }}>
                {t("registerBurial")}
              </span>
              <span className="text-xs text-gray-500">RUT Modulo 11 check</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400" />
        </Link>

        <Link 
          href="/ubicaciones" 
          className="p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center justify-between"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl text-white shadow-xs" style={{ backgroundColor: "#059669" }}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block" style={{ color: "var(--color-text)" }}>
                {t("allLocations")}
              </span>
              <span className="text-xs text-gray-500">GIS Quadrants & Niches</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400" />
        </Link>

        <Link 
          href="/admin/temas" 
          className="p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center justify-between"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl text-white shadow-xs" style={{ backgroundColor: "var(--color-accent)" }}>
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block" style={{ color: "var(--color-text)" }}>
                {t("navAdminTemas")}
              </span>
              <span className="text-xs text-gray-500">Day/Night & Customizer</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400" />
        </Link>

        <Link 
          href="/auditoria" 
          className="p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center justify-between"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl text-white shadow-xs" style={{ backgroundColor: "#6366F1" }}>
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block" style={{ color: "var(--color-text)" }}>
                {t("exitPackageTitle")}
              </span>
              <span className="text-xs text-gray-500">SQL Dump, CSVs & ZIP</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-400" />
        </Link>
      </div>

      {/* Recent Burials Table with Confidentiality Masking Toggle */}
      <div 
        className="rounded-2xl border overflow-hidden shadow-sm transition-colors"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div 
          className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div>
            <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
              {t("recentBurials")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Verified registrations in official death ledger
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Privacy Toggle Button */}
            <button
              onClick={() => setMaskCause(!maskCause)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:opacity-90"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: maskCause ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)",
                color: maskCause ? "#D97706" : "#059669"
              }}
              title={maskCause ? "Visitor mode active: cause of death masked" : "Administrator mode: cause visible"}
            >
              {maskCause ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{maskCause ? t("toggleCausePrivacy") : "Admin Mode (Visible)"}</span>
            </button>

            <Link
              href="/inhumaciones"
              className="text-xs font-bold hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              Ver todas →
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead 
              className="text-xs uppercase font-semibold text-gray-400 border-b"
              style={{ borderColor: "var(--color-border)", backgroundColor: isDarkMode ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)" }}
            >
              <tr>
                <th className="p-3.5 sm:px-4">{t("deceasedName")}</th>
                <th className="p-3.5 sm:px-4">{t("rut")}</th>
                <th className="p-3.5 sm:px-4">Cementerio</th>
                <th className="p-3.5 sm:px-4">{t("location")}</th>
                <th className="p-3.5 sm:px-4">{t("burialDate")}</th>
                <th className="p-3.5 sm:px-4">{t("causeOfDeath")}</th>
                <th className="p-3.5 sm:px-4 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {filteredBurials.map((burial) => {
                const isSanCarlos = burial.cementerio === "San Carlos";
                return (
                  <tr key={burial.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3.5 sm:px-4 font-bold" style={{ color: "var(--color-text)" }}>
                      {burial.nombre}
                    </td>
                    <td className="p-3.5 sm:px-4 font-mono font-medium text-gray-600 dark:text-gray-300">
                      {burial.rut}
                    </td>
                    <td className="p-3.5 sm:px-4">
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-xs"
                        style={{ backgroundColor: isSanCarlos ? "var(--color-primary)" : "#059669" }}
                      >
                        {burial.cementerio}
                      </span>
                    </td>
                    <td className="p-3.5 sm:px-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="font-semibold text-gray-700 dark:text-gray-200">{burial.tipo}</div>
                      <div>Sec. {burial.sector} • Fila {burial.fila} • N° {burial.numero}</div>
                    </td>
                    <td className="p-3.5 sm:px-4 text-gray-600 dark:text-gray-300">
                      {burial.fecha_sepultacion}
                    </td>
                    <td className="p-3.5 sm:px-4">
                      {maskCause ? (
                        <span className="italic text-gray-400 select-none text-xs">
                          [{t("visitorMaskNotice")}]
                        </span>
                      ) : (
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {burial.causa}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 sm:px-4 text-right">
                      <button 
                        className="p-1.5 rounded-lg border hover:opacity-75 transition-all"
                        style={{ borderColor: "var(--color-border)" }}
                        title="Ver Ficha / Folio"
                      >
                        <FileText className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
