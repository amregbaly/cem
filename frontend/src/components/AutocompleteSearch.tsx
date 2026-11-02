"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Calendar, User, Shield, X, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

export interface AutocompleteResult {
  id: number;
  nombre_completo: string;
  rut: string;
  fecha_defuncion?: string;
  fecha_sepultacion?: string;
  cementerio: string;
  sector: string;
  fila: string;
  numero: string;
  tipo_sepultura: string;
  folio_licencia?: string;
  ubicacion_id?: number;
  codigo_ubicacion?: string;
  grid_x?: number;
  grid_y?: number;
}

// Fallback sample records strictly sourced from Anexo 1_Muestra_Enmascarada_Base_Cementerio..xlsx
const SAMPLE_RECORDS: AutocompleteResult[] = [
  {
    id: 1,
    nombre_completo: "NN (PERSONA NO IDENTIFICADA)",
    rut: "S/RUT",
    fecha_defuncion: "1990-06-25",
    fecha_sepultacion: "1990-06-25",
    cementerio: "San Carlos",
    sector: "MIG",
    fila: "0",
    numero: "2",
    tipo_sepultura: "Nicho Pabellón",
    folio_licencia: "ING-2"
  },
  {
    id: 2,
    nombre_completo: "JORGE MORALES",
    rut: "S/RUT",
    fecha_defuncion: "1989-05-23",
    fecha_sepultacion: "1989-05-23",
    cementerio: "San Carlos",
    sector: "MIG",
    fila: "0",
    numero: "18",
    tipo_sepultura: "Nicho Pabellón",
    folio_licencia: "ING-18"
  },
  {
    id: 3,
    nombre_completo: "PATRICIA HERNANDEZ FUENTES",
    rut: "S/RUT",
    fecha_defuncion: "2000-01-01",
    fecha_sepultacion: "2000-01-01",
    cementerio: "San Carlos",
    sector: "MIG",
    fila: "0",
    numero: "12182",
    tipo_sepultura: "Nicho Pabellón",
    folio_licencia: "ING-12182"
  },
  {
    id: 4,
    nombre_completo: "OLGA SEPULVEDA CASTILLO",
    rut: "0",
    fecha_defuncion: "1978-08-21",
    fecha_sepultacion: "1978-08-21",
    cementerio: "San Carlos",
    sector: "MIG",
    fila: "0",
    numero: "178544",
    tipo_sepultura: "Nicho Pabellón",
    folio_licencia: "ING-61806"
  },
  {
    id: 5,
    nombre_completo: "VICTOR TORRES VALENZUELA",
    rut: "S/RUT",
    fecha_defuncion: "1999-12-21",
    fecha_sepultacion: "1999-12-21",
    cementerio: "San Carlos",
    sector: "MIG",
    fila: "0",
    numero: "112260",
    tipo_sepultura: "Nicho Pabellón",
    folio_licencia: "ING-112260"
  },
  {
    id: 6,
    nombre_completo: "PEDRO ARAYA SEPULVEDA",
    rut: "12.169.592-K",
    fecha_defuncion: "2010-07-21",
    fecha_sepultacion: "2010-07-21",
    cementerio: "San Carlos",
    sector: "MIG",
    fila: "0",
    numero: "2668610",
    tipo_sepultura: "Nicho Pabellón",
    folio_licencia: "ING-2668610"
  },
  {
    id: 7,
    nombre_completo: "MANUEL CASTRO MORALES",
    rut: "17.610.009-5",
    fecha_defuncion: "2011-10-10",
    fecha_sepultacion: "2011-10-10",
    cementerio: "San Carlos",
    sector: "MIG",
    fila: "0",
    numero: "2909311",
    tipo_sepultura: "Nicho Pabellón",
    folio_licencia: "ING-2909311"
  },
  {
    id: 8,
    nombre_completo: "MANUEL FUENTES GONZALEZ",
    rut: "13.920.272-9",
    fecha_defuncion: "2015-09-18",
    fecha_sepultacion: "2015-09-18",
    cementerio: "San Carlos",
    sector: "MIG",
    fila: "0",
    numero: "563782022",
    tipo_sepultura: "Nicho Pabellón",
    folio_licencia: "ING-4347615"
  },
  {
    id: 9,
    nombre_completo: "LUCIA RODRIGUEZ ARAYA",
    rut: "18.464.014-7",
    fecha_defuncion: "2018-02-25",
    fecha_sepultacion: "2018-02-25",
    cementerio: "San Carlos",
    sector: "MIG",
    fila: "0",
    numero: "5065718",
    tipo_sepultura: "Nicho Pabellón",
    folio_licencia: "ING-5065718"
  },
  {
    id: 10,
    nombre_completo: "PATRICIA CASTILLO ROJAS",
    rut: "21.371.451-1",
    fecha_defuncion: "2025-09-30",
    fecha_sepultacion: "2025-09-30",
    cementerio: "San Carlos",
    sector: "MIG",
    fila: "0",
    numero: "5086818",
    tipo_sepultura: "Nicho Pabellón",
    folio_licencia: "ING-623302025"
  },
  {
    id: 11,
    nombre_completo: "RAMON PIZARRO SOTO",
    rut: "21.793.309-9",
    fecha_defuncion: "2025-05-19",
    fecha_sepultacion: "2025-05-19",
    cementerio: "San Carlos",
    sector: "MIG",
    fila: "0",
    numero: "89419",
    tipo_sepultura: "Nicho Pabellón",
    folio_licencia: "ING-627712025"
  }
];

