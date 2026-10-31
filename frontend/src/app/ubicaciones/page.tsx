"use client";

import React, { useState } from "react";
import { 
  MapPin, 
  Search, 
  Filter, 
  Building2, 
  Layers, 
  UserCheck, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  X,
  FileCheck,
  Grid,
  Map as MapIcon
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { CemeteryMap } from "@/components/CemeteryMap";
import { PropertyDetailDrawer, SlotDossier } from "@/components/PropertyDetailDrawer";
import AutocompleteSearch, { AutocompleteResult } from "@/components/AutocompleteSearch";

interface GraveLocation {
  id: number;
  cementerio: string;
  tipo: "PAB" | "PAT" | "BOV" | "SP4" | "PCO";
  tipo_nombre: string;
  sector: string;
  fila: string;
  numero: string;
  nivel?: number;
  capacidad: number;
  ocupantes: number;
  estado: "DISPONIBLE" | "OCUPADO" | "VENCIDO" | "RESERVADO";
  tipo_derecho?: "PERPETUO" | "ARRIENDO_5Y" | "ARRIENDO_20Y" | "ARRIENDO_2M";
  fecha_vencimiento?: string;
  ocupante_principal?: string;
  rut_ocupante?: string;
}

const SAMPLE_LOCATIONS: GraveLocation[] = [
  {
    id: 1,
    cementerio: "San Carlos",
    tipo: "PAB",
    tipo_nombre: "Pabellón de Nichos",
    sector: "PAB-A",
    fila: "01",
    numero: "001",
    nivel: 1,
    capacidad: 1,
    ocupantes: 1,
    estado: "OCUPADO",
    tipo_derecho: "PERPETUO",
    ocupante_principal: "MANUEL JESUS MUÑOZ SEPULVEDA",
    rut_ocupante: "7.842.119-4"
  },
  {
    id: 2,
    cementerio: "San Carlos",
    tipo: "PAB",
    tipo_nombre: "Pabellón de Nichos",
    sector: "PAB-A",
    fila: "01",
    numero: "002",
    nivel: 1,
    capacidad: 1,
    ocupantes: 0,
    estado: "DISPONIBLE"
  },
  {
    id: 3,
    cementerio: "San Carlos",
    tipo: "PAB",
    tipo_nombre: "Pabellón de Nichos",
    sector: "PAB-A",
    fila: "01",
    numero: "004",
    nivel: 1,
    capacidad: 1,
    ocupantes: 1,
    estado: "VENCIDO",
    tipo_derecho: "ARRIENDO_5Y",
    fecha_vencimiento: "2026-11-15",
    ocupante_principal: "CARLOS ALBERTO PINO RIQUELME",
    rut_ocupante: "6.912.304-2"
  },
  {
    id: 4,
    cementerio: "San Carlos",
    tipo: "PAT",
    tipo_nombre: "Patio Común",
    sector: "PAT-01",
    fila: "12",
    numero: "088",
    capacidad: 1,
    ocupantes: 1,
    estado: "OCUPADO",
    tipo_derecho: "ARRIENDO_2M",
    fecha_vencimiento: "2026-12-26",
    ocupante_principal: "MARIA DEL CARMEN YAÑEZ VENEGAS",
    rut_ocupante: "11.239.812-K"
  },
  {
    id: 5,
    cementerio: "San Carlos",
    tipo: "PAT",
    tipo_nombre: "Patio Común",
    sector: "PAT-01",
    fila: "12",
    numero: "089",
    capacidad: 1,
    ocupantes: 0,
    estado: "DISPONIBLE"
  },
  {
    id: 6,
    cementerio: "Cachapoal",
    tipo: "PAT",
    tipo_nombre: "Patio Rural",
    sector: "PAT-R",
    fila: "01",
    numero: "019",
    capacidad: 1,
    ocupantes: 1,
    estado: "OCUPADO",
    tipo_derecho: "ARRIENDO_20Y",
    fecha_vencimiento: "2035-08-20",
    ocupante_principal: "HECTOR OSVALDO RETAMAL ACUÑA",
    rut_ocupante: "8.319.445-1"
  }
];

export default function UbicacionesPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  // Mode: GIS Map vs List
  const [viewMode, setViewMode] = useState<"gis" | "list">("gis");

  // Filter state for list view
  const [cemeteryFilter, setCemeteryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // Slide-over drawer state
  const [drawerSlot, setDrawerSlot] = useState<SlotDossier | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [highlightSlotId, setHighlightSlotId] = useState<number | null>(null);

  const handleOpenSlot = (slot: SlotDossier) => {
    setDrawerSlot(slot);
    setIsDrawerOpen(true);
  };

  const handleSelectSlotFromSearch = (locationId: number, slotCode: string, sectorCode: string) => {
    setHighlightSlotId(locationId);
    // Convert to slot dossier to open drawer directly
    setDrawerSlot({
      id: locationId,
      codigo_completo: slotCode,
      sector_codigo: sectorCode,
      fila: slotCode.split("-")[1] || "F-01",
      numero: slotCode.split("-")[2] || "001",
      tipo_ubicacion: slotCode.startsWith("PAB") ? "PAB" : "PAT",
      estado: "OCUPADO",
      color_status: "OCUPADO",
      capacidad_total: 1,
      capacidad_ocupada: 1,
      cementerio: "San Carlos"
    });
    setIsDrawerOpen(true);
  };

  const filtered = SAMPLE_LOCATIONS.filter(item => {
    const matchesCem = cemeteryFilter === "all" || item.cementerio.toLowerCase() === cemeteryFilter.toLowerCase();
    const matchesType = typeFilter === "all" || item.tipo === typeFilter;
    const matchesStatus = statusFilter === "all" || item.estado === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch = 
      item.sector.toLowerCase().includes(q) ||
      item.numero.includes(q) ||
      (item.ocupante_principal && item.ocupante_principal.toLowerCase().includes(q)) ||
      (item.rut_ocupante && item.rut_ocupante.includes(q));
    return matchesCem && matchesType && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "DISPONIBLE":
        return { label: t("statusDisponible"), bg: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300" };
      case "OCUPADO":
        return { label: t("statusOcupado"), bg: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300" };
      case "VENCIDO":
        return { label: t("statusVencido"), bg: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300" };
      case "RESERVADO":
        return { label: t("statusReservado"), bg: "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-300" };
      default:
        return { label: estado, bg: "bg-gray-100 text-gray-700 border-gray-300" };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
              {t("navUbicaciones")}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
              GIS Espacial 2D
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Plano interactivo georreferenciado de pabellones, patios y nichos para San Carlos y Cachapoal
          </p>
        </div>

        {/* View Switcher Button Group */}
        <div 
          className="p-1 rounded-2xl border flex items-center self-start shadow-sm"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <button
            onClick={() => setViewMode("gis")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === "gis" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>Mapa Espacial GIS</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === "list" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Vista Registro / Lista</span>
          </button>
        </div>
      </div>

      {/* Sub-Second Instant Search Bar Linked to Map */}
      <div className="w-full">
        <AutocompleteSearch 
          onSelectSlot={handleSelectSlotFromSearch}
        />
      </div>

      {/* View Mode 1: GIS Spatial Map Visualizer */}
      {viewMode === "gis" ? (
        <CemeteryMap 
          initialCemeteryId={1}
          initialSectorCode="PAB-A"
          highlightLocationId={highlightSlotId}
          onSelectSlot={handleOpenSlot}
        />
      ) : (
        /* View Mode 2: Traditional List & Grid View */
        <div className="space-y-6">
          {/* Filter Bar */}
          <div 
            className="p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-4 gap-3 shadow-sm"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            {/* Search */}
            <div className="flex items-center space-x-2 px-3 py-2 rounded-xl border sm:col-span-2" style={{ borderColor: "var(--color-border)" }}>
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchGraves")}
                className="w-full bg-transparent outline-none text-xs sm:text-sm"
                style={{ color: "var(--color-text)" }}
              />
            </div>

            {/* Type Select */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border text-xs font-semibold bg-transparent outline-none cursor-pointer"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              <option value="all" className="bg-white dark:bg-gray-800">{t("filterByType")}: Todos</option>
              <option value="PAB" className="bg-white dark:bg-gray-800">Pabellón Nichos (PAB)</option>
              <option value="PAT" className="bg-white dark:bg-gray-800">Patio Común (PAT)</option>
              <option value="BOV" className="bg-white dark:bg-gray-800">Bóveda Familiar (BOV)</option>
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border text-xs font-semibold bg-transparent outline-none cursor-pointer"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              <option value="all" className="bg-white dark:bg-gray-800">{t("filterByStatus")}: Todos</option>
              <option value="DISPONIBLE" className="bg-white dark:bg-gray-800">{t("statusDisponible")}</option>
              <option value="OCUPADO" className="bg-white dark:bg-gray-800">{t("statusOcupado")}</option>
              <option value="VENCIDO" className="bg-white dark:bg-gray-800">{t("statusVencido")}</option>
              <option value="RESERVADO" className="bg-white dark:bg-gray-800">{t("statusReservado")}</option>
            </select>
          </div>

          {/* Location Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(loc => {
              const badge = getStatusBadge(loc.estado);
              const colorStatusMap: Record<string, string> = {
                DISPONIBLE: "DISPONIBLE",
                OCUPADO: "OCUPADO",
                VENCIDO: "ARRIENDO_VENCIDO",
                RESERVADO: "RESERVADO"
              };

              return (
                <div
                  key={loc.id}
                  onClick={() => handleOpenSlot({
                    id: loc.id,
                    codigo_completo: `${loc.sector}-F${loc.fila}-N${loc.numero}`,
                    sector_codigo: loc.sector,
                    fila: loc.fila,
                    numero: loc.numero,
                    tipo_ubicacion: loc.tipo,
                    estado: loc.estado,
                    color_status: colorStatusMap[loc.estado] || loc.estado,
                    capacidad_total: loc.capacidad,
                    capacidad_ocupada: loc.ocupantes,
                    ocupante_principal: loc.ocupante_principal,
                    rut_ocupante: loc.rut_ocupante,
                    fecha_vencimiento: loc.fecha_vencimiento,
                    cementerio: loc.cementerio
                  })}
                  className="p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    borderColor: "var(--color-border)"
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-400 font-mono">
                        {loc.cementerio} • {loc.tipo_nombre}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                    <h3 className="text-lg font-black" style={{ color: "var(--color-text)" }}>
                      {loc.sector}-F{loc.fila}-N{loc.numero}
                    </h3>

                    {loc.ocupante_principal ? (
                      <div className="mt-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Ocupante:</span>
                        <p className="text-xs font-bold truncate mt-0.5" style={{ color: "var(--color-text)" }}>
                          {loc.ocupante_principal}
                        </p>
                        <p className="text-[11px] font-mono text-gray-500">{loc.rut_ocupante}</p>
                      </div>
                    ) : (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                        Sepultura disponible
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-gray-400 font-mono" style={{ borderColor: "var(--color-border)" }}>
                    <span>Cap: {loc.ocupantes}/{loc.capacidad}</span>
                    <span className="text-blue-500 font-semibold group-hover:underline">
                      Ver Ficha Técnica →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Slide-over Property Dossier Drawer */}
      <PropertyDetailDrawer
        slot={drawerSlot}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
