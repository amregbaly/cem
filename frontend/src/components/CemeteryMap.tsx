"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  MapPin, 
  Filter, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Maximize2,
  Minimize2,
  Info
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { SlotDossier } from "./PropertyDetailDrawer";

interface SectorSummary {
  cemetery_id: number;
  cemetery_name: string;
  sector_codigo: string;
  sector_nombre: string;
  tipo_ubicacion: string;
  total_slots: number;
  slots_disponibles: number;
  slots_ocupados: number;
  slots_arriendo_vencido: number;
  slots_reservados: number;
  slots_bloqueados: number;
  grid_cols: number;
  grid_rows: number;
}

interface CemeteryMapProps {
  initialCemeteryId?: number;
  initialSectorCode?: string;
  highlightLocationId?: number | null;
  onSelectSlot: (slot: SlotDossier) => void;
}

export const CemeteryMap: React.FC<CemeteryMapProps> = ({
  initialCemeteryId = 1,
  initialSectorCode = "PAB-A",
  highlightLocationId = null,
  onSelectSlot
}) => {
  const { t } = useLanguage();
  const { currentTheme, isDarkMode } = useTheme();

  // State
  const [cemeteryId, setCemeteryId] = useState<number>(initialCemeteryId);
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [activeSector, setActiveSector] = useState<string>(initialSectorCode);
  const [slots, setSlots] = useState<SlotDossier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [hoveredSlot, setHoveredSlot] = useState<SlotDossier | null>(null);

  // Zoom & Pan
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Load sectors whenever cemetery changes
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
    fetch(`${apiUrl}/api/v1/ubicaciones/mapa/sectores?cementerio_id=${cemeteryId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load sectors");
        return res.json();
      })
      .then((data: SectorSummary[]) => {
        if (data && data.length > 0) {
          setSectors(data);
          const hasCurrent = data.some(s => s.sector_codigo === activeSector);
          if (!hasCurrent) {
            setActiveSector(data[0].sector_codigo);
          }
        }
      })
      .catch(() => {
        // Fallback sectors if API is offline
        const fallbackSectors: SectorSummary[] = cemeteryId === 1 ? [
          {
            cemetery_id: 1,
            cemetery_name: "Cementerio Municipal de San Carlos",
            sector_codigo: "PAB-A",
            sector_nombre: "Pabellón A (Nichos)",
            tipo_ubicacion: "PAB",
            total_slots: 32,
            slots_disponibles: 8,
            slots_ocupados: 12,
            slots_arriendo_vencido: 4,
            slots_reservados: 4,
            slots_bloqueados: 4,
            grid_cols: 8,
            grid_rows: 4
          },
          {
            cemetery_id: 1,
            cemetery_name: "Cementerio Municipal de San Carlos",
            sector_codigo: "PAT-01",
            sector_nombre: "Patio Común 1",
            tipo_ubicacion: "PAT",
            total_slots: 24,
            slots_disponibles: 12,
            slots_ocupados: 10,
            slots_arriendo_vencido: 2,
            slots_reservados: 0,
            slots_bloqueados: 0,
            grid_cols: 6,
            grid_rows: 4
          }
        ] : [
          {
            cemetery_id: 2,
            cemetery_name: "Cementerio Municipal de Cachapoal",
            sector_codigo: "PAT-R",
            sector_nombre: "Patio Rural Principal",
            tipo_ubicacion: "PAT",
            total_slots: 18,
            slots_disponibles: 9,
            slots_ocupados: 9,
            slots_arriendo_vencido: 0,
            slots_reservados: 0,
            slots_bloqueados: 0,
            grid_cols: 6,
            grid_rows: 3
          }
        ];
        setSectors(fallbackSectors);
        setActiveSector(fallbackSectors[0].sector_codigo);
      });
  }, [cemeteryId]);

  // Load grid slots whenever active sector or filter changes
  useEffect(() => {
    if (!activeSector) return;
    setLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
    const filterParam = statusFilter !== "TODOS" ? `&estado_filtro=${statusFilter}` : "";
    fetch(`${apiUrl}/api/v1/ubicaciones/mapa/cuadricula?cementerio_id=${cemeteryId}&sector_codigo=${activeSector}${filterParam}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load grid");
        return res.json();
      })
      .then(data => {
        const loadedSlots: SlotDossier[] = (data.slots || []).map((s: any) => ({
          id: s.id,
          codigo_completo: s.codigo_completo,
          sector_codigo: s.sector_codigo,
          fila: s.fila,
          numero: s.numero,
          tipo_ubicacion: s.tipo_ubicacion,
          estado: s.estado,
          color_status: s.color_status,
          capacidad_total: s.capacidad_total,
          capacidad_ocupada: s.capacidad_ocupada,
          ocupante_principal: s.ocupante_principal,
          rut_ocupante: s.rut_ocupante,
          titular_nombre: s.titular_nombre,
          rut_titular: s.rut_titular,
          fecha_vencimiento: s.fecha_vencimiento,
          dias_para_vencer: s.dias_para_vencer,
          cementerio: cemeteryId === 1 ? "San Carlos" : "Cachapoal"
        }));
        setSlots(loadedSlots);
        setLoading(false);
      })
      .catch(() => {
        // Generate high-fidelity fallback slots
        const genSlots: SlotDossier[] = [];
        const isPab = activeSector.startsWith("PAB");
        const rows = isPab ? 4 : 4;
        const cols = isPab ? 8 : 6;

        for (let r = 1; r <= rows; r++) {
          for (let c = 1; c <= cols; c++) {
            const num = (r - 1) * cols + c;
            let c_status = "DISPONIBLE";
            let ocupante: string | null = null;
            let rut: string | null = null;
            let venc: string | null = null;
            let dias: number | null = null;

            if (c in [1, 2, 3]) {
              c_status = "OCUPADO";
              ocupante = `FALLECIDO REGISTRADO ${num}`;
              rut = `${num + 7}.842.119-4`;
            } else if (c === 4) {
              c_status = "ARRIENDO_VENCIDO";
              ocupante = `ARRIENDO EN ALERTA ${num}`;
              rut = `${num + 10}.123.456-K`;
              venc = "2026-11-15";
              dias = 15;
            } else if (c === 5) {
              c_status = "RESERVADO";
            } else if (c === 6 && isPab) {
              c_status = "BLOQUEADO";
            }

            if (statusFilter === "TODOS" || statusFilter === c_status) {
              genSlots.push({
                id: num + 100,
                codigo_completo: `${activeSector}-F${r.toString().padStart(2, '0')}-N${num.toString().padStart(3, '0')}`,
                sector_codigo: activeSector,
                fila: `F-${r.toString().padStart(2, '0')}`,
                numero: `${num.toString().padStart(3, '0')}`,
                tipo_ubicacion: isPab ? "PAB" : "PAT",
                estado: c_status,
                color_status: c_status,
                capacidad_total: 1,
                capacidad_ocupada: c_status === "OCUPADO" || c_status === "ARRIENDO_VENCIDO" ? 1 : 0,
                ocupante_principal: ocupante,
                rut_ocupante: rut,
                titular_nombre: "FAMILIA TITULAR",
                rut_titular: "15.678.912-3",
                fecha_vencimiento: venc,
                dias_para_vencer: dias,
                cementerio: cemeteryId === 1 ? "San Carlos" : "Cachapoal"
              });
            }
          }
        }
        setSlots(genSlots);
        setLoading(false);
      });
  }, [cemeteryId, activeSector, statusFilter]);

  // Auto-focus and highlight slot when requested from search
  useEffect(() => {
    if (highlightLocationId) {
      const target = slots.find(s => s.id === highlightLocationId);
      if (target) {
        onSelectSlot(target);
      }
    }
  }, [highlightLocationId, slots]);

  // Pan dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Color mapping according to technical specification
  const getSlotColor = (status: string) => {
    switch (status) {
      case "DISPONIBLE":
        return {
          bg: "bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-600",
          hex: "#10B981",
          label: "Disponible"
        };
      case "OCUPADO":
        return {
          bg: "bg-rose-500 hover:bg-rose-400 text-white border-rose-600",
          hex: "#EF4444",
          label: "Ocupado"
        };
      case "RESERVADO":
        return {
          bg: "bg-amber-400 hover:bg-amber-300 text-amber-950 border-amber-500",
          hex: "#F59E0B",
          label: "Reservado"
        };
      case "ARRIENDO_VENCIDO":
        return {
          bg: "bg-orange-500 hover:bg-orange-400 text-white border-orange-600 animate-pulse",
          hex: "#F97316",
          label: "Arriendo Vencido (30-90d)"
        };
      case "BLOQUEADO":
      default:
        return {
          bg: "bg-slate-400 hover:bg-slate-300 text-slate-900 border-slate-500",
          hex: "#64748B",
          label: "Bloqueado / Mantención"
        };
    }
  };

  const currentSectorObj = sectors.find(s => s.sector_codigo === activeSector);

  // Real-time count stats
  const totalSlotsCount = slots.length;
  const availableCount = slots.filter(s => s.color_status === "DISPONIBLE").length;
  const occupiedCount = slots.filter(s => s.color_status === "OCUPADO").length;
  const expiredCount = slots.filter(s => s.color_status === "ARRIENDO_VENCIDO").length;
  const reservedCount = slots.filter(s => s.color_status === "RESERVADO").length;

  return (
    <div 
      className="flex flex-col h-[740px] rounded-3xl border overflow-hidden shadow-xl select-none"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)"
      }}
    >
      {/* Top Controls Bar */}
      <div 
        className="p-4 border-b flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-900/30"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Cemetery Switcher */}
        <div className="flex items-center space-x-2">
          <div className="flex p-1 rounded-2xl border bg-white dark:bg-gray-800 shadow-sm" style={{ borderColor: "var(--color-border)" }}>
            <button
              onClick={() => { setCemeteryId(1); handleResetZoom(); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                cemeteryId === 1 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              San Carlos
            </button>
            <button
              onClick={() => { setCemeteryId(2); handleResetZoom(); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                cemeteryId === 2 
                  ? "bg-emerald-600 text-white shadow-md" 
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              Cachapoal
            </button>
          </div>

          {/* Sector Selector Dropdown */}
          <div className="relative">
            <select
              value={activeSector}
              onChange={(e) => { setActiveSector(e.target.value); handleResetZoom(); }}
              className="px-3.5 py-2 rounded-2xl border text-xs font-semibold shadow-sm outline-none cursor-pointer bg-white dark:bg-gray-800"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text)"
              }}
            >
              {sectors.map(sec => (
                <option key={sec.sector_codigo} value={sec.sector_codigo}>
                  Sector {sec.sector_codigo} - {sec.sector_nombre} ({sec.total_slots} slots)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs font-semibold py-1">
          {[
            { id: "TODOS", label: "Todos" },
            { id: "DISPONIBLE", label: "🟢 Disponibles", count: availableCount },
            { id: "OCUPADO", label: "🔴 Ocupados", count: occupiedCount },
            { id: "ARRIENDO_VENCIDO", label: "🟠 Por Vencer", count: expiredCount },
            { id: "RESERVADO", label: "🟡 Reservados", count: reservedCount }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                statusFilter === f.id
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {f.label} {f.count !== undefined ? `(${f.count})` : ""}
            </button>
          ))}
        </div>

        {/* Zoom & Reset Tools */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setScale(s => Math.min(s + 0.2, 2.5))}
            className="p-2 rounded-xl border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 shadow-sm"
            style={{ borderColor: "var(--color-border)" }}
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}
            className="p-2 rounded-xl border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 shadow-sm"
            style={{ borderColor: "var(--color-border)" }}
            title="Alejar (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 rounded-xl border bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 shadow-sm"
            style={{ borderColor: "var(--color-border)" }}
            title="Restablecer Vista (100%)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-gray-400 pl-1">
            {Math.round(scale * 100)}%
          </span>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div 
        ref={mapContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex-1 relative overflow-hidden bg-slate-900/5 dark:bg-black/40 cursor-grab active:cursor-grabbing p-8 flex items-center justify-center"
      >
        {/* Background Grid Accent Pattern */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, var(--color-border) 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3 z-10">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-gray-500">
              Renderizando cuadricula espacial GIS...
            </p>
          </div>
        ) : (
          <div 
            className="transition-transform duration-75 origin-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`
            }}
          >
            {/* Sector Structure Label */}
            <div className="mb-4 text-center">
              <span className="px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                {currentSectorObj?.cemetery_name} • Sector {activeSector}
              </span>
            </div>

            {/* Visual Slots Grid */}
            <div 
              className="grid gap-3 p-6 rounded-3xl bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-2xl border border-gray-200/80 dark:border-gray-800"
              style={{
                gridTemplateColumns: `repeat(${currentSectorObj?.grid_cols || 8}, minmax(88px, 1fr))`
              }}
            >
              {slots.map((slot) => {
                const colorConfig = getSlotColor(slot.color_status);
                const isHighlighted = highlightLocationId === slot.id;

                return (
                  <div
                    key={slot.id}
                    onClick={() => onSelectSlot(slot)}
                    onMouseEnter={() => setHoveredSlot(slot)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    className={`
                      relative p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-24
                      shadow-sm hover:shadow-lg hover:-translate-y-1 hover:z-20
                      ${colorConfig.bg}
                      ${isHighlighted ? "ring-4 ring-yellow-400 ring-offset-2 scale-105 z-30 animate-bounce" : ""}
                    `}
                  >
                    {/* Top Row: Slot Code & Status dot */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-tight font-mono opacity-90">
                        {slot.fila}-{slot.numero}
                      </span>
                      <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                    </div>

                    {/* Middle: Occupant or Available Label */}
                    <div className="my-auto">
                      {slot.ocupante_principal ? (
                        <p className="text-[11px] font-bold line-clamp-2 leading-tight">
                          {slot.ocupante_principal}
                        </p>
                      ) : (
                        <p className="text-[11px] font-semibold opacity-80 uppercase tracking-wider text-center">
                          {colorConfig.label}
                        </p>
                      )}
                    </div>

                    {/* Bottom: Capacity indicator */}
                    <div className="flex items-center justify-between text-[9px] font-mono opacity-80 border-t border-white/20 pt-1">
                      <span>Cap: {slot.capacidad_ocupada}/{slot.capacidad_total}</span>
                      {slot.dias_para_vencer !== null && slot.dias_para_vencer !== undefined && (
                        <span className="font-bold">{slot.dias_para_vencer}d</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hover Dossier Tooltip */}
        {hoveredSlot && (
          <div 
            className="absolute bottom-6 left-6 z-40 max-w-xs p-4 rounded-2xl shadow-2xl border backdrop-blur-md text-xs space-y-1.5 pointer-events-none transition-all"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)"
            }}
          >
            <div className="flex items-center space-x-2">
              <span className="font-black text-sm">{hoveredSlot.codigo_completo}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold">
                {hoveredSlot.color_status}
              </span>
            </div>
            {hoveredSlot.ocupante_principal ? (
              <div>
                <p className="text-gray-400 text-[10px]">Ocupante:</p>
                <p className="font-bold">{hoveredSlot.ocupante_principal}</p>
                <p className="text-gray-400 font-mono text-[10px]">RUT: {hoveredSlot.rut_ocupante || "S/R"}</p>
              </div>
            ) : (
              <p className="text-gray-400 italic">Sepultura disponible para asignación municipal.</p>
            )}
            {hoveredSlot.titular_nombre && (
              <div className="pt-1 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                <span className="text-gray-400 text-[10px]">Titular:</span> {hoveredSlot.titular_nombre}
              </div>
            )}
            <p className="text-[10px] text-blue-500 font-semibold pt-1">
              Click para abrir expediente completo →
            </p>
          </div>
        )}

        {/* Mini Radar / Compass Widget in Bottom Right */}
        <div 
          className="absolute bottom-6 right-6 p-3 rounded-2xl border bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-lg text-[10px] space-y-1.5 flex flex-col items-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center space-x-1.5 font-bold text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span>GIS Radar</span>
          </div>
          <div className="w-16 h-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center relative">
            <div className="w-4 h-3 bg-blue-500/40 rounded border border-blue-600 animate-pulse" />
          </div>
          <span className="text-gray-400 font-mono text-[9px]">S: {activeSector}</span>
        </div>
      </div>

      {/* Bottom Status Legend Bar */}
      <div 
        className="px-6 py-3 border-t flex flex-wrap items-center justify-between gap-4 text-xs font-semibold bg-gray-50/50 dark:bg-gray-900/30"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center space-x-5">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
            <span className="text-gray-600 dark:text-gray-300">Disponible ({availableCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
            <span className="text-gray-600 dark:text-gray-300">Ocupado ({occupiedCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
            <span className="text-gray-600 dark:text-gray-300">Reservado ({reservedCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm animate-pulse" />
            <span className="text-gray-600 dark:text-gray-300">Vencido 30-90d ({expiredCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-400 shadow-sm" />
            <span className="text-gray-600 dark:text-gray-300">Bloqueado / Mantención</span>
          </div>
        </div>

        <div className="text-xs text-gray-400 font-mono">
          Total en Sector: <strong>{totalSlotsCount}</strong> sepulturas
        </div>
      </div>
    </div>
  );
};
