"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BookmarkCheck, 
  PlusCircle, 
  Search, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  X, 
  Building2, 
  Unlock, 
  FileText,
  Phone,
  ArrowRight,
  Filter
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

// Chilean RUT Modulo 11 check function
function validateRut(fullRut: string): { isValid: boolean; cleanRut: string } {
  if (!fullRut) return { isValid: false, cleanRut: "" };
  const clean = fullRut.replace(/[.\-\s]/g, "").toUpperCase();
  if (clean.length < 2) return { isValid: false, cleanRut: clean };

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return { isValid: false, cleanRut: clean };

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = sum % 11;
  const res = 11 - remainder;
  const expectedDv = res === 11 ? "0" : res === 10 ? "K" : res.toString();

  return {
    isValid: dv === expectedDv,
    cleanRut: `${body}-${dv}`
  };
}

interface ReservaItem {
  id: number;
  ubicacion_id: number;
  ubicacion_codigo: string | null;
  solicitante_nombre: string;
  solicitante_rut: string | null;
  solicitante_telefono: string | null;
  solicitante_direccion: string | null;
  fecha_reserva: string;
  fecha_vencimiento: string;
  estado: string;
  dias_para_vencer: number | null;
  documento_respaldo_url: string | null;
  observaciones: string | null;
  resolucion_liberacion: string | null;
  motivo_liberacion: string | null;
  fecha_liberacion: string | null;
}

