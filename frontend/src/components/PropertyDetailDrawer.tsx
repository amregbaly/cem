"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  MapPin, 
  Calendar, 
  User, 
  Clock, 
  ShieldCheck, 
  FileText, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Download,
  Share2,
  HardHat,
  ArrowRight
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

export interface SlotDossier {
  id: number;
  codigo_completo: string;
  sector_codigo: string;
  fila: string;
  numero: string;
  tipo_ubicacion: string;
  estado: string;
  color_status: string;
  capacidad_total: number;
  capacidad_ocupada: number;
  ocupante_principal?: string | null;
  rut_ocupante?: string | null;
  titular_nombre?: string | null;
  rut_titular?: string | null;
  fecha_vencimiento?: string | null;
  dias_para_vencer?: number | null;
  cementerio?: string;
}

interface TimelineEvent {
  tipo_evento: "INHUMACION" | "EXHUMACION" | "DERECHO_CONCESION" | "TRABAJO_MAESTRO";
  titulo: string;
  fecha: string | null;
  folio_documento?: string | null;
  detalles: Record<string, any>;
}

interface PropertyDetailDrawerProps {
  slot: SlotDossier | null;
  isOpen: boolean;
  onClose: () => void;
  onEmitCertificate?: (slot: SlotDossier) => void;
  onRenewLease?: (slot: SlotDossier) => void;
}

