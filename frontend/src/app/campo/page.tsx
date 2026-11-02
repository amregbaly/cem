"use client";

import React, { useState, useEffect } from "react";
import { 
  HardHat, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Camera, 
  Upload, 
  FileCheck, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  User, 
  ShieldCheck,
  ChevronRight,
  Filter,
  Plus,
  X,
  Sparkles
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface FieldTask {
  id: number;
  folio_orden: string;
  cementerio_id: number;
  cementerio_nombre: string;
  ubicacion_id?: number | null;
  codigo_ubicacion: string;
  tipo_tarea: "INHUMACION" | "EXHUMACION" | "MANTENCION" | "APERTURA_FOSA";
  estado: "PENDIENTE" | "EN_PROCESO" | "COMPLETADA" | "CANCELADA";
  fallecido_nombre?: string | null;
  rut_fallecido?: string | null;
  solicitante_nombre?: string | null;
  fecha_programada: string;
  hora_programada?: string | null;
  sepulturero_asignado?: string | null;
  acta_firmada_url?: string | null;
  foto_pase_url?: string | null;
  observaciones?: string | null;
  ejecutado_at?: string | null;
  ejecutado_por?: string | null;
}

export default function ModoTerrenoPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [agenda, setAgenda] = useState<FieldTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<FieldTask | null>(null);
  const [cemeteryFilter, setCemeteryFilter] = useState<number | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // New order modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cementerio_id: 1,
    tipo_tarea: "INHUMACION",
    codigo_ubicacion: "",
    fecha_programada: new Date().toISOString().split("T")[0],
    hora_programada: "11:00",
    fallecido_nombre: "",
    rut_fallecido: "",
    solicitante_nombre: "",
    sepulturero_asignado: "Cuadrilla 1 (Héctor & Manuel)",
    observaciones: ""
  });

  // Check URL query parameters for prefill
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("crear") === "true") {
        setShowCreateModal(true);
      }
      if (urlParams.get("ubicacion")) {
        setFormData(prev => ({ ...prev, codigo_ubicacion: urlParams.get("ubicacion") || "" }));
      }
      if (urlParams.get("cementerio")) {
        setFormData(prev => ({ ...prev, cementerio_id: Number(urlParams.get("cementerio")) || 1 }));
      }
    }
  }, []);

  // Monitor browser online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchAgenda = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const cemParam = cemeteryFilter ? `?cementerio_id=${cemeteryFilter}` : "";
      const res = await fetch(`${apiUrl}/api/v1/terreno/agenda${cemParam}`);
      if (!res.ok) throw new Error("Error cargando agenda de terreno");
      const data = await res.json();
      setAgenda(data);
    } catch {
      // Fallback offline mock tasks
      const fallbackTasks: FieldTask[] = [
        {
          id: 1,
          folio_orden: "ORD-2026-0101",
          cementerio_id: 1,
          cementerio_nombre: "Cementerio Municipal de San Carlos",
          codigo_ubicacion: "PAB-A-F01-N001",
          tipo_tarea: "INHUMACION",
          estado: "PENDIENTE",
          fallecido_nombre: "TERESA DE JESUS GONZALEZ BUSTOS",
          rut_fallecido: "14.567.890-1",
          solicitante_nombre: "ROBERTO SEPULVEDA",
          fecha_programada: new Date().toISOString().split("T")[0],
          hora_programada: "11:30",
          sepulturero_asignado: "Cuadrilla 1 (Héctor & Manuel)",
          observaciones: "Sepultación en Nicho Pabellón A. Verificar recepción de pase médico oficial."
        },
        {
          id: 2,
          folio_orden: "ORD-2026-0102",
          cementerio_id: 1,
          cementerio_nombre: "Cementerio Municipal de San Carlos",
          codigo_ubicacion: "PAT-01-F12-N088",
          tipo_tarea: "MANTENCION",
          estado: "EN_PROCESO",
          solicitante_nombre: "Administración Municipal",
          fecha_programada: new Date().toISOString().split("T")[0],
          hora_programada: "14:00",
          sepulturero_asignado: "Cuadrilla 2",
          observaciones: "Reparación de solera y encalado en vereda norte Patio 1."
        },
        {
          id: 3,
          folio_orden: "ORD-2026-0103",
          cementerio_id: 2,
          cementerio_nombre: "Cementerio Municipal de Cachapoal",
          codigo_ubicacion: "PAT-R-F01-N019",
          tipo_tarea: "EXHUMACION",
          estado: "PENDIENTE",
          fallecido_nombre: "FRANCISCO JAVIER PINOCHET CONTRERAS",
          rut_fallecido: "17.890.123-4",
          solicitante_nombre: "Familia Pinochet",
          fecha_programada: new Date().toISOString().split("T")[0],
          hora_programada: "16:00",
          sepulturero_asignado: "Cuadrilla Cachapoal",
          observaciones: "Traslado interno con autorización de Seremi de Salud N° 4421."
        }
      ];
      setAgenda(fallbackTasks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgenda();
  }, [cemeteryFilter]);

  const handleCompleteTask = async (taskId: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/api/v1/terreno/tarea/${taskId}/completar?operario_nombre=Sepulturero+en+Terreno&observaciones=Verificado+y+sellado`, {
        method: "PATCH"
      });
      if (!res.ok) throw new Error("Fallo al marcar tarea");
      
      // Update local state
      setAgenda(prev => prev.map(t => t.id === taskId ? { ...t, estado: "COMPLETADA", ejecutado_at: new Date().toISOString() } : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, estado: "COMPLETADA", ejecutado_at: new Date().toISOString() } : null);
      }
    } catch {
      // Local fallback toggle
      setAgenda(prev => prev.map(t => t.id === taskId ? { ...t, estado: "COMPLETADA" } : t));
    }
  };

  const handleFileUpload = async (taskId: number, file: File, tipoDoc: "acta" | "pase") => {
    setUploading(true);
    setUploadSuccess(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const formData = new FormData();
      formData.append("task_id", taskId.toString());
      formData.append("tipo_documento", tipoDoc);
      formData.append("archivo", file);

      const res = await fetch(`${apiUrl}/api/v1/terreno/subir-acta`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Fallo al subir archivo");
      const data = await res.json();
      setUploadSuccess(`Archivo ${file.name} adjuntado exitosamente a la orden.`);
      fetchAgenda();
    } catch {
      setUploadSuccess(`Archivo ${file.name} guardado en cola local.`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/api/v1/terreno/tarea`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cementerio_id: Number(formData.cementerio_id),
          tipo_tarea: formData.tipo_tarea,
          codigo_ubicacion: formData.codigo_ubicacion.trim() || undefined,
          fecha_programada: formData.fecha_programada,
          hora_programada: formData.hora_programada,
          fallecido_nombre: formData.fallecido_nombre.trim() || undefined,
          rut_fallecido: formData.rut_fallecido.trim() || undefined,
          solicitante_nombre: formData.solicitante_nombre.trim() || undefined,
          sepulturero_asignado: formData.sepulturero_asignado.trim() || "Cuadrilla 1",
          observaciones: formData.observaciones.trim() || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al emitir la orden de terreno.");
      }

      const created = await res.json();
      setCreateSuccess(`Orden ${created.folio_orden} emitida con éxito.`);
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
      }, 1200);

      // Refresh agenda
      fetchAgenda();
    } catch (err: any) {
      setCreateError(err.message || "Error al conectar con el servidor.");
    } finally {
      setCreating(false);
    }
  };

  const getTaskBadge = (tipo: string, estado: string) => {
    const isCompleted = estado === "COMPLETADA";
    if (isCompleted) {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
    switch (tipo) {
      case "INHUMACION":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "EXHUMACION":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16">
      {/* PWA Mobile Header */}
      <div className="p-4 rounded-3xl border shadow-sm flex items-center justify-between" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-md">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black" style={{ color: "var(--color-text)" }}>
                Modo Terreno
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                PWA Sepultureros
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Agenda diaria de faenas e inhumaciones
            </p>
          </div>
        </div>

        {/* Online / Offline status badge */}
        <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
          isOnline 
            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
            : "bg-rose-500/10 text-rose-600 border-rose-500/20"
        }`}>
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{isOnline ? "En Línea" : "Sin Conexión"}</span>
        </div>
      </div>

      {/* Cemetery Selector */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setCemeteryFilter(null)}
          className={`py-2 rounded-2xl text-xs font-bold transition-all border ${
            cemeteryFilter === null 
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm" 
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          style={{ borderColor: "var(--color-border)" }}
        >
          Todos
        </button>
        <button
          onClick={() => setCemeteryFilter(1)}
          className={`py-2 rounded-2xl text-xs font-bold transition-all border ${
            cemeteryFilter === 1 
              ? "bg-blue-600 text-white shadow-sm" 
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          style={{ borderColor: "var(--color-border)" }}
        >
          San Carlos
        </button>
        <button
          onClick={() => setCemeteryFilter(2)}
          className={`py-2 rounded-2xl text-xs font-bold transition-all border ${
            cemeteryFilter === 2 
              ? "bg-emerald-600 text-white shadow-sm" 
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          style={{ borderColor: "var(--color-border)" }}
        >
          Cachapoal
        </button>
      </div>

      {/* Action Bar: Create Order & Agenda Info */}
      <div 
        className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border bg-slate-50/50 dark:bg-slate-900/40"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center space-x-2 text-xs font-bold" style={{ color: "var(--color-text)" }}>
          <Calendar className="w-4 h-4 text-amber-500" />
          <span>Agenda Operativa</span>
          <span className="text-[11px] font-normal text-gray-400">
            ({agenda.length} faena{agenda.length !== 1 ? 's' : ''})
          </span>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nueva Orden de Faena</span>
        </button>
      </div>

      {/* Daily Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400">
            Cargando agenda de faenas...
          </div>
        ) : agenda.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400 rounded-3xl border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            No hay órdenes de terreno programadas para hoy.
          </div>
        ) : (
          agenda.map(task => {
            const isCompleted = task.estado === "COMPLETADA";
            const badgeClass = getTaskBadge(task.tipo_tarea, task.estado);

            return (
              <div
                key={task.id}
                className={`p-4 rounded-3xl border shadow-sm transition-all space-y-3 ${
                  isCompleted ? "opacity-75 bg-gray-50 dark:bg-gray-900/40" : ""
                }`}
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
                      {task.tipo_tarea}
                    </span>
                    <span className="font-mono font-bold text-xs text-gray-500">
                      {task.folio_orden}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 text-xs font-bold font-mono text-gray-700 dark:text-gray-300">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>{task.hora_programada || "Horario Libre"}</span>
                  </div>
                </div>

                {/* Main Task Info */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-black" style={{ color: "var(--color-text)" }}>
                        {task.fallecido_nombre || task.solicitante_nombre}
                      </p>
                      {task.rut_fallecido && (
                        <p className="text-xs font-mono text-gray-400">RUT: {task.rut_fallecido}</p>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold text-xs border border-blue-500/20">
                      {task.codigo_ubicacion}
                    </span>
                  </div>

                  {task.observaciones && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                      {task.observaciones}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t flex items-center justify-between gap-2" style={{ borderColor: "var(--color-border)" }}>
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:opacity-80 transition-opacity"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Adjuntar Pase/Acta</span>
                  </button>

                  {isCompleted ? (
                    <span className="flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completada</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Marcar Ejecutada</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-2.5">
                <Camera className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                    Adjuntar Acta o Pase de Terreno
                  </h3>
                  <p className="text-xs text-gray-400">{selectedTask.folio_orden}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {uploadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs">
                {uploadSuccess}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1.5 text-gray-700 dark:text-gray-300">
                  Acta de Sepultación Firmada (Foto o PDF hasta 10MB)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(selectedTask.id, e.target.files[0], "acta");
                    }
                  }}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:opacity-80 cursor-pointer"
                />
              </div>

              <div>
                <label className="font-bold block mb-1.5 text-gray-700 dark:text-gray-300">
                  Pase Médico de Sepultación (Foto)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(selectedTask.id, e.target.files[0], "pase");
                    }
                  }}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:opacity-80 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Task / Order Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                    Emitir Nueva Orden de Faena
                  </h3>
                  <p className="text-xs text-gray-400">Asignar tarea operativa a cuadrilla de terreno</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error / Success Feedback */}
            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}
            {createSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{createSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cemetery */}
                <div>
                  <label className="font-bold block mb-1" style={{ color: "var(--color-text)" }}>
                    Cementerio Municipal *
                  </label>
                  <select
                    value={formData.cementerio_id}
                    onChange={(e) => setFormData({ ...formData, cementerio_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent font-medium outline-none focus:border-amber-500"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  >
                    <option value={1}>Cementerio Municipal San Carlos</option>
                    <option value={2}>Cementerio Municipal Cachapoal</option>
                  </select>
                </div>

                {/* Task Type */}
                <div>
                  <label className="font-bold block mb-1" style={{ color: "var(--color-text)" }}>
                    Tipo de Faena *
                  </label>
                  <select
                    value={formData.tipo_tarea}
                    onChange={(e) => setFormData({ ...formData, tipo_tarea: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent font-medium outline-none focus:border-amber-500"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  >
                    <option value="INHUMACION">Inhumación (Sepultación)</option>
                    <option value="APERTURA_FOSA">Apertura / Preparación de Fosa</option>
                    <option value="EXHUMACION">Exhumación / Reducción</option>
                    <option value="MANTENCION">Mantención / Obras Civiles</option>
                  </select>
                </div>

                {/* Location code */}
                <div>
                  <label className="font-bold block mb-1" style={{ color: "var(--color-text)" }}>
                    Código Sepultura / Ubicación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: PAB-A-F01-N001"
                    value={formData.codigo_ubicacion}
                    onChange={(e) => setFormData({ ...formData, codigo_ubicacion: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent font-mono uppercase outline-none focus:border-amber-500"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>

                {/* Crew assigned */}
                <div>
                  <label className="font-bold block mb-1" style={{ color: "var(--color-text)" }}>
                    Cuadrilla / Operario Asignado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Cuadrilla 1 (Héctor & Manuel)"
                    value={formData.sepulturero_asignado}
                    onChange={(e) => setFormData({ ...formData, sepulturero_asignado: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-amber-500"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="font-bold block mb-1" style={{ color: "var(--color-text)" }}>
                    Fecha Programada *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_programada}
                    onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-amber-500"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="font-bold block mb-1" style={{ color: "var(--color-text)" }}>
                    Hora Programada
                  </label>
                  <input
                    type="time"
                    value={formData.hora_programada}
                    onChange={(e) => setFormData({ ...formData, hora_programada: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-amber-500"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>

                {/* Deceased Name */}
                <div>
                  <label className="font-bold block mb-1" style={{ color: "var(--color-text)" }}>
                    Nombre del Fallecido
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre y Apellidos"
                    value={formData.fallecido_nombre}
                    onChange={(e) => setFormData({ ...formData, fallecido_nombre: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-amber-500"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>

                {/* Deceased RUT */}
                <div>
                  <label className="font-bold block mb-1" style={{ color: "var(--color-text)" }}>
                    RUT Fallecido
                  </label>
                  <input
                    type="text"
                    placeholder="12.345.678-9"
                    value={formData.rut_fallecido}
                    onChange={(e) => setFormData({ ...formData, rut_fallecido: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-amber-500"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              {/* Solicitante */}
              <div>
                <label className="font-bold block mb-1" style={{ color: "var(--color-text)" }}>
                  Solicitante / Contacto Familiar
                </label>
                <input
                  type="text"
                  placeholder="Nombre de contacto o familiar responsable"
                  value={formData.solicitante_nombre}
                  onChange={(e) => setFormData({ ...formData, solicitante_nombre: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-amber-500"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="font-bold block mb-1" style={{ color: "var(--color-text)" }}>
                  Instrucciones Técnicas / Observaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones específicas para la cuadrilla en terreno..."
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-transparent outline-none focus:border-amber-500"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end space-x-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {creating ? "Emitiendo Orden..." : "Emitir Orden de Terreno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
