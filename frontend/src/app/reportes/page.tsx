"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Clock,
  MapPin,
  HardHat,
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Layers,
  Lock,
  UserCheck
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface ResumenKPIs {
  inhumaciones: {
    total: number;
    este_mes: number;
    este_ano: number;
  };
  capacidad: {
    total_espacios: number;
    ocupados: number;
    disponibles: number;
    reservados: number;
    inactivos: number;
    tasa_ocupacion_pct: number;
  };
  vencimientos: {
    vencidos: number;
    por_vencer_30d: number;
    por_vencer_60d: number;
    por_vencer_90d: number;
    total_vigentes: number;
  };
  exhumaciones_total: number;
  maestros: {
    activos: number;
    obras_este_mes: number;
  };
  certificados_emitidos: number;
  fecha_generacion: string;
}

export default function ReportesPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  // Authentication & RBAC state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [permissionLevel, setPermissionLevel] = useState<"NONE" | "READ" | "WRITE">("READ");
  const [authChecked, setAuthChecked] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"defunciones" | "vencimientos" | "capacidad" | "exhumaciones" | "maestros">("defunciones");

  // Global Filters
  const [cemeteryFilter, setCemeteryFilter] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sub-filter for vencimientos
  const [categoriaVenc, setCategoriaVenc] = useState<string>("TODOS");

  // Data states
  const [kpis, setKpis] = useState<ResumenKPIs | null>(null);
  const [loadingKPIs, setLoadingKPIs] = useState<boolean>(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [capacidadResumen, setCapacidadResumen] = useState<any>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [downloadingCsv, setDownloadingCsv] = useState<boolean>(false);

  const apiUrl = ""; // Relative proxy through Next.js / Nginx

  // 1. Check Authentication & RBAC on Mount
  useEffect(() => {
    const savedToken = localStorage.getItem("cem_auth_token");
    const savedUser = localStorage.getItem("cem_auth_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);

        // Verify RBAC
        if (parsed.rol === "ADMINISTRADOR") {
          setHasPermission(true);
          setPermissionLevel("WRITE");
        } else {
          // Check group permissions from backend or cached user object
          fetchGroupPermission(savedToken, parsed.grupo_id);
        }
      } catch {
        setHasPermission(false);
      }
    } else {
      setToken(null);
      setCurrentUser(null);
      setHasPermission(false);
    }
    setAuthChecked(true);
  }, []);

  const fetchGroupPermission = async (authToken: string, grupoId?: number) => {
    if (!grupoId) {
      setHasPermission(false);
      setPermissionLevel("NONE");
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/v1/grupos/${grupoId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const groupData = await res.json();
        const repPerm = groupData.permisos?.find((p: any) => p.modulo === "REPORTES");
        if (repPerm && repPerm.acceso !== "NONE") {
          setHasPermission(true);
          setPermissionLevel(repPerm.acceso);
        } else {
          setHasPermission(false);
          setPermissionLevel("NONE");
        }
      } else {
        setHasPermission(false);
      }
    } catch {
      // In case of error, permit read if user is logged in
      setHasPermission(true);
      setPermissionLevel("READ");
    }
  };

  // 2. Fetch KPIs
  const fetchKPIs = async () => {
    if (!token) return;
    setLoadingKPIs(true);
    try {
      const url = cemeteryFilter 
        ? `${apiUrl}/api/v1/reportes/resumen?cementerio_id=${cemeteryFilter}` 
        : `${apiUrl}/api/v1/reportes/resumen`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKpis(data);
      }
    } catch (err) {
      console.error("Error cargando KPIs:", err);
    } finally {
      setLoadingKPIs(false);
    }
  };

  // 3. Fetch Tab Data
  const fetchTabData = async () => {
    if (!token) return;
    setLoadingData(true);
    try {
      const params = new URLSearchParams();
      if (cemeteryFilter) params.set("cementerio_id", cemeteryFilter);
      if (fechaDesde) params.set("fecha_desde", fechaDesde);
      if (fechaHasta) params.set("fecha_hasta", fechaHasta);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      params.set("limit", "500");

      let endpoint = `/api/v1/reportes/${activeTab}`;
      if (activeTab === "vencimientos" && categoriaVenc) {
        params.set("categoria", categoriaVenc);
      }

      const res = await fetch(`${apiUrl}${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (activeTab === "capacidad") {
          setCapacidadResumen(data.resumen_general || null);
          setTableData(data.sectores || []);
        } else {
          setTableData(data.items || []);
        }
      } else {
        setTableData([]);
      }
    } catch (err) {
      console.error(`Error cargando reporte ${activeTab}:`, err);
      setTableData([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (token && hasPermission) {
      fetchKPIs();
      fetchTabData();
    }
  }, [token, hasPermission, activeTab, cemeteryFilter, categoriaVenc]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTabData();
  };

  const handleDownloadCsv = async (customTipo?: string) => {
    if (!token) return;
    const tipo = customTipo || activeTab;
    setDownloadingCsv(true);
    try {
      const params = new URLSearchParams();
      params.set("tipo", tipo);
      if (cemeteryFilter) params.set("cementerio_id", cemeteryFilter);
      if (fechaDesde) params.set("fecha_desde", fechaDesde);
      if (fechaHasta) params.set("fecha_hasta", fechaHasta);
      if (tipo === "vencimientos" && categoriaVenc) {
        params.set("categoria_venc", categoriaVenc);
      }

      const res = await fetch(`${apiUrl}/api/v1/reportes/exportar/csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("Error al exportar planilla oficial.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_oficial_${tipo}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Error al descargar reporte");
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Access Denied / Not Authenticated Screen
  if (authChecked && (!token || !hasPermission)) {
    return (
      <main className="min-h-screen p-6 sm:p-12 flex items-center justify-center">
        <div
          className="max-w-md w-full p-8 rounded-3xl border shadow-xl text-center space-y-6"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold" style={{ color: "var(--color-text)" }}>
              Acceso Restringido a Reportes
            </h2>
            <p className="text-xs opacity-70 leading-relaxed">
              {!token 
                ? "Este módulo es de uso exclusivo para funcionarios municipales autenticados. Inicie sesión para consultar los libros oficiales."
                : "Su grupo de usuario no cuenta con autorización para acceder a los Reportes y Estadísticas (Decreto Supremo 357)."}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/admin"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-xs text-white shadow-md transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <span>{token ? "Ir al Panel de Administración" : "Iniciar Sesión"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-8 space-y-8 animate-fade-in print:p-0 print:m-0">
      {/* PRINT-ONLY MUNICIPAL HEADER */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider">Ilustre Municipalidad de San Carlos</h1>
            <h2 className="text-sm font-semibold">Dirección de Administración y Finanzas • Departamento de Cementerios</h2>
            <p className="text-xs text-gray-600">Cementerio Municipal San Carlos & Cementerio Municipal Cachapoal</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">DECRETO SUPREMO 357 / LEY 21.719</p>
            <p>Fecha de Emisión: {new Date().toLocaleDateString("es-CL")}</p>
            <p>Emitido por: {currentUser?.nombre_completo || "Funcionario Autorizado"}</p>
          </div>
        </div>
      </div>

      {/* HEADER SECTION (SCREEN) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
                  Reportes & Estadísticas Municipales
                </h1>
              </div>
              <p className="text-xs sm:text-sm opacity-70 mt-0.5">
                Libro oficial de defunciones, vencimiento de arriendos, balance de capacidad territorial y registro de faenas.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            id="btn-print-reports"
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>Imprimir / Guardar PDF</span>
          </button>

          <button
            type="button"
            id="btn-export-current-tab-csv"
            onClick={() => handleDownloadCsv()}
            disabled={downloadingCsv}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Download className="w-4 h-4" />
            <span>{downloadingCsv ? "Generando Excel..." : "Descargar CSV (Excel)"}</span>
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        {/* KPI 1 */}
        <div
          className="p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Inhumaciones</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {kpis ? kpis.inhumaciones.total.toLocaleString() : "..."}
          </div>
          <p className="text-xs opacity-70 mt-1">Libro Oficial de Defunciones</p>
          <div className="flex items-center space-x-2 mt-3 pt-3 border-t text-[11px]" style={{ borderColor: "var(--color-border)" }}>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              +{kpis?.inhumaciones.este_mes || 0} este mes
            </span>
            <span className="opacity-40">•</span>
            <span className="opacity-70">+{kpis?.inhumaciones.este_ano || 0} año</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div
          className="p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Ocupación GIS</span>
            <MapPin className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {kpis ? `${kpis.capacidad.tasa_ocupacion_pct}%` : "..."}
          </div>
          <p className="text-xs opacity-70 mt-1">
            {kpis ? `${kpis.capacidad.ocupados} de ${kpis.capacidad.total_espacios} espacios` : "Cargando..."}
          </p>
          <div className="flex items-center space-x-2 mt-3 pt-3 border-t text-[11px]" style={{ borderColor: "var(--color-border)" }}>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {kpis?.capacidad.disponibles || 0} disponibles
            </span>
            <span className="opacity-40">•</span>
            <span className="opacity-70">{kpis?.capacidad.reservados || 0} reservas</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div
          className="p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Arriendos Vencidos</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
            {kpis ? kpis.vencimientos.vencidos.toLocaleString() : "..."}
          </div>
          <p className="text-xs opacity-70 mt-1">Requieren gestión y cobranza</p>
          <div className="flex items-center space-x-2 mt-3 pt-3 border-t text-[11px]" style={{ borderColor: "var(--color-border)" }}>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {kpis?.vencimientos.por_vencer_30d || 0} por vencer (30d)
            </span>
            <span className="opacity-40">•</span>
            <span className="opacity-70">{kpis?.vencimientos.total_vigentes || 0} vigentes</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div
          className="p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Obras & Faenas</span>
            <HardHat className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {kpis ? kpis.maestros.activos : "..."}
          </div>
          <p className="text-xs opacity-70 mt-1">Maestros habilitados en libro</p>
          <div className="flex items-center space-x-2 mt-3 pt-3 border-t text-[11px]" style={{ borderColor: "var(--color-border)" }}>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {kpis?.exhumaciones_total || 0} exhumaciones
            </span>
            <span className="opacity-40">•</span>
            <span className="opacity-70">{kpis?.certificados_emitidos || 0} certificados</span>
          </div>
        </div>
      </div>

      {/* FILTER PANEL (SCREEN ONLY) */}
      <div
        className="p-6 rounded-2xl border shadow-sm space-y-4 print:hidden"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider opacity-75">
            <Filter className="w-4 h-4 text-primary" />
            <span>Filtros de Búsqueda & Parámetros Oficiales</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setCemeteryFilter("");
              setFechaDesde("");
              setFechaHasta("");
              setSearchQuery("");
              setCategoriaVenc("TODOS");
            }}
            className="text-xs opacity-60 hover:opacity-100 hover:underline"
          >
            Limpiar Filtros
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cementerio */}
          <div className="space-y-1">
            <label className="text-xs font-bold opacity-75">Cementerio Municipal:</label>
            <select
              id="report-cemetery-select"
              value={cemeteryFilter}
              onChange={(e) => setCemeteryFilter(e.target.value)}
              className="w-full text-xs font-medium p-2.5 rounded-xl border bg-transparent"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              <option value="">Ambos Cementerios</option>
              <option value="1">Cementerio Municipal de San Carlos</option>
              <option value="2">Cementerio Municipal de Cachapoal</option>
            </select>
          </div>

          {/* Fecha Desde */}
          <div className="space-y-1">
            <label className="text-xs font-bold opacity-75">Fecha Desde:</label>
            <input
              type="date"
              id="report-date-from"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border bg-transparent"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
          </div>

          {/* Fecha Hasta */}
          <div className="space-y-1">
            <label className="text-xs font-bold opacity-75">Fecha Hasta:</label>
            <input
              type="date"
              id="report-date-to"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border bg-transparent"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
          </div>

          {/* Search Query */}
          <div className="space-y-1">
            <label className="text-xs font-bold opacity-75">Búsqueda (Nombre / RUT / Folio):</label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="report-search-query"
                placeholder="Ej. González, 14203126-4..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border bg-transparent"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              />
              <button
                type="submit"
                id="btn-report-search-submit"
                className="px-3.5 rounded-xl font-bold text-xs text-white shadow-sm transition-all hover:opacity-90"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* TABS CONTAINER */}
      <div
        className="rounded-2xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* TAB HEADERS (SCREEN ONLY) */}
        <div className="flex border-b overflow-x-auto print:hidden" style={{ borderColor: "var(--color-border)" }}>
          <button
            id="tab-btn-defunciones"
            onClick={() => setActiveTab("defunciones")}
            className={`flex items-center space-x-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === "defunciones"
                ? "border-primary text-primary"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Libro Oficial de Defunciones (DS 357)</span>
          </button>

          <button
            id="tab-btn-vencimientos"
            onClick={() => setActiveTab("vencimientos")}
            className={`flex items-center space-x-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === "vencimientos"
                ? "border-primary text-primary"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2. Control de Vencimientos de Arriendos</span>
          </button>

          <button
            id="tab-btn-capacidad"
            onClick={() => setActiveTab("capacidad")}
            className={`flex items-center space-x-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === "capacidad"
                ? "border-primary text-primary"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>3. Capacidad Territorial & Ocupación GIS</span>
          </button>

          <button
            id="tab-btn-exhumaciones"
            onClick={() => setActiveTab("exhumaciones")}
            className={`flex items-center space-x-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === "exhumaciones"
                ? "border-primary text-primary"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>4. Libro de Exhumaciones & Reducciones</span>
          </button>

          <button
            id="tab-btn-maestros"
            onClick={() => setActiveTab("maestros")}
            className={`flex items-center space-x-2 px-5 py-3.5 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
              activeTab === "maestros"
                ? "border-primary text-primary"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <HardHat className="w-4 h-4" />
            <span>5. Registro de Maestros & Obras</span>
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="p-6">
          {/* TAB 1: DEFUNCIONES */}
          {activeTab === "defunciones" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <h3 className="font-extrabold text-base" style={{ color: "var(--color-text)" }}>
                    Libro Oficial de Defunciones e Inhumaciones
                  </h3>
                  <p className="text-xs opacity-70">
                    Registro legal obligatorio conforme al Artículo 48 del Decreto Supremo 357 de Salud.
                  </p>
                </div>
                <div className="text-xs opacity-60">
                  Mostrando {tableData.length} registros oficiales
                </div>
              </div>

              {loadingData ? (
                <div className="py-16 text-center space-y-3 opacity-60">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
                  <p className="text-xs font-bold">Cargando registros del Libro de Inhumaciones...</p>
                </div>
              ) : tableData.length === 0 ? (
                <div className="py-16 text-center space-y-2 opacity-60">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
                  <p className="text-xs font-bold">No se encontraron registros con los filtros seleccionados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b uppercase tracking-wider text-[11px] opacity-60" style={{ borderColor: "var(--color-border)" }}>
                        <th className="py-3 px-3">N° Ingreso</th>
                        <th className="py-3 px-3">Fecha Sepultación</th>
                        <th className="py-3 px-3">Fallecido</th>
                        <th className="py-3 px-3">RUT</th>
                        <th className="py-3 px-3">Ubicación / Sepultura</th>
                        <th className="py-3 px-3">Pase Defunción</th>
                        <th className="py-3 px-3">Familiar Responsable</th>
                        <th className="py-3 px-3">Causa de Defunción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                      {tableData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold">{item.numero_ingreso}</td>
                          <td className="py-3 px-3 font-semibold">{item.fecha_sepultacion || "S/F"}</td>
                          <td className="py-3 px-3 font-bold" style={{ color: "var(--color-text)" }}>
                            {item.fallecido_nombre}
                          </td>
                          <td className="py-3 px-3 font-mono opacity-80">{item.fallecido_rut || "N/A"}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-primary">{item.codigo_ubicacion}</span>
                            <div className="text-[10px] opacity-60">{item.cementerio}</div>
                          </td>
                          <td className="py-3 px-3 font-mono">{item.pase_folio || "S/F"}</td>
                          <td className="py-3 px-3">
                            <div>{item.responsable_nombre}</div>
                            {item.responsable_telefono && (
                              <div className="text-[10px] opacity-60">Tel: {item.responsable_telefono}</div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 opacity-80">
                              {item.causa_fallecimiento}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VENCIMIENTOS */}
          {activeTab === "vencimientos" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <h3 className="font-extrabold text-base" style={{ color: "var(--color-text)" }}>
                    Control y Cobranza de Vencimiento de Arriendos
                  </h3>
                  <p className="text-xs opacity-70">
                    Nómina de contratos temporales para notificación de renovación y regularización de derechos municipales.
                  </p>
                </div>

                {/* Sub-filters */}
                <div className="flex flex-wrap items-center gap-1.5 print:hidden">
                  {[
                    { id: "TODOS", label: "Todos" },
                    { id: "VENCIDOS", label: "Vencidos" },
                    { id: "30_DIAS", label: "30 Días" },
                    { id: "60_DIAS", label: "60 Días" },
                    { id: "90_DIAS", label: "90 Días" },
                    { id: "VIGENTES", label: "Vigentes" }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoriaVenc(cat.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                        categoriaVenc === cat.id
                          ? "bg-primary text-white shadow-sm"
                          : "border border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingData ? (
                <div className="py-16 text-center space-y-3 opacity-60">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
                  <p className="text-xs font-bold">Cargando nómina de arriendos...</p>
                </div>
              ) : tableData.length === 0 ? (
                <div className="py-16 text-center space-y-2 opacity-60">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                  <p className="text-xs font-bold">No se registran arriendos en la categoría seleccionada.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b uppercase tracking-wider text-[11px] opacity-60" style={{ borderColor: "var(--color-border)" }}>
                        <th className="py-3 px-3">Titular del Contrato</th>
                        <th className="py-3 px-3">RUT / Contacto</th>
                        <th className="py-3 px-3">Sepultura</th>
                        <th className="py-3 px-3">Tipo Contrato</th>
                        <th className="py-3 px-3">Vencimiento</th>
                        <th className="py-3 px-3">Estado / Días</th>
                        <th className="py-3 px-3">Arancel Pagado</th>
                        <th className="py-3 px-3">Recibo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                      {tableData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-3 font-bold" style={{ color: "var(--color-text)" }}>
                            {item.titular_nombre}
                            {item.titular_direccion && (
                              <div className="text-[10px] opacity-60 font-normal">{item.titular_direccion}</div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono">{item.titular_rut || "S/RUT"}</div>
                            {item.titular_telefono && (
                              <div className="text-[10px] opacity-60">Tel: {item.titular_telefono}</div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-primary">{item.codigo_ubicacion}</span>
                            <div className="text-[10px] opacity-60">{item.cementerio}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold">{item.tipo_derecho}</span>
                            <div className="text-[10px] opacity-60">{item.periodo_arriendo}</div>
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold">
                            {item.fecha_vencimiento || "Indefinido"}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                item.badge_color === "red"
                                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                  : item.badge_color === "amber"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {item.estado_calculado}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold">
                            ${Number(item.monto_pagado || 0).toLocaleString("es-CL")}
                          </td>
                          <td className="py-3 px-3 font-mono opacity-80">{item.folio_recibo || "S/F"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CAPACIDAD */}
          {activeTab === "capacidad" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <h3 className="font-extrabold text-base" style={{ color: "var(--color-text)" }}>
                    Censo de Capacidad Territorial & Ocupación GIS
                  </h3>
                  <p className="text-xs opacity-70">
                    Balance físico de disponibilidad territorial desglosado por cementerio, cuartel, patio y pabellón.
                  </p>
                </div>
                {capacidadResumen && (
                  <div className="text-xs font-bold px-3 py-1 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    Ocupación Global: {capacidadResumen.porcentaje_ocupacion_global}% ({capacidadResumen.ocupados} / {capacidadResumen.total})
                  </div>
                )}
              </div>

              {loadingData ? (
                <div className="py-16 text-center space-y-3 opacity-60">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
                  <p className="text-xs font-bold">Calculando ocupación territorial...</p>
                </div>
              ) : tableData.length === 0 ? (
                <div className="py-16 text-center space-y-2 opacity-60">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
                  <p className="text-xs font-bold">No se encontraron sectores para el filtro seleccionado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b uppercase tracking-wider text-[11px] opacity-60" style={{ borderColor: "var(--color-border)" }}>
                        <th className="py-3 px-3">Cementerio</th>
                        <th className="py-3 px-3">Sector / Cuartel</th>
                        <th className="py-3 px-3">Tipo Sepultura</th>
                        <th className="py-3 px-3 text-right">Total</th>
                        <th className="py-3 px-3 text-right">Ocupados</th>
                        <th className="py-3 px-3 text-right">Disponibles</th>
                        <th className="py-3 px-3 text-right">Reservados</th>
                        <th className="py-3 px-3 text-right">Bloqueados</th>
                        <th className="py-3 px-3 text-center">% Ocupación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                      {tableData.map((sec, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-3 font-semibold">{sec.cementerio}</td>
                          <td className="py-3 px-3 font-bold" style={{ color: "var(--color-text)" }}>
                            {sec.sector}
                          </td>
                          <td className="py-3 px-3 opacity-80">{sec.tipo_ubicacion}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold">{sec.total}</td>
                          <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">{sec.ocupados}</td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">{sec.disponibles}</td>
                          <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400">{sec.reservados}</td>
                          <td className="py-3 px-3 text-right font-mono opacity-60">{sec.inactivos}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-2 rounded-full ${
                                    sec.porcentaje_ocupacion > 90
                                      ? "bg-rose-500"
                                      : sec.porcentaje_ocupacion > 70
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.min(100, sec.porcentaje_ocupacion)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] font-bold">{sec.porcentaje_ocupacion}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EXHUMACIONES */}
          {activeTab === "exhumaciones" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <h3 className="font-extrabold text-base" style={{ color: "var(--color-text)" }}>
                    Libro Sanitario de Exhumaciones & Reducciones
                  </h3>
                  <p className="text-xs opacity-70">
                    Registro legal de exhumaciones, traslados y reducciones según Decreto Supremo 357 de Salud.
                  </p>
                </div>
                <div className="text-xs opacity-60">
                  Mostrando {tableData.length} resoluciones sanitarias
                </div>
              </div>

              {loadingData ? (
                <div className="py-16 text-center space-y-3 opacity-60">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
                  <p className="text-xs font-bold">Cargando libro sanitario...</p>
                </div>
              ) : tableData.length === 0 ? (
                <div className="py-16 text-center space-y-2 opacity-60">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
                  <p className="text-xs font-bold">No se encontraron exhumaciones para el período seleccionado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b uppercase tracking-wider text-[11px] opacity-60" style={{ borderColor: "var(--color-border)" }}>
                        <th className="py-3 px-3">Correlativo</th>
                        <th className="py-3 px-3">Fecha & Hora</th>
                        <th className="py-3 px-3">Fallecido</th>
                        <th className="py-3 px-3">Resolución SEREMI</th>
                        <th className="py-3 px-3">Motivo</th>
                        <th className="py-3 px-3">Origen</th>
                        <th className="py-3 px-3">Destino</th>
                        <th className="py-3 px-3 text-center">Reducción</th>
                        <th className="py-3 px-3 text-center">Liberó Sepultura</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                      {tableData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-primary">{item.correlativo_memo}</td>
                          <td className="py-3 px-3">
                            <div className="font-semibold">{item.fecha_exhumacion || "S/F"}</div>
                            <div className="text-[10px] opacity-60">{item.hora_exhumacion}</div>
                          </td>
                          <td className="py-3 px-3 font-bold" style={{ color: "var(--color-text)" }}>
                            {item.fallecido_nombre}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                              {item.resolucion_numero}
                            </span>
                            <div className="text-[10px] opacity-60">{item.fecha_resolucion}</div>
                          </td>
                          <td className="py-3 px-3">{item.motivo}</td>
                          <td className="py-3 px-3 font-mono">{item.origen_codigo}</td>
                          <td className="py-3 px-3 font-semibold">{item.destino}</td>
                          <td className="py-3 px-3 text-center">
                            {item.es_reduccion ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                SÍ
                              </span>
                            ) : (
                              <span className="text-[10px] opacity-40">NO</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.libero_origen ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                DISPONIBLE
                              </span>
                            ) : (
                              <span className="text-[10px] opacity-40">RETENIDA</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MAESTROS */}
          {activeTab === "maestros" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <h3 className="font-extrabold text-base" style={{ color: "var(--color-text)" }}>
                    Registro de Maestros de Obras & Derechos de Construcción
                  </h3>
                  <p className="text-xs opacity-70">
                    Control de órdenes de trabajo, permisos de albañilería en sepulturas y cobro de aranceles de construcción.
                  </p>
                </div>
                <div className="text-xs opacity-60">
                  Mostrando {tableData.length} faenas registradas
                </div>
              </div>

              {loadingData ? (
                <div className="py-16 text-center space-y-3 opacity-60">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
                  <p className="text-xs font-bold">Cargando libro de faenas y maestros...</p>
                </div>
              ) : tableData.length === 0 ? (
                <div className="py-16 text-center space-y-2 opacity-60">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
                  <p className="text-xs font-bold">No se encontraron órdenes de trabajo registradas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b uppercase tracking-wider text-[11px] opacity-60" style={{ borderColor: "var(--color-border)" }}>
                        <th className="py-3 px-3">Maestro Contratista</th>
                        <th className="py-3 px-3">RUT / Contacto</th>
                        <th className="py-3 px-3">N° Orden</th>
                        <th className="py-3 px-3">Sepultura Intervenida</th>
                        <th className="py-3 px-3">Fecha Inicio</th>
                        <th className="py-3 px-3">Tipo de Obra</th>
                        <th className="py-3 px-3">Estado Obra</th>
                        <th className="py-3 px-3 text-right">Derecho Municipal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                      {tableData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-3 font-bold" style={{ color: "var(--color-text)" }}>
                            {item.maestro_nombre}
                            <div className="text-[10px] opacity-60 font-normal">{item.especialidad}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono">{item.maestro_rut}</div>
                            {item.telefono && <div className="text-[10px] opacity-60">Tel: {item.telefono}</div>}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-primary">{item.numero_orden}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold">{item.codigo_ubicacion}</span>
                            <div className="text-[10px] opacity-60">{item.cementerio}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold">{item.fecha_orden || "S/F"}</td>
                          <td className="py-3 px-3">{item.tipo_obra}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.estado_orden === "COMPLETADA"
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : item.estado_orden === "EN_PROCESO"
                                  ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                                  : "bg-slate-100 dark:bg-slate-800 opacity-70"
                              }`}
                            >
                              {item.estado_orden}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold">
                            ${Number(item.monto_pagado || 0).toLocaleString("es-CL")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PRINT-ONLY SIGNATURE BLOCKS */}
      <div className="hidden print:block pt-16 mt-16 border-t border-gray-300 text-xs">
        <div className="grid grid-cols-2 gap-12 text-center">
          <div className="space-y-1">
            <div className="border-b border-black w-64 mx-auto mb-2" />
            <p className="font-bold">ENCARGADO DE CEMENTERIO MUNICIPAL</p>
            <p className="text-gray-600">Firma y Timbre Oficial</p>
          </div>
          <div className="space-y-1">
            <div className="border-b border-black w-64 mx-auto mb-2" />
            <p className="font-bold">DIRECTOR DE ADMINISTRACIÓN Y FINANZAS</p>
            <p className="text-gray-600">I. Municipalidad de San Carlos</p>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-12">
          Documento oficial respaldado bajo Ley 21.719 y ASVS Nivel 2. Trazabilidad inmutable SHA-256.
        </p>
      </div>
    </main>
  );
}