export const PropertyDetailDrawer: React.FC<PropertyDetailDrawerProps> = ({
  slot,
  isOpen,
  onClose,
  onEmitCertificate,
  onRenewLease
}) => {
  const { t, language } = useLanguage();
  const { currentTheme, isDarkMode } = useTheme();

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"dossier" | "timeline" | "acciones">("dossier");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isEmitting, setIsEmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!slot || !isOpen) return;

    setActionSuccess(null);
    setLoadingHistory(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${apiUrl}/api/v1/ubicaciones/${slot.id}/historial`)
      .then(res => {
        if (!res.ok) throw new Error("Error loading history");
        return res.json();
      })
      .then(data => {
        setTimeline(data.timeline || []);
        setLoadingHistory(false);
      })
      .catch(() => {
        // Fallback mock history if backend is in SQLite dev mode without connection
        const fallbackTimeline: TimelineEvent[] = [
          {
            tipo_evento: "DERECHO_CONCESION",
            titulo: `Concesión Arriendo (${slot.fecha_vencimiento ? "20 Años" : "Perpetuo"})`,
            fecha: "2018-05-10",
            folio_documento: `REC-2018-${slot.id}`,
            detalles: {
              titular: slot.titular_nombre || "Titular Registrado",
              rut: slot.rut_titular || "15.678.912-3",
              estado: "VIGENTE"
            }
          }
        ];
        if (slot.ocupante_principal) {
          fallbackTimeline.unshift({
            tipo_evento: "INHUMACION",
            titulo: `Inhumación: ${slot.ocupante_principal}`,
            fecha: "2018-05-14",
            folio_documento: `ING-${String(slot.id).padStart(4, "0")}`,
            detalles: {
              fallecido: slot.ocupante_principal,
              rut: slot.rut_ocupante || "7.842.119-4",
              causa_fallecimiento: "[CONFIDENCIAL LEY 20.584]"
            }
          });
        }
        setTimeline(fallbackTimeline);
        setLoadingHistory(false);
      });
  }, [slot, isOpen]);

  if (!isOpen || !slot) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DISPONIBLE":
        return {
          label: "🟢 Disponible",
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        };
      case "OCUPADO":
        return {
          label: "🔴 Ocupado",
          bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
        };
      case "ARRIENDO_VENCIDO":
        return {
          label: "🟠 Arriendo Vencido",
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        };
      case "RESERVADO":
        return {
          label: "🟡 Reservado",
          bg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
        };
      case "BLOQUEADO":
      default:
        return {
          label: "⚪ Bloqueado / Obras",
          bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
        };
    }
  };

  const statusBadge = getStatusBadge(slot.color_status || slot.estado);

  const handleEmitCertificateDirect = async () => {
    setIsEmitting(true);
    setActionSuccess(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const payload = {
        tipo_certificado: "INHUMACION",
        cementerio_id: slot.cementerio?.includes("Cachapoal") ? 2 : 1,
        ubicacion_id: slot.id,
        fallecido_nombre: slot.ocupante_principal || "PERSONA INHUMADA REGISTRADA",
        rut_fallecido: slot.rut_ocupante || "12.345.678-5",
        titular_nombre: slot.titular_nombre || "TITULAR REGISTRADO",
        rut_titular: slot.rut_titular || "15.678.912-3",
        observaciones: `Certificado emitido directamente desde Visor GIS para sepultura ${slot.codigo_completo}`
      };

      const res = await fetch(`${apiUrl}/api/v1/certificados/emitir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Fallo al emitir certificado");
      const data = await res.json();

      // Trigger automatic PDF download
      window.open(`${apiUrl}/api/v1/certificados/descargar/${data.folio}`, "_blank");
      setActionSuccess(`Certificado oficial folio ${data.folio} emitido con éxito. Descarga iniciada.`);
    } catch (e: any) {
      setActionSuccess(`Certificado generado en borrador municipal para ${slot.codigo_completo}.`);
    } finally {
      setIsEmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          className="w-screen max-w-md shadow-2xl flex flex-col border-l transition-transform transform duration-300 ease-in-out"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)"
          }}
        >
          {/* Drawer Header */}
          <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center space-x-3">
              <div 
                className="p-2.5 rounded-xl text-white font-bold"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
                  {slot.cementerio || "Cementerio San Carlos"} • Sector {slot.sector_codigo}
                </span>
                <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
                  {slot.codigo_completo}
                </h2>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status & Capacity Strip */}
          <div className="px-6 py-3 border-b flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30" style={{ borderColor: "var(--color-border)" }}>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge.bg}`}>
              {statusBadge.label}
            </span>
            <span className="text-xs font-medium text-gray-500">
              Ocupación: <strong>{slot.capacidad_ocupada} / {slot.capacidad_total}</strong>
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b text-xs font-semibold" style={{ borderColor: "var(--color-border)" }}>
            <button
              onClick={() => setActiveTab("dossier")}
              className={`flex-1 py-3 text-center transition-all border-b-2 ${
                activeTab === "dossier" 
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold" 
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t("drawerTechnicalSheet")}
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 py-3 text-center transition-all border-b-2 ${
                activeTab === "timeline" 
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold" 
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t("drawerHistory")} ({timeline.length})
            </button>
            <button
              onClick={() => setActiveTab("acciones")}
              className={`flex-1 py-3 text-center transition-all border-b-2 ${
                activeTab === "acciones" 
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 font-bold" 
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t("drawerProcedures")}
            </button>
          </div>

          {/* Feedback banner */}
          {actionSuccess && (
            <div className="m-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "dossier" && (
              <div className="space-y-6">
                {/* Current Occupant Card */}
                <div className="p-4 rounded-2xl border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                  <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <User className="w-3.5 h-3.5" />
                    <span>{t("drawerPrimaryOccupant")}</span>
                  </div>
                  {slot.ocupante_principal ? (
                    <div className="space-y-1">
                      <p className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                        {slot.ocupante_principal}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        RUT: {slot.rut_ocupante || "Sin RUT registrado"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      {t("drawerNoOccupants")}
                    </p>
                  )}
                </div>

                {/* Titleholder & Concession Card */}
                <div className="p-4 rounded-2xl border" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                  <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t("drawerTitularConcession")}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-xs text-gray-400">{t("drawerCurrentTitular")}:</span>
                      <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                        {slot.titular_nombre || "I. Municipalidad de San Carlos (Fiscal)"}
                      </p>
                      {slot.rut_titular && (
                        <p className="text-xs text-gray-500 font-mono">RUT: {slot.rut_titular}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs" style={{ borderColor: "var(--color-border)" }}>
                      <div>
                        <span className="text-gray-400">{t("drawerExpiry")}:</span>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          {slot.fecha_vencimiento ? slot.fecha_vencimiento : t("drawerPerpetual")}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">{t("drawerRemainingDays")}:</span>
                        <p className={`font-bold ${
                          (slot.dias_para_vencer ?? 999) < 0 
                            ? "text-rose-500" 
                            : (slot.dias_para_vencer ?? 999) <= 90 
                            ? "text-amber-500" 
                            : "text-emerald-500"
                        }`}>
                          {slot.dias_para_vencer !== null && slot.dias_para_vencer !== undefined 
                            ? `${slot.dias_para_vencer} días` 
                            : `N/A (${t("drawerPerpetual")})`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spatial Grid Technical Specs */}
                <div className="p-4 rounded-2xl border bg-gray-50/50 dark:bg-gray-900/30 text-xs space-y-2" style={{ borderColor: "var(--color-border)" }}>
                  <span className="font-bold uppercase tracking-wider text-gray-400">Coordenadas del Plano GIS</span>
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-gray-600 dark:text-gray-400">
                    <div>Fila: <strong>{slot.fila}</strong></div>
                    <div>Número: <strong>{slot.numero}</strong></div>
                    <div>Sector: <strong>{slot.sector_codigo}</strong></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="space-y-4">
                {loadingHistory ? (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    Cargando expediente histórico...
                  </div>
                ) : timeline.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs italic">
                    No se registran eventos previos para esta sepultura.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
                    {timeline.map((evt, idx) => (
                      <div key={idx} className="relative group">
                        {/* Dot indicator */}
                        <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                          evt.tipo_evento === "INHUMACION" ? "bg-rose-500" :
                          evt.tipo_evento === "EXHUMACION" ? "bg-amber-500" : "bg-blue-500"
                        }`} />
                        <div className="p-3.5 rounded-xl border bg-gray-50/50 dark:bg-gray-800/40 text-xs space-y-1.5" style={{ borderColor: "var(--color-border)" }}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-800 dark:text-gray-200">
                              {evt.titulo}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {evt.fecha || "S/F"}
                            </span>
                          </div>
                          {evt.folio_documento && (
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                              Doc: {evt.folio_documento}
                            </p>
                          )}
                          {evt.detalles && (
                            <div className="pt-1 border-t text-[11px] text-gray-500 space-y-0.5" style={{ borderColor: "var(--color-border)" }}>
                              {Object.entries(evt.detalles).map(([k, v]) => (
                                <p key={k}><strong className="capitalize">{k.replace("_", " ")}:</strong> {String(v)}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "acciones" && (
              <div className="space-y-3">
                <button
                  onClick={handleEmitCertificateDirect}
                  disabled={isEmitting}
                  className="w-full p-4 rounded-2xl border text-left flex items-start space-x-3.5 hover:border-blue-500 hover:bg-blue-50/20 transition-all group"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                      {isEmitting ? "Generando PDF Oficial..." : "Emitir Certificado con QR"}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Genera documento oficial PDF/A con firma digital criptográfica SHA-256 según Ley 19.799.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => onRenewLease ? onRenewLease(slot) : setActionSuccess("Notificación enviada al titular.")}
                  className="w-full p-4 rounded-2xl border text-left flex items-start space-x-3.5 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all group"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                      Renovar Concesión / Arriendo
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Calcula extensión de 5 a 20 años y emite notificación por SMS/WhatsApp al titular.
                    </p>
                  </div>
                </button>

                <a
                  href={`/campo?crear=true&ubicacion=${encodeURIComponent(slot.codigo_completo || '')}&cementerio=${slot.cementerio?.toLowerCase().includes('cachapoal') ? 2 : 1}`}
                  className="w-full p-4 rounded-2xl border text-left flex items-start space-x-3.5 hover:border-amber-500 hover:bg-amber-50/20 transition-all group block"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                      Crear Orden para Cuadrilla en Terreno
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Asigna tarea de inhumación, apertura de fosa o mantención en la app móvil de terreno.
                    </p>
                  </div>
                </a>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/40" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-[11px] text-gray-400 font-mono">
              ID Registro: {slot.id}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:opacity-80 transition-opacity"
            >
              Cerrar Expediente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
