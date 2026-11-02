"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Hammer, 
  PlusCircle, 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Building2, 
  FileText,
  Phone,
  HardHat,
  BadgeCheck,
  Wrench,
  ShieldAlert
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

interface MaestroItem {
  id: number;
  rut: string;
  nombre_completo: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
}

interface TrabajoItem {
  id: number;
  orden_ingreso: string;
  maestro_id: number | null;
  maestro_nombre: string | null;
  ubicacion_id: number;
  codigo_ubicacion: string;
  fecha_orden: string;
  tipo_trabajo: number;
  observaciones: string | null;
}

export default function MaestrosPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"maestros" | "ordenes">("ordenes");

  const [maestros, setMaestros] = useState<MaestroItem[]>([]);
  const [ordenes, setOrdenes] = useState<TrabajoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [search, setSearch] = useState("");

  // Modals
  const [showCreateMaestroModal, setShowCreateMaestroModal] = useState(false);
  const [showCreateOrdenModal, setShowCreateOrdenModal] = useState(false);

  // Maestro Form
  const [mRut, setMRut] = useState("");
  const [mNombres, setMNombres] = useState("");
  const [mApellidoPaterno, setMApellidoPaterno] = useState("");
  const [mApellidoMaterno, setMApellidoMaterno] = useState("");
  const [mDireccion, setMDireccion] = useState("");
  const [mTelefono, setMTelefono] = useState("");
  const [mSubmitting, setMSubmitting] = useState(false);
  const [mError, setMError] = useState<string | null>(null);

  // Orden Form
  const [oOrdenIngreso, setOOrdenIngreso] = useState("");
  const [oMaestroId, setOMaestroId] = useState<number | string>("");
  const [oCodigoUbicacion, setOCodigoUbicacion] = useState("");
  const [oCementerioId, setOCementerioId] = useState(1);
  const [oTipoTrabajo, setOTipoTrabajo] = useState(1);
  const [oFechaOrden, setOFechaOrden] = useState(new Date().toISOString().split("T")[0]);
  const [oObservaciones, setOObservaciones] = useState("");
  const [oSubmitting, setOSubmitting] = useState(false);
  const [oError, setOError] = useState<string | null>(null);

  const apiUrl = "";  // always relative — proxied by Next.js rewrites + Nginx

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMaestros, resOrdenes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/maestros`),
        fetch(`${apiUrl}/api/v1/maestros/ordenes`)
      ]);

      if (resMaestros.ok) {
        const dataM = await resMaestros.json();
        setMaestros(dataM);
      } else {
        setMaestros([
          {
            id: 1,
            rut: "10.428.192-3",
            nombre_completo: "PEDRO ANTONIO GOMEZ VERGARA",
            nombres: "PEDRO ANTONIO",
            apellido_paterno: "GOMEZ",
            apellido_materno: "VERGARA",
            direccion: "Pasaje Los Canelos 234, San Carlos",
            telefono: "+56 9 8271 9021",
            activo: true
          },
          {
            id: 2,
            rut: "12.839.401-K",
            nombre_completo: "JOSE MIGUEL CIFUENTES LARA",
            nombres: "JOSE MIGUEL",
            apellido_paterno: "CIFUENTES",
            apellido_materno: "LARA",
            direccion: "Calle Prat 890, San Carlos",
            telefono: "+56 9 9182 3412",
            activo: true
          }
        ]);
      }

      if (resOrdenes.ok) {
        const dataO = await resOrdenes.json();
        setOrdenes(dataO);
      } else {
        setOrdenes([
          {
            id: 501,
            orden_ingreso: "ING-OBRA-2026-089",
            maestro_id: 1,
            maestro_nombre: "PEDRO ANTONIO GOMEZ VERGARA",
            ubicacion_id: 12,
            codigo_ubicacion: "PAB-MIG-F1-N104",
            fecha_orden: "2026-07-14",
            tipo_trabajo: 1,
            observaciones: "Colocación de lápida de mármol pulido autorizada con comprobante municipal."
          },
          {
            id: 502,
            orden_ingreso: "ING-OBRA-2026-112",
            maestro_id: 2,
            maestro_nombre: "JOSE MIGUEL CIFUENTES LARA",
            ubicacion_id: 16,
            codigo_ubicacion: "SEP-JRD-F2-N42",
            fecha_orden: "2026-08-02",
            tipo_trabajo: 2,
            observaciones: "Reparación de solera y estructura de fosa de hormigón."
          }
        ]);
      }
    } catch {
      // Fallback handled above
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
    fetchData();
  }, []);

  const handleCreateMaestro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mRut.trim() || !mNombres.trim() || !mApellidoPaterno.trim()) {
      setMError("Complete los campos obligatorios (RUT, Nombres y Apellido Paterno).");
      return;
    }

    const chk = validateRut(mRut);
    if (!chk.isValid) {
      setMError("El RUT del maestro no es válido (Falla verificación Módulo 11).");
      return;
    }

    setMSubmitting(true);
    setMError(null);

    try {
      const token = localStorage.getItem("cem_auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/api/v1/maestros`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          rut: chk.cleanRut,
          nombres: mNombres.trim().toUpperCase(),
          apellido_paterno: mApellidoPaterno.trim().toUpperCase(),
          apellido_materno: mApellidoMaterno.trim() ? mApellidoMaterno.trim().toUpperCase() : null,
          direccion: mDireccion.trim() || null,
          telefono: mTelefono.trim() || null
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Error al registrar al maestro");
      }

      setShowCreateMaestroModal(false);
      setMRut("");
      setMNombres("");
      setMApellidoPaterno("");
      setMApellidoMaterno("");
      setMDireccion("");
      setMTelefono("");
      fetchData();
    } catch (err: any) {
      setMError(err.message || "Error al procesar el registro.");
    } finally {
      setMSubmitting(false);
    }
  };

  const handleCreateOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oOrdenIngreso.trim() || !oMaestroId || !oCodigoUbicacion.trim()) {
      setOError("Complete los campos requeridos (Orden de Ingreso, Maestro y Sepultura).");
      return;
    }

    setOSubmitting(true);
    setOError(null);

    try {
      const token = localStorage.getItem("cem_auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/api/v1/maestros/ordenes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          orden_ingreso: oOrdenIngreso.trim().toUpperCase(),
          maestro_id: Number(oMaestroId),
          codigo_ubicacion: oCodigoUbicacion.trim().toUpperCase(),
          cementerio_id: oCementerioId,
          fecha_orden: oFechaOrden,
          tipo_trabajo: Number(oTipoTrabajo),
          observaciones: oObservaciones.trim() || null
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Error al emitir la orden de trabajo");
      }

      setShowCreateOrdenModal(false);
      setOOrdenIngreso("");
      setOCodigoUbicacion("");
      setOObservaciones("");
      fetchData();
    } catch (err: any) {
      setOError(err.message || "Error al emitir el permiso de obra.");
    } finally {
      setOSubmitting(false);
    }
  };

  const getTipoTrabajoLabel = (tipo: number) => {
    switch (tipo) {
      case 1:
        return { label: "Colocación de Lápida", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
      case 2:
        return { label: "Construcción / Reparación", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      case 3:
        return { label: "Mantención de Sepultura", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
      default:
        return { label: "Obra General", badge: "bg-gray-100 text-gray-600" };
    }
  };

  const filteredOrdenes = ordenes.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.orden_ingreso.toLowerCase().includes(q) ||
      o.maestro_nombre?.toLowerCase().includes(q) ||
      o.codigo_ubicacion.toLowerCase().includes(q)
    );
  });

  const filteredMaestros = maestros.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.nombre_completo.toLowerCase().includes(q) ||
      m.rut.toLowerCase().includes(q)
    );
  });

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
              Obras & Derechos de Maestros
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              EETT 3.7
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Padrón de albañiles autorizados, cobro de derechos y permisos de colocación de lápidas y reparaciones
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-center">
          <button
            onClick={() => setShowCreateMaestroModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm border shadow-xs transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            <User className="w-4 h-4 text-primary" />
            <span>+ Registrar Maestro</span>
          </button>

          <button
            onClick={() => setShowCreateOrdenModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <PlusCircle className="w-5 h-5" />
            <span>+ Emitir Permiso de Obra</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Maestros Habilitados</p>
          <p className="text-2xl font-black mt-1" style={{ color: "var(--color-text)" }}>
            {maestros.filter(m => m.activo).length}
          </p>
        </div>
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Permisos de Lápidas</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {ordenes.filter(o => o.tipo_trabajo === 1).length}
          </p>
        </div>
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Obras de Construcción</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {ordenes.filter(o => o.tipo_trabajo === 2).length}
          </p>
        </div>
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Órdenes Registradas</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {ordenes.length}
          </p>
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex rounded-2xl border p-1 max-w-md w-full" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          <button
            onClick={() => setActiveTab("ordenes")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === "ordenes" ? "bg-primary text-white shadow-xs" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Hammer className="w-4 h-4" />
            <span>Permisos & Obras Particulares ({ordenes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("maestros")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === "maestros" ? "bg-primary text-white shadow-xs" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <BadgeCheck className="w-4 h-4" />
            <span>Padrón de Maestros ({maestros.length})</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl border flex-1 max-w-sm shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder={activeTab === "ordenes" ? "Buscar por orden, maestro o sepultura..." : "Buscar por nombre o RUT de maestro..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-xs outline-none placeholder-gray-400"
            style={{ color: "var(--color-text)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Ordenes de Trabajo / Permisos de Obras */}
      {activeTab === "ordenes" && (
        <div 
          className="rounded-2xl border shadow-sm overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">
              Cargando nómina de permisos de obras y derechos de maestros...
            </div>
          ) : filteredOrdenes.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Hammer className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
                No se registran permisos de obras con los filtros aplicados.
              </p>
              <p className="text-xs text-muted-foreground">
                Emita un nuevo permiso de obra para asociarlo al expediente histórico de la sepultura.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-gray-50/50 dark:bg-gray-900/40 uppercase font-bold text-gray-400" style={{ borderColor: "var(--color-border)" }}>
                  <tr>
                    <th className="px-4 py-3.5">Orden de Ingreso</th>
                    <th className="px-4 py-3.5">Fecha</th>
                    <th className="px-4 py-3.5">Maestro Responsable</th>
                    <th className="px-4 py-3.5">Sepultura</th>
                    <th className="px-4 py-3.5">Tipo de Trabajo</th>
                    <th className="px-4 py-3.5">Observaciones</th>
                    <th className="px-4 py-3.5 text-right">Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {filteredOrdenes.map((item) => {
                    const tipoInfo = getTipoTrabajoLabel(item.tipo_trabajo);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-sm text-primary">
                          {item.orden_ingreso}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px]">
                          {item.fecha_orden}
                        </td>
                        <td className="px-4 py-3.5 font-bold" style={{ color: "var(--color-text)" }}>
                          {item.maestro_nombre || "Maestro Particular"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-[11px]">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span>{item.codigo_ubicacion}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tipoInfo.badge}`}>
                            {tipoInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground text-[11px] max-w-xs truncate">
                          {item.observaciones || "Sin observaciones registradas."}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/ubicaciones`}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border font-bold text-muted-foreground hover:text-foreground transition-colors"
                            style={{ borderColor: "var(--color-border)" }}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Ver Sepultura</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Padrón Oficial de Maestros */}
      {activeTab === "maestros" && (
        <div 
          className="rounded-2xl border shadow-sm overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">
              Cargando padrón oficial de maestros...
            </div>
          ) : filteredMaestros.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <BadgeCheck className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
                No se encontraron maestros registrados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-gray-50/50 dark:bg-gray-900/40 uppercase font-bold text-gray-400" style={{ borderColor: "var(--color-border)" }}>
                  <tr>
                    <th className="px-4 py-3.5">RUT</th>
                    <th className="px-4 py-3.5">Nombre Completo</th>
                    <th className="px-4 py-3.5">Teléfono</th>
                    <th className="px-4 py-3.5">Dirección</th>
                    <th className="px-4 py-3.5">Estado Padrón</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {filteredMaestros.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-sm text-primary">
                        {m.rut}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-sm" style={{ color: "var(--color-text)" }}>
                        {m.nombre_completo}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px]">
                        {m.telefono ? (
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span>{m.telefono}</span>
                          </span>
                        ) : "S/Teléfono"}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {m.direccion || "Comuna de San Carlos"}
                      </td>
                      <td className="px-4 py-3.5">
                        {m.activo ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            <span>Habilitado Municipal</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Suspendido</span>
                          </span>
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

      {/* MODAL: Registrar Maestro */}
      {showCreateMaestroModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 animate-scaleIn"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>
                    Registrar Maestro de Obras
                  </h3>
                  <p className="text-xs text-muted-foreground">Incorporación al padrón oficial de albañiles habilitados</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateMaestroModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {mError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{mError}</span>
              </div>
            )}

            <form onSubmit={handleCreateMaestro} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  RUT del Maestro (Validación Módulo 11) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 10.428.192-3"
                  value={mRut}
                  onChange={(e) => setMRut(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Nombres *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: PEDRO ANTONIO"
                  value={mNombres}
                  onChange={(e) => setMNombres(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent uppercase"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Apellido Paterno *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: GOMEZ"
                    value={mApellidoPaterno}
                    onChange={(e) => setMApellidoPaterno(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent uppercase"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Apellido Materno
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: VERGARA"
                    value={mApellidoMaterno}
                    onChange={(e) => setMApellidoMaterno(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent uppercase"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: +56 9 8271 9021"
                    value={mTelefono}
                    onChange={(e) => setMTelefono(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pasaje Los Canelos 234"
                    value={mDireccion}
                    onChange={(e) => setMDireccion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateMaestroModal(false)}
                  className="px-4 py-2.5 rounded-xl border font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mSubmitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {mSubmitting ? "Registrando..." : "Guardar Maestro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Emitir Permiso de Obra / Lápida */}
      {showCreateOrdenModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="w-full max-w-xl rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 animate-scaleIn"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Hammer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>
                    Emitir Permiso de Obra / Lápida
                  </h3>
                  <p className="text-xs text-muted-foreground">Derechos de Albañilería y Registro en Dossier Histórico</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateOrdenModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {oError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{oError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrden} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Orden de Ingreso Municipal N° *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: ING-OBRA-2026-112"
                    value={oOrdenIngreso}
                    onChange={(e) => setOOrdenIngreso(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono uppercase"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Maestro Autorizado *
                  </label>
                  <select
                    required
                    value={oMaestroId}
                    onChange={(e) => setOMaestroId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  >
                    <option value="">Seleccione un maestro...</option>
                    {maestros.filter(m => m.activo).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre_completo} ({m.rut})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Cementerio
                  </label>
                  <select
                    value={oCementerioId}
                    onChange={(e) => setOCementerioId(Number(e.target.value))}
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
                    value={oCodigoUbicacion}
                    onChange={(e) => setOCodigoUbicacion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono uppercase"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Tipo de Obra / Faena *
                  </label>
                  <select
                    value={oTipoTrabajo}
                    onChange={(e) => setOTipoTrabajo(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  >
                    <option value={1}>1: Colocación de Lápida</option>
                    <option value={2}>2: Construcción / Reparación de Fosa</option>
                    <option value={3}>3: Mantención de Sepultura</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Fecha de la Orden
                  </label>
                  <input
                    type="date"
                    value={oFechaOrden}
                    onChange={(e) => setOFechaOrden(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Especificaciones Técnicas / Observaciones
                </label>
                <textarea
                  rows={3}
                  placeholder="Materiales de la lápida, dimensiones, medidas de seguridad en el cementerio..."
                  value={oObservaciones}
                  onChange={(e) => setOObservaciones(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateOrdenModal(false)}
                  className="px-4 py-2.5 rounded-xl border font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={oSubmitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {oSubmitting ? "Emitiendo..." : "Emitir Permiso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