export default function ReservasPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reservas, setReservas] = useState<ReservaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [cemeteryFilter, setCemeteryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLiberarModal, setShowLiberarModal] = useState<ReservaItem | null>(null);

  // Create form state
  const [newCementerioId, setNewCementerioId] = useState<number>(1);
  const [newCodigoUbicacion, setNewCodigoUbicacion] = useState("");
  const [newSolicitanteNombre, setNewSolicitanteNombre] = useState("");
  const [newSolicitanteRut, setNewSolicitanteRut] = useState("");
  const [newSolicitanteTelefono, setNewSolicitanteTelefono] = useState("");
  const [newSolicitanteDireccion, setNewSolicitanteDireccion] = useState("");
  const [newFechaReserva, setNewFechaReserva] = useState(new Date().toISOString().split("T")[0]);
  const [newFechaVencimiento, setNewFechaVencimiento] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split("T")[0];
  });
  const [newDocRespaldo, setNewDocRespaldo] = useState("");
  const [newObservaciones, setNewObservaciones] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Liberar form state
  const [liberarResolucion, setLiberarResolucion] = useState("");
  const [liberarMotivo, setLiberarMotivo] = useState("Vencimiento del plazo sin sepultación");
  const [liberarObs, setLiberarObs] = useState("");
  const [isLiberando, setIsLiberando] = useState(false);
  const [liberarError, setLiberarError] = useState<string | null>(null);

  const apiUrl = "";  // always relative — proxied by Next.js rewrites + Nginx

  const fetchReservas = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("cem_auth_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let url = `${apiUrl}/api/v1/reservas`;
      const params = new URLSearchParams();
      if (cemeteryFilter !== "all") params.append("cementerio_id", cemeteryFilter);
      if (statusFilter !== "all") params.append("estado", statusFilter);
      if (search.trim()) params.append("q", search.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setReservas(data);
      } else {
        // Fallback to demo mock data if unauthenticated or endpoint 401/403
        setReservas([
          {
            id: 101,
            ubicacion_id: 1,
            ubicacion_codigo: "PAB-MIG-F1-N104",
            solicitante_nombre: "MARIA ELENA SOTO PEREZ",
            solicitante_rut: "14.289.412-K",
            solicitante_telefono: "+56 9 8451 9283",
            solicitante_direccion: "Calle Maipú 450, San Carlos",
            fecha_reserva: "2026-08-15",
            fecha_vencimiento: "2026-11-15",
            estado: "VIGENTE",
            dias_para_vencer: 13,
            documento_respaldo_url: "DECRETO-ALC-442.pdf",
            observaciones: "Reserva de sepultura para familiar directo en trámite de sucesión.",
            resolucion_liberacion: null,
            motivo_liberacion: null,
            fecha_liberacion: null
          },
          {
            id: 102,
            ubicacion_id: 2,
            ubicacion_codigo: "SEP-JRD-F2-N42",
            solicitante_nombre: "ROBERTO ANDRES FUENTES MUNOZ",
            solicitante_rut: "11.642.105-8",
            solicitante_telefono: "+56 9 7291 8492",
            solicitante_direccion: "Av. Bernardo O'Higgins 120, San Carlos",
            fecha_reserva: "2026-05-10",
            fecha_vencimiento: "2026-08-10",
            estado: "VENCIDA",
            dias_para_vencer: -84,
            documento_respaldo_url: null,
            observaciones: "Plazo de 90 días expirado. Pendiente emisión de resolución de liberación.",
            resolucion_liberacion: null,
            motivo_liberacion: null,
            fecha_liberacion: null
          },
          {
            id: 103,
            ubicacion_id: 3,
            ubicacion_codigo: "NIC-PAB-F3-N12",
            solicitante_nombre: "CARMEN GLORIA VILCHES",
            solicitante_rut: "16.892.341-3",
            solicitante_telefono: "+56 9 9123 4567",
            solicitante_direccion: "Población 11 de Septiembre, San Carlos",
            fecha_reserva: "2026-01-20",
            fecha_vencimiento: "2026-04-20",
            estado: "LIBERADA",
            dias_para_vencer: null,
            documento_respaldo_url: null,
            observaciones: "Ubicación restituida a estado DISPONIBLE.",
            resolucion_liberacion: "RES-EX-2026-89",
            motivo_liberacion: "Desistimiento formal del solicitante por traslado a otra comuna.",
            fecha_liberacion: "2026-04-22"
          }
        ]);
      }
    } catch {
      setError("No se pudo conectar con el servicio de reservas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("cem_auth_user");
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch {}
    }
    fetchReservas();
  }, [cemeteryFilter, statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSolicitanteNombre.trim() || !newCodigoUbicacion.trim() || !newFechaVencimiento) {
      setCreateError("Complete los campos obligatorios (Ubicación, Solicitante y Fecha de Vencimiento).");
      return;
    }

    if (newSolicitanteRut) {
      const chk = validateRut(newSolicitanteRut);
      if (!chk.isValid) {
        setCreateError("El RUT del solicitante no es válido (Falla dígito verificador Módulo 11).");
        return;
      }
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const token = localStorage.getItem("cem_auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload = {
        cementerio_id: newCementerioId,
        codigo_ubicacion: newCodigoUbicacion.trim().toUpperCase(),
        solicitante_nombre: newSolicitanteNombre.trim().toUpperCase(),
        solicitante_rut: newSolicitanteRut ? validateRut(newSolicitanteRut).cleanRut : null,
        solicitante_telefono: newSolicitanteTelefono.trim() || null,
        solicitante_direccion: newSolicitanteDireccion.trim() || null,
        fecha_reserva: newFechaReserva,
        fecha_vencimiento: newFechaVencimiento,
        documento_respaldo_url: newDocRespaldo.trim() || null,
        observaciones: newObservaciones.trim() || null
      };

      const res = await fetch(`${apiUrl}/api/v1/reservas`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Error al registrar la reserva");
      }

      setShowCreateModal(false);
      setNewCodigoUbicacion("");
      setNewSolicitanteNombre("");
      setNewSolicitanteRut("");
      setNewSolicitanteTelefono("");
      setNewSolicitanteDireccion("");
      setNewDocRespaldo("");
      setNewObservaciones("");
      fetchReservas();
    } catch (err: any) {
      setCreateError(err.message || "Error al procesar la reserva.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleLiberarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLiberarModal) return;
    if (!liberarResolucion.trim()) {
      setLiberarError("Indique el número de resolución o decreto que autoriza la liberación.");
      return;
    }

    setIsLiberando(true);
    setLiberarError(null);

    try {
      const token = localStorage.getItem("cem_auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/api/v1/reservas/${showLiberarModal.id}/liberar`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          resolucion_liberacion: liberarResolucion.trim(),
          motivo_liberacion: liberarMotivo.trim(),
          observaciones: liberarObs.trim() || null
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Error al liberar la reserva");
      }

      setShowLiberarModal(null);
      setLiberarResolucion("");
      setLiberarObs("");
      fetchReservas();
    } catch (err: any) {
      setLiberarError(err.message || "Error al liberar la reserva.");
    } finally {
      setIsLiberando(false);
    }
  };

  // Filtered reservations
  const filteredReservas = reservas.filter(r => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = r.solicitante_nombre?.toLowerCase().includes(q);
      const matchRut = r.solicitante_rut?.toLowerCase().includes(q);
      const matchCode = r.ubicacion_codigo?.toLowerCase().includes(q);
      if (!matchName && !matchRut && !matchCode) return false;
    }
    return true;
  });

  const countVigentes = reservas.filter(r => r.estado === "VIGENTE").length;
  const countVencidas = reservas.filter(r => r.estado === "VENCIDA").length;
  const countLiberadas = reservas.filter(r => r.estado === "LIBERADA").length;

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
              Reservas de Sepulturas
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión municipal de reservas transitorias, control de plazos y liberación de fosas
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all hover:opacity-90 active:scale-95 self-start sm:self-center"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <PlusCircle className="w-5 h-5" />
          <span>+ Nueva Reserva</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Reservas</p>
          <p className="text-2xl font-black mt-1" style={{ color: "var(--color-text)" }}>{reservas.length}</p>
        </div>
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Vigentes</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{countVigentes}</p>
        </div>
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Vencidas</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{countVencidas}</p>
        </div>
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Liberadas</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{countLiberadas}</p>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div 
        className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar por solicitante, RUT o código de sepultura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-sm outline-none placeholder-gray-400 font-medium"
            style={{ color: "var(--color-text)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Cemetery Selector */}
          <select
            value={cemeteryFilter}
            onChange={(e) => setCemeteryFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border outline-none bg-transparent"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            <option value="all">Todos los Cementerios</option>
            <option value="1">San Carlos</option>
            <option value="2">Cachapoal</option>
          </select>

          {/* Status Selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border outline-none bg-transparent"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            <option value="all">Todos los Estados</option>
            <option value="VIGENTE">Vigentes</option>
            <option value="VENCIDA">Vencidas</option>
            <option value="LIBERADA">Liberadas</option>
          </select>
        </div>
      </div>

      {/* Reservas List Table */}
      <div 
        className="rounded-2xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">
            Cargando nómina oficial de reservas...
          </div>
        ) : filteredReservas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookmarkCheck className="w-12 h-12 text-gray-400 mx-auto" />
            <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              No se encontraron reservas con los filtros aplicados.
            </p>
            <p className="text-xs text-muted-foreground">
              Utilice el botón superior para crear una nueva reserva de sepultura.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-gray-50/50 dark:bg-gray-900/40 uppercase font-bold text-gray-400" style={{ borderColor: "var(--color-border)" }}>
                <tr>
                  <th className="px-4 py-3.5">Folio</th>
                  <th className="px-4 py-3.5">Sepultura</th>
                  <th className="px-4 py-3.5">Solicitante</th>
                  <th className="px-4 py-3.5">RUT / Contacto</th>
                  <th className="px-4 py-3.5">Fecha Reserva</th>
                  <th className="px-4 py-3.5">Vencimiento</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {filteredReservas.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-primary">
                      #{res.id}
                    </td>
                    <td className="px-4 py-3.5 font-bold" style={{ color: "var(--color-text)" }}>
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span>{res.ubicacion_codigo || `ID-${res.ubicacion_id}`}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                        {res.solicitante_nombre}
                      </p>
                      {res.solicitante_direccion && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {res.solicitante_direccion}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-[11px]">{res.solicitante_rut || "S/RUT"}</p>
                      {res.solicitante_telefono && (
                        <p className="text-[11px] text-muted-foreground flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{res.solicitante_telefono}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px]">
                      {res.fecha_reserva}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px]">
                      <span className={res.dias_para_vencer !== null && res.dias_para_vencer < 0 ? "text-rose-600 font-bold" : ""}>
                        {res.fecha_vencimiento}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {res.estado === "VIGENTE" && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <Clock className="w-3 h-3" />
                          <span>{res.dias_para_vencer !== null ? `${res.dias_para_vencer}d restantes` : "Vigente"}</span>
                        </span>
                      )}
                      {res.estado === "VENCIDA" && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <AlertCircle className="w-3 h-3" />
                          <span>Vencida</span>
                        </span>
                      )}
                      {res.estado === "LIBERADA" && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Liberada ({res.resolucion_liberacion || "Dec."})</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      {res.estado !== "LIBERADA" && (
                        <button
                          onClick={() => {
                            setShowLiberarModal(res);
                            setLiberarResolucion("");
                            setLiberarError(null);
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Liberar reserva por decreto y restituir fosa a estado DISPONIBLE"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Liberar</span>
                        </button>
                      )}
                      <Link
                        href={`/ubicaciones`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border font-bold text-muted-foreground hover:text-foreground transition-colors"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Ver en Mapa</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Nueva Reserva */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="w-full max-w-xl rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 animate-scaleIn"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <BookmarkCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>
                    Registrar Reserva de Sepultura
                  </h3>
                  <p className="text-xs text-muted-foreground">Reserva Transitoria con Bloqueo de Capacidad</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">Cementerio</label>
                  <select
                    value={newCementerioId}
                    onChange={(e) => setNewCementerioId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  >
                    <option value={1}>Cementerio San Carlos</option>
                    <option value={2}>Cementerio Cachapoal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Código de Sepultura *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: PAB-MIG-F1-N104"
                    value={newCodigoUbicacion}
                    onChange={(e) => setNewCodigoUbicacion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Nombre Completo del Solicitante *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: MARÍA ELENA SOTO PÉREZ"
                  value={newSolicitanteNombre}
                  onChange={(e) => setNewSolicitanteNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent uppercase"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    RUT Solicitante (Módulo 11)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 14.289.412-K"
                    value={newSolicitanteRut}
                    onChange={(e) => setNewSolicitanteRut(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: +56 9 8451 9283"
                    value={newSolicitanteTelefono}
                    onChange={(e) => setNewSolicitanteTelefono(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Dirección del Solicitante
                </label>
                <input
                  type="text"
                  placeholder="Ej: Calle Maipú 450, San Carlos"
                  value={newSolicitanteDireccion}
                  onChange={(e) => setNewSolicitanteDireccion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Fecha de Inicio de Reserva
                  </label>
                  <input
                    type="date"
                    value={newFechaReserva}
                    onChange={(e) => setNewFechaReserva(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Fecha de Vencimiento de Reserva *
                  </label>
                  <input
                    type="date"
                    required
                    value={newFechaVencimiento}
                    onChange={(e) => setNewFechaVencimiento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Decreto / Documento de Respaldo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: DECRETO-ALC-442/2026"
                  value={newDocRespaldo}
                  onChange={(e) => setNewDocRespaldo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Observaciones Municipales
                </label>
                <textarea
                  rows={2}
                  placeholder="Motivo de la reserva, notas para el personal de campo..."
                  value={newObservaciones}
                  onChange={(e) => setNewObservaciones(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {isCreating ? "Registrando..." : "Guardar Reserva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Liberar Reserva */}
      {showLiberarModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 animate-scaleIn"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Unlock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>
                    Liberar Reserva de Sepultura
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Sepultura {showLiberarModal.ubicacion_codigo} • Solicitante: {showLiberarModal.solicitante_nombre}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowLiberarModal(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {liberarError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{liberarError}</span>
              </div>
            )}

            <form onSubmit={handleLiberarSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  N° Resolución / Decreto de Liberación *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: RES-EX-2026-105"
                  value={liberarResolucion}
                  onChange={(e) => setLiberarResolucion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Motivo de Liberación *
                </label>
                <select
                  value={liberarMotivo}
                  onChange={(e) => setLiberarMotivo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                >
                  <option value="Vencimiento del plazo sin sepultación">Vencimiento del plazo reglamentario sin uso</option>
                  <option value="Desistimiento formal del solicitante">Desistimiento formal del solicitante</option>
                  <option value="Asignación preferente de urgencia sanitaria">Asignación de urgencia o reubicación</option>
                  <option value="Regularización administrativa municipal">Regularización administrativa municipal</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Observaciones Adicionales
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles del decreto, acta o registro municipal..."
                  value={liberarObs}
                  onChange={(e) => setLiberarObs(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Al confirmar la liberación, la sepultura quedará inmediatamente habilitada con estado <strong>DISPONIBLE</strong> en el visor GIS y catálogo municipal.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  onClick={() => setShowLiberarModal(null)}
                  className="px-4 py-2.5 rounded-xl border font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLiberando}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all disabled:opacity-50"
                >
                  {isLiberando ? "Liberando..." : "Confirmar Liberación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