interface Props {
  onSelect?: (item: AutocompleteResult) => void;
  onSelectSlot?: (locationId: number, slotCode: string, sectorCode: string) => void;
  className?: string;
}

export default function AutocompleteSearch({ onSelect, onSelectSlot, className = "" }: Props) {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sub-second instant search: Query backend API or fallback to local sample
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
        const res = await fetch(`${apiUrl}/api/v1/busqueda/autocomplete?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data.results || []);
          if (items.length > 0) {
            setResults(items);
            setIsOpen(true);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to local filter if backend isn't reached
      }

      // Local fuzzy filter across name, RUT, location
      const q = query.toLowerCase().replace(/[.\-]/g, "");
      const matched = SAMPLE_RECORDS.filter(item => {
        const nameMatch = item.nombre_completo.toLowerCase().includes(query.toLowerCase());
        const cleanRut = item.rut.toLowerCase().replace(/[.\-]/g, "");
        const rutMatch = cleanRut.includes(q);
        const locMatch = `${item.sector} ${item.fila} ${item.numero} ${item.codigo_ubicacion || ''}`.toLowerCase().includes(query.toLowerCase());
        return nameMatch || rutMatch || locMatch;
      });

      setResults(matched);
      setIsOpen(true);
      setLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectItem(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelectItem = (item: AutocompleteResult) => {
    setIsOpen(false);
    setQuery(item.nombre_completo);
    if (onSelect) {
      onSelect(item);
    }
    if (onSelectSlot && item.ubicacion_id) {
      onSelectSlot(
        item.ubicacion_id, 
        item.codigo_ubicacion || `${item.sector}-${item.fila}-${item.numero}`, 
        item.sector
      );
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <div 
        className="flex items-center px-4 py-3.5 rounded-2xl border shadow-sm transition-all focus-within:ring-2 focus-within:ring-offset-2"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: isDarkMode ? "0 4px 20px -2px rgba(0,0,0,0.5)" : "0 4px 20px -2px rgba(0,0,0,0.06)"
        }}
      >
        <Search className="w-5 h-5 mr-3 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={t("searchPlaceholder")}
          className="w-full bg-transparent outline-none text-sm sm:text-base font-medium placeholder-gray-400"
          style={{ color: "var(--color-text)" }}
        />
        {query && (
          <button 
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
            className="p-1 hover:opacity-75"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-2 rounded-2xl border shadow-2xl overflow-hidden z-50 backdrop-blur-xl transition-all"
          style={{
            backgroundColor: isDarkMode ? "rgba(17, 24, 39, 0.98)" : "rgba(255, 255, 255, 0.98)",
            borderColor: "var(--color-border)"
          }}
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-400">
              {t("searching")}
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">
              {t("noResults")}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y" style={{ borderColor: "var(--color-border)" }}>
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const isSanCarlos = item.cementerio.toLowerCase().includes("carlos");

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3.5 sm:p-4 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isSelected ? "bg-black/5 dark:bg-white/5" : ""
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm sm:text-base" style={{ color: "var(--color-text)" }}>
                          {item.nombre_completo}
                        </span>
                        <span 
                          className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: isSanCarlos ? "var(--color-primary)" : "#059669" }}
                        >
                          {item.cementerio}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5" />
                          <span>RUT: <strong className="text-gray-700 dark:text-gray-200">{item.rut}</strong></span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>
                            {item.tipo_sepultura} • Sec. {item.sector} • Fila {item.fila} • N° {item.numero}
                          </span>
                        </span>
                        {item.fecha_sepultacion && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Sepultado: {item.fecha_sepultacion}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 text-xs font-bold sm:self-center opacity-80" style={{ color: "var(--color-secondary)" }}>
                      <span>{t("viewDetails")}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div 
            className="px-4 py-2 text-xs flex justify-between items-center bg-gray-50 dark:bg-gray-900 border-t"
            style={{ borderColor: "var(--color-border)", color: "gray" }}
          >
            <span>↑↓ para navegar • Enter para seleccionar</span>
            <span>{t("pressEscToClose")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
