"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRightLeft, 
  PlusCircle, 
  Search, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Building2, 
  ExternalLink,
  ShieldCheck,
  FileText,
  Phone,
  Layers,
  ArrowRight
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

interface ExhumacionItem {
  id: number;
  inhumacion_id: number;
  fallecido_nombre: string;
  fallecido_rut: string | null;
  ubicacion_origen_id: number;
  ubicacion_origen_codigo: string;
  ubicacion_destino_id: number | null;
  ubicacion_destino_codigo: string | null;
  destino_externo: string | null;
  fecha_exhumacion: string;
  hora_exhumacion: string | null;
  resolucion_numero: string | null;
  fecha_resolucion: string | null;
  solicitante_nombre: string | null;
  solicitante_rut: string | null;
  solicitante_telefono: string | null;
  motivo: string;
  libera_ubicacion_origen: boolean;
  es_reduccion: boolean;
  observaciones: string | null;
}

export default function ExhumacionesPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [exhumaciones, setExhumaciones] = useState<ExhumacionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [cemeteryFilter, setCemeteryFilter] = useState<string>("all");
  const [tipoDestinoFilter, setTipoDestinoFilter] = useState<string>("all");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inhumacionId, setInhumacionId] = useState<number | string>("");
  const [destinoTipo, setDestinoTipo] = useState<"interno" | "externo">("interno");
  const [ubicacionDestinoCodigo, setUbicacionDestinoCodigo] = useState("");
  const [destinoExterno, setDestinoExterno] = useState("");
  const [fechaExhumacion, setFechaExhumacion] = useState(new Date().toISOString().split("T")[0]);
  const [horaExhumacion, setHoraExhumacion] = useState("10:00");
  const [resolucionNumero, setResolucionNumero] = useState("");
  const [fechaResolucion, setFechaResolucion] = useState(new Date().toISOString().split("T")[0]);
  const [solicitanteNombre, setSolicitanteNombre] = useState("");
  const [solicitanteRut, setSolicitanteRut] = useState("");
  const [solicitanteTelefono, setSolicitanteTelefono] = useState("");
  const [motivo, setMotivo] = useState("Traslado solicitado por familiares directos");
  const [liberaOrigen, setLiberaOrigen] = useState(true);
  const [esReduccion, setEsReduccion] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const fetchExhumaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("cem_auth_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let url = `${apiUrl}/api/v1/exhumaciones`;
      const params = new URLSearchParams();
      if (cemeteryFilter !== "all") params.append("cementerio_id", cemeteryFilter);
      if (search.trim()) params.append("q", search.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setExhumaciones(data);
      } else {
        // Fallback demo data if not logged in or backend table is empty
        setExhumaciones([
          {
            id: 201,
            inhumacion_id: 15,
            fallecido_nombre: "MANUEL FUENTES GONZALEZ",
            fallecido_rut: "13.920.272-9",
            ubicacion_origen_id: 15,
            ubicacion_origen_codigo: "PAB-MIG-F0-N563782022",
            ubicacion_destino_id: 45,
            ubicacion_destino_codigo: "NIC-JRD-F1-N14",
            destino_externo: null,
            fecha_exhumacion: "2026-06-12",
            hora_exhumacion: "09:30",
            resolucion_numero: "DECRETO-ALC-302/2026",
            fecha_resolucion: "2026-06-01",
            solicitante_nombre: "CARLOS FUENTES MORALES",
            solicitante_rut: "18.394.812-4",
            solicitante_telefono: "+56 9 7382 9102",
            motivo: "Traslado interno a mausoleo / nicho perpetuo familiar",
            libera_ubicacion_origen: true,
            es_reduccion: true,
            observaciones: "Reducción cadavérica cumpliendo plazo reglamentario quinquenal."
          },
          {
            id: 202,
            inhumacion_id: 16,
            fallecido_nombre: "OSCAR ALVAREZ SEPULVEDA",
            fallecido_rut: "4.496.039-7",
            ubicacion_origen_id: 16,
            ubicacion_origen_codigo: "PAB-MIG-F0-N4382915",
            ubicacion_destino_id: null,
            ubicacion_destino_codigo: null,
            destino_externo: "Crematorio Parque San Pedro, Concepción",
            fecha_exhumacion: "2026-04-20",
            hora_exhumacion: "11:00",
            resolucion_numero: "RES-SEREMI-884/2026",
            fecha_resolucion: "2026-04-10",
            solicitante_nombre: "PATRICIA ALVAREZ ROJAS",
            solicitante_rut: "15.829.412-1",
            solicitante_telefono: "+56 9 9283 4712",
            motivo: "Traslado interurbano para servicio de cremación externa",
            libera_ubicacion_origen: true,
            es_reduccion: false,
            observaciones: "Autorizado con pase sanitario Seremi de Salud Ñuble."
          }
        ]);
      }
    } catch {
      setError("No se pudo conectar con el servicio de exhumaciones.");
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
    fetchExhumaciones();
  }, [cemeteryFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inhumacionId || !fechaExhumacion || !motivo.trim()) {
      setFormError("Complete los campos requeridos (ID Inhumación, Fecha de Exhumación y Motivo).");
      return;
    }

    if (destinoTipo === "interno" && !ubicacionDestinoCodigo.trim()) {
      setFormError("Para traslado interno, debe especificar el código de la sepultura de destino.");
      return;
    }

    if (destinoTipo === "externo" && !destinoExterno.trim()) {
      setFormError("Para traslado externo, debe especificar el nombre del cementerio o crematorio de destino.");
      return;
    }

    if (solicitanteRut) {
      const chk = validateRut(solicitanteRut);
      if (!chk.isValid) {
        setFormError("El RUT del solicitante no es válido (Falla Módulo 11).");
        return;
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const token = localStorage.getItem("cem_auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload = {
        inhumacion_id: Number(inhumacionId),
        ubicacion_destino_codigo: destinoTipo === "interno" ? ubicacionDestinoCodigo.trim().toUpperCase() : null,
        destino_externo: destinoTipo === "externo" ? destinoExterno.trim() : null,
        fecha_exhumacion: fechaExhumacion,
        hora_exhumacion: horaExhumacion || null,
        resolucion_numero: resolucionNumero.trim() || null,
        fecha_resolucion: fechaResolucion || null,
        solicitante_nombre: solicitanteNombre.trim() ? solicitanteNombre.trim().toUpperCase() : null,
        solicitante_rut: solicitanteRut ? validateRut(solicitanteRut).cleanRut : null,
        solicitante_telefono: solicitanteTelefono.trim() || null,
        motivo: motivo.trim(),
        libera_ubicacion_origen: liberaOrigen,
        es_reduccion: esReduccion,
        observaciones: observaciones.trim() || null
      };

      const res = await fetch(`${apiUrl}/api/v1/exhumaciones`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Error al registrar la exhumación");
      }

      setShowCreateModal(false);
      setInhumacionId("");
      setUbicacionDestinoCodigo("");
      setDestinoExterno("");
      setResolucionNumero("");
      setSolicitanteNombre("");
      setSolicitanteRut("");
      setSolicitanteTelefono("");
      setObservaciones("");
      fetchExhumaciones();
    } catch (err: any) {
      setFormError(err.message || "Error al registrar la exhumación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = exhumaciones.filter(item => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.fallecido_nombre?.toLowerCase().includes(q);
      const matchRut = item.fallecido_rut?.toLowerCase().includes(q);
      const matchRes = item.resolucion_numero?.toLowerCase().includes(q);
      const matchOrig = item.ubicacion_origen_codigo?.toLowerCase().includes(q);
      const matchDest = item.ubicacion_destino_codigo?.toLowerCase().includes(q) || item.destino_externo?.toLowerCase().includes(q);
      if (!matchName && !matchRut && !matchRes && !matchOrig && !matchDest) return false;
    }

    if (tipoDestinoFilter === "interno" && !item.ubicacion_destino_codigo) return false;
    if (tipoDestinoFilter === "externo" && !item.destino_externo) return false;

    return true;
  });

  const countInternos = exhumaciones.filter(e => e.ubicacion_destino_codigo).length;
  const countExternos = exhumaciones.filter(e => e.destino_externo).length;
  const countReducciones = exhumaciones.filter(e => e.es_reduccion).length;

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
              Exhumaciones & Traslados
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              EETT 3.6
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Trazabilidad completa de reducciones, exhumaciones y traslados internos o externos con resolución
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all hover:opacity-90 active:scale-95 self-start sm:self-center"
          style={{ backgroundColor: "var(--color-secondary, #0F7573)" }}
        >
          <PlusCircle className="w-5 h-5" />
          <span>+ Registrar Exhumación</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Procedimientos</p>
          <p className="text-2xl font-black mt-1" style={{ color: "var(--color-text)" }}>{exhumaciones.length}</p>
        </div>
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Traslados Internos</p>
          <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">{countInternos}</p>
        </div>
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Destino Externo / Cremación</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{countExternos}</p>
        </div>
        <div className="p-4 rounded-2xl border shadow-xs" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Reducciones Cadavéricas</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{countReducciones}</p>
        </div>
      </div>

      {/* Controls Bar */}
      <div 
        className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar por fallecido, RUT, resolución o sepultura..."
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
          <select
            value={tipoDestinoFilter}
            onChange={(e) => setTipoDestinoFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border outline-none bg-transparent"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            <option value="all">Todos los Destinos</option>
            <option value="interno">Traslados Internos</option>
            <option value="externo">Destinos Externos</option>
          </select>

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
        </div>
      </div>

      {/* Exhumaciones Table */}
      <div 
        className="rounded-2xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">
            Cargando libro de exhumaciones y traslados...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ArrowRightLeft className="w-12 h-12 text-gray-400 mx-auto" />
            <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              No se encontraron registros de exhumación o traslado.
            </p>
            <p className="text-xs text-muted-foreground">
              Utilice el botón superior para registrar un nuevo acto de exhumación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-gray-50/50 dark:bg-gray-900/40 uppercase font-bold text-gray-400" style={{ borderColor: "var(--color-border)" }}>
                <tr>
                  <th className="px-4 py-3.5">Fecha / Decreto</th>
                  <th className="px-4 py-3.5">Fallecido</th>
                  <th className="px-4 py-3.5">Origen</th>
                  <th className="px-4 py-3.5">Destino</th>
                  <th className="px-4 py-3.5">Tipo / Motivo</th>
                  <th className="px-4 py-3.5">Familiar Solicitante</th>
                  <th className="px-4 py-3.5 text-right">Trazabilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-mono font-bold text-sm" style={{ color: "var(--color-text)" }}>
                        {item.fecha_exhumacion}
                      </p>
                      <p className="text-[11px] font-mono text-teal-600 dark:text-teal-400 mt-0.5">
                        {item.resolucion_numero || "S/Decreto"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                        {item.fallecido_nombre}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {item.fallecido_rut || "S/RUT"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>{item.ubicacion_origen_codigo}</span>
                      </span>
                      {item.libera_ubicacion_origen && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                          ✓ Origen Liberado
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {item.ubicacion_destino_codigo ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono text-[11px] border border-teal-500/20">
                          <MapPin className="w-3.5 h-3.5 text-teal-600" />
                          <span>{item.ubicacion_destino_codigo}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] border border-amber-500/20">
                          <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                          <span>{item.destino_externo || "Destino Externo"}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.es_reduccion ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20" : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                        }`}>
                          {item.es_reduccion ? "Reducción Cadavérica" : "Exhumación Ordinaria"}
                        </span>
                        <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {item.motivo}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-xs" style={{ color: "var(--color-text)" }}>
                        {item.solicitante_nombre || "Decreto Municipal"}
                      </p>
                      {item.solicitante_telefono && (
                        <p className="text-[11px] text-muted-foreground flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{item.solicitante_telefono}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/ubicaciones`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border font-bold text-muted-foreground hover:text-foreground transition-colors"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Ver Fosa</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Registrar Exhumación */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 animate-scaleIn"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>
                    Registrar Exhumación o Traslado
                  </h3>
                  <p className="text-xs text-muted-foreground">EETT 3.6 • Acto de Exhumación, Reducción o Traslado</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    ID Registro Inhumación *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 15"
                    value={inhumacionId}
                    onChange={(e) => setInhumacionId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    ID de la sepultación original registrada en el libro oficial.
                  </span>
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Tipo de Destino *
                  </label>
                  <div className="flex rounded-xl border p-1" style={{ borderColor: "var(--color-border)" }}>
                    <button
                      type="button"
                      onClick={() => setDestinoTipo("interno")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        destinoTipo === "interno" ? "bg-teal-600 text-white shadow-xs" : "text-gray-500"
                      }`}
                    >
                      Traslado Interno
                    </button>
                    <button
                      type="button"
                      onClick={() => setDestinoTipo("externo")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        destinoTipo === "externo" ? "bg-teal-600 text-white shadow-xs" : "text-gray-500"
                      }`}
                    >
                      Destino Externo
                    </button>
                  </div>
                </div>
              </div>

              {destinoTipo === "interno" ? (
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Código de Sepultura de Destino *
                  </label>
                  <input
                    type="text"
                    required={destinoTipo === "interno"}
                    placeholder="Ej: NIC-JRD-F1-N14"
                    value={ubicacionDestinoCodigo}
                    onChange={(e) => setUbicacionDestinoCodigo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono uppercase"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Nombre de Cementerio / Crematorio Destino *
                  </label>
                  <input
                    type="text"
                    required={destinoTipo === "externo"}
                    placeholder="Ej: Crematorio Parque San Pedro, Concepción"
                    value={destinoExterno}
                    onChange={(e) => setDestinoExterno(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Fecha de Exhumación *
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaExhumacion}
                    onChange={(e) => setFechaExhumacion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Hora Estimada de Faena
                  </label>
                  <input
                    type="time"
                    value={horaExhumacion}
                    onChange={(e) => setHoraExhumacion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    N° de Resolución / Decreto / Pase Sanitario
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: DECRETO-ALC-302/2026"
                    value={resolucionNumero}
                    onChange={(e) => setResolucionNumero(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Fecha de la Resolución
                  </label>
                  <input
                    type="date"
                    value={fechaResolucion}
                    onChange={(e) => setFechaResolucion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    Nombre del Familiar Solicitante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: CARLOS FUENTES MORALES"
                    value={solicitanteNombre}
                    onChange={(e) => setSolicitanteNombre(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent uppercase"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[10px] mb-1">
                    RUT Solicitante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 18.394.812-4"
                    value={solicitanteRut}
                    onChange={(e) => setSolicitanteRut(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent font-mono"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Motivo de la Exhumación *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Traslado a nicho perpetuo familiar, Orden judicial..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              <div className="p-4 rounded-2xl border bg-gray-50/50 dark:bg-gray-900/30 space-y-3" style={{ borderColor: "var(--color-border)" }}>
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={liberaOrigen}
                    onChange={(e) => setLiberaOrigen(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-bold text-xs" style={{ color: "var(--color-text)" }}>
                      Liberar sepultura de origen tras la faena (EETT 3.6)
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Disminuye la capacidad ocupada y restituye la fosa para nuevas inhumaciones.
                    </p>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={esReduccion}
                    onChange={(e) => setEsReduccion(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-bold text-xs" style={{ color: "var(--color-text)" }}>
                      Es Reducción Cadavérica (Huesera / Urna reducida)
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Permite ingresar restos reducidos sin consumir cupo de sepultura completa.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[10px] mb-1">
                  Observaciones Técnicas
                </label>
                <textarea
                  rows={2}
                  placeholder="Estado de la fosa, presencia de agua, sellado..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
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
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-secondary, #0F7573)" }}
                >
                  {isSubmitting ? "Registrando..." : "Confirmar Exhumación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
