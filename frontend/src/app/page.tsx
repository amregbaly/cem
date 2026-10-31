"use client";

import React, { useState } from "react";
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
  FileText
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import AutocompleteSearch from "@/components/AutocompleteSearch";
import StatCard from "@/components/StatCard";
import AuditVerificationBadge from "@/components/AuditVerificationBadge";

export default function DashboardPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const [selectedCemetery, setSelectedCemetery] = useState<"all" | "sancarlos" | "cachapoal">("all");
  const [maskCause, setMaskCause] = useState<boolean>(true);

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

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header & Cemetery Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {t("appSubtitle")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("appTitle")} • Plataforma Web de Control y Registro Municipal
          </p>
        </div>

        {/* Cemetery Filter Pills */}
        <div 
          className="p-1 rounded-2xl border flex items-center self-start"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <button
            onClick={() => setSelectedCemetery("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCemetery === "all" ? "text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
            style={{ backgroundColor: selectedCemetery === "all" ? "var(--color-primary)" : "transparent" }}
          >
            {t("allCemeteries")}
          </button>
          <button
            onClick={() => setSelectedCemetery("sancarlos")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCemetery === "sancarlos" ? "text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
            style={{ backgroundColor: selectedCemetery === "sancarlos" ? "var(--color-primary)" : "transparent" }}
          >
            San Carlos
          </button>
          <button
            onClick={() => setSelectedCemetery("cachapoal")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCemetery === "cachapoal" ? "text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
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
          Búsqueda Instantánea con Índices Trigram (pg_trgm)
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
          subtitle="76.9% de ocupación territorial"
          icon={Users}
          badge="76.9%"
          badgeColor="amber"
          accentColor="#D97706"
        />
        <StatCard
          title={t("statAvailable")}
          value={selectedCemetery === "cachapoal" ? "530" : selectedCemetery === "sancarlos" ? "3,390" : "3,920"}
          subtitle="Nivel 1 al 4 listos para asignación"
          icon={CheckCircle}
          badge="Disponible"
          badgeColor="emerald"
          accentColor="#059669"
        />
        <StatCard
          title={t("statInhumations")}
          value="86,499"
          subtitle="Registros históricos migrados (R1–R12)"
          icon={Database}
          badge="Conciliado"
          badgeColor="blue"
          accentColor="var(--color-secondary)"
        />
      </div>

      {/* Cryptographic Audit Log Widget */}
      <AuditVerificationBadge />

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link 
          href="/inhumaciones" 
          className="p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center justify-between"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl text-white shadow-sm" style={{ backgroundColor: "var(--color-primary)" }}>
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block" style={{ color: "var(--color-text)" }}>
                {t("registerBurial")}
              </span>
              <span className="text-xs text-gray-500">Con validación RUT Módulo 11</span>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-400" />
        </Link>

        <Link 
          href="/ubicaciones" 
          className="p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center justify-between"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl text-white shadow-sm" style={{ backgroundColor: "#059669" }}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block" style={{ color: "var(--color-text)" }}>
                {t("allLocations")}
              </span>
              <span className="text-xs text-gray-500">Visualizar cuadrantes y nichos</span>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-400" />
        </Link>

        <Link 
          href="/admin/temas" 
          className="p-5 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 flex items-center justify-between"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl text-white shadow-sm" style={{ backgroundColor: "var(--color-accent)" }}>
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block" style={{ color: "var(--color-text)" }}>
                {t("navAdminTemas")}
              </span>
              <span className="text-xs text-gray-500">Colores, Día/Noche y Temas</span>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-gray-400" />
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
              Últimas inscripciones validadas en el libro matriz de defunciones
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
              title={maskCause ? "Modo Visitante activo: causa de muerte protegida" : "Modo Administrador: causa visible"}
            >
              {maskCause ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{maskCause ? t("toggleCausePrivacy") : "Modo Admin (Visible)"}</span>
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
                        className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
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
                        <span className="italic text-gray-400 select-none">
                          [Protegido Art. 12 Ley 20.584]
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
