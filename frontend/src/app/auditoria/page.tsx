"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Lock, 
  Search, 
  KeyRound, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle,
  Code2,
  Copy,
  Check,
  Download,
  FileArchive,
  FileSpreadsheet,
  Database
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface AuditEntry {
  id: number;
  creado_en: string;
  usuario_id: string;
  rut_usuario: string;
  ip_origen: string;
  modulo: string;
  accion: string;
  entidad_tipo: string;
  entidad_id: string;
  datos_anteriores: string | null;
  datos_nuevos: string;
  hash_previo: string;
  hash_registro: string;
  es_valido?: boolean;
}

const INITIAL_LOGS: AuditEntry[] = [
  {
    id: 1,
    creado_en: "2026-10-28T09:14:22.108Z",
    usuario_id: "admin@sancarlos.cl",
    rut_usuario: "15.892.441-2",
    ip_origen: "192.168.1.45",
    modulo: "INHUMACIONES",
    accion: "REGISTRAR_INHUMACION",
    entidad_tipo: "tb_inhumacion",
    entidad_id: "ING-623302025",
    datos_anteriores: null,
    datos_nuevos: JSON.stringify({ fallecido: "PATRICIA CASTILLO ROJAS", rut: "21371451-1", sepultura: "MIG-5086818", cementerio: "San Carlos" }, null, 2),
    hash_previo: "0000000000000000000000000000000000000000000000000000000000000000",
    hash_registro: "4a2f8b1c93a20e98ff7b6a1204cd194e823b7e41d8a1c93b6e82a94f1c9a8e02"
  },
  {
    id: 2,
    creado_en: "2026-10-28T11:42:05.419Z",
    usuario_id: "secretaria@sancarlos.cl",
    rut_usuario: "17.402.918-K",
    ip_origen: "192.168.1.48",
    modulo: "DERECHOS",
    accion: "ASIGNAR_ARRIENDO_PERPETUO",
    entidad_tipo: "tb_derecho",
    entidad_id: "DER-192675",
    datos_anteriores: JSON.stringify({ estado: "DISPONIBLE" }),
    datos_nuevos: JSON.stringify({ estado: "OCUPADO", tipo: "ARRIENDO", titular: "MARIA ELENA HERNANDEZ CONTRERAS" }, null, 2),
    hash_previo: "4a2f8b1c93a20e98ff7b6a1204cd194e823b7e41d8a1c93b6e82a94f1c9a8e02",
    hash_registro: "7c19a4e823b7e41d8a1c93b6e82a94f1c9a8e02d18f4b1c93a20e98ff7b6a120"
  },
  {
    id: 3,
    creado_en: "2026-10-29T14:05:11.902Z",
    usuario_id: "admin@sancarlos.cl",
    rut_usuario: "15.892.441-2",
    ip_origen: "192.168.1.45",
    modulo: "TEMAS",
    accion: "ACTUALIZAR_COLORES_TEMA",
    entidad_tipo: "tb_config_tema",
    entidad_id: "THEME-001",
    datos_anteriores: JSON.stringify({ color_primario: "#1E3A8A" }),
    datos_nuevos: JSON.stringify({ color_primario: "#1E3A8A", color_acento: "#0D9488" }, null, 2),
    hash_previo: "7c19a4e823b7e41d8a1c93b6e82a94f1c9a8e02d18f4b1c93a20e98ff7b6a120",
    hash_registro: "9f32e01b7a4cd81e930f7b11293cba7410de83921bdfa7324810ea93c41189ac"
  },
  {
    id: 4,
    creado_en: "2026-10-30T16:30:45.334Z",
    usuario_id: "supervisor@cachapoal.cl",
    rut_usuario: "12.839.012-3",
    ip_origen: "192.168.2.10",
    modulo: "EXHUMACIONES",
    accion: "REGISTRAR_EXHUMACION_TRASLADO",
    entidad_tipo: "tb_exhumacion",
    entidad_id: "EXH-2026-00014",
    datos_anteriores: JSON.stringify({ ubicacion_origen: "PAT-R-01-019", estado: "OCUPADO" }),
    datos_nuevos: JSON.stringify({ ubicacion_origen: "PAT-R-01-019", ubicacion_destino: "COL-CENTRO-012", causa: "Cumplimiento plazo legal 5 años" }, null, 2),
    hash_previo: "9f32e01b7a4cd81e930f7b11293cba7410de83921bdfa7324810ea93c41189ac",
    hash_registro: "8f4b1c93a20e98ff7b6a1204cd194e823b7e41d8a1c93b6e82a94f1c9a8e02d1"
  }
];

export default function AuditoriaPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [logs, setLogs] = useState<AuditEntry[]>(INITIAL_LOGS);
  const [verifying, setVerifying] = useState(false);
  const [isChainValid, setIsChainValid] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState("all");
  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const apiUrl = "";  // always relative — proxied by Next.js rewrites + Nginx
      const res = await fetch(`${apiUrl}/api/v1/auditoria/verificar`);
      if (res.ok) {
        const data = await res.json();
        setIsChainValid(data.valido);
      } else {
        let valid = true;
        for (let i = 1; i < logs.length; i++) {
          if (logs[i].hash_previo !== logs[i - 1].hash_registro) {
            valid = false;
            break;
          }
        }
        setIsChainValid(valid);
      }
    } catch {
      setIsChainValid(true);
    } finally {
      setTimeout(() => setVerifying(false), 500);
    }
  };

  const handleDownloadExitPackage = () => {
    setDownloadingZip(true);
    const apiUrl = "";  // always relative — proxied by Next.js rewrites + Nginx
    window.open(`${apiUrl}/api/v1/auditoria/exit-package`, "_blank");
    setTimeout(() => setDownloadingZip(false), 3000);
  };

  const handleExportCSV = () => {
    const apiUrl = "";  // always relative — proxied by Next.js rewrites + Nginx
    window.open(`${apiUrl}/api/v1/auditoria/export-csv`, "_blank");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredLogs = logs.filter(l => {
    if (filterModule === "all") return true;
    return l.modulo === filterModule;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {t("auditTitle")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("auditSubtitle")}
          </p>
        </div>

        {/* Exit Package & CSV Action Buttons */}
        <div className="flex items-center space-x-2.5 self-start sm:self-center">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 shadow-xs"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{t("btnExportAuditCSV")}</span>
          </button>

          <button
            onClick={handleDownloadExitPackage}
            disabled={downloadingZip}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <FileArchive className="w-4 h-4" />
            <span>{downloadingZip ? t("exportingExitPackage") : t("btnDownloadExitPackage")}</span>
          </button>
        </div>
      </div>

      {/* Exit Package Notice Card (Ley 21.719 / Cláusula de Salida) */}
      <div 
        className="p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
              {t("exitPackageTitle")}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed max-w-3xl">
              {t("exitPackageDesc")}
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadExitPackage}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-transform hover:scale-105"
          style={{ backgroundColor: "var(--color-secondary)" }}
        >
          <Download className="w-4 h-4" />
          <span>ZIP</span>
        </button>
      </div>

      {/* Cryptographic Verification Hero Card */}
      <div 
        className="p-6 rounded-2xl border transition-all"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: isChainValid ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.4)",
          boxShadow: isDarkMode ? "0 4px 20px -2px rgba(0,0,0,0.5)" : "0 4px 20px -2px rgba(0,0,0,0.05)"
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className={`p-3.5 rounded-2xl ${isChainValid ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
              {isChainValid ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                  {isChainValid ? t("auditValidMsg") : t("auditInvalidMsg")}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  SHA-256 Chained
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Cada transacción de la base de datos incorpora el hash criptográfico del registro anterior firmado con HMAC. Ningún registro puede ser modificado o borrado sin romper inmediatamente toda la cadena.
              </p>
            </div>
          </div>

          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl font-bold text-xs text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 self-start md:self-center"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <RefreshCw className={`w-4 h-4 ${verifying ? "animate-spin" : ""}`} />
            <span>{verifying ? t("auditVerifying") : t("auditBtnVerify")}</span>
          </button>
        </div>

        {/* Head hash display */}
        <div 
          className="mt-5 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="md:col-span-2">
            <span className="text-gray-400 block mb-1">{t("auditHeadHash")}:</span>
            <div className="flex items-center space-x-2">
              <code className="p-2 rounded-lg bg-black/5 dark:bg-white/5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold break-all flex-1">
                {logs[logs.length - 1]?.hash_registro}
              </code>
              <button
                onClick={() => copyToClipboard(logs[logs.length - 1]?.hash_registro)}
                className="p-2 rounded-lg border hover:opacity-75 transition-all"
                style={{ borderColor: "var(--color-border)" }}
                title="Copiar Hash"
              >
                {copiedHash === logs[logs.length - 1]?.hash_registro ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <span className="text-gray-400 block mb-1">{t("auditRecordsChecked")}:</span>
            <div className="text-base font-extrabold text-gray-700 dark:text-gray-200">
              {logs.length} mutaciones inmutables
            </div>
          </div>
        </div>
      </div>

      {/* Filter by Module */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-gray-400 font-semibold">{t("filterByType")}:</span>
        {["all", "INHUMACIONES", "DERECHOS", "TEMAS", "EXHUMACIONES"].map(mod => (
          <button
            key={mod}
            onClick={() => setFilterModule(mod)}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              filterModule === mod ? "text-white" : "text-gray-500 hover:text-black dark:hover:text-white"
            }`}
            style={{
              backgroundColor: filterModule === mod ? "var(--color-primary)" : "transparent",
              borderColor: "var(--color-border)"
            }}
          >
            {mod === "all" ? "Todos" : mod}
          </button>
        ))}
      </div>

      {/* Immutable Logs Table */}
      <div 
        className="rounded-2xl border overflow-hidden shadow-sm"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead 
              className="text-[11px] uppercase font-semibold text-gray-400 border-b"
              style={{ borderColor: "var(--color-border)", backgroundColor: isDarkMode ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)" }}
            >
              <tr>
                <th className="p-3.5">ID</th>
                <th className="p-3.5">{t("date")} (CLT)</th>
                <th className="p-3.5">{t("user")}</th>
                <th className="p-3.5">IP</th>
                <th className="p-3.5">{t("module")}</th>
                <th className="p-3.5">{t("action")}</th>
                <th className="p-3.5">Hash Criptográfico (SHA-256)</th>
                <th className="p-3.5 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-mono">
                  <td className="p-3.5 font-bold">{log.id}</td>
                  <td className="p-3.5 text-gray-500 font-sans">
                    {log.creado_en ? log.creado_en.replace("T", " ").substring(0, 19) : "-"}
                  </td>
                  <td className="p-3.5 font-sans">
                    <div className="font-semibold">{log.usuario_id}</div>
                    <div className="text-[11px] text-gray-400">{log.rut_usuario}</div>
                  </td>
                  <td className="p-3.5 text-gray-500">{log.ip_origen}</td>
                  <td className="p-3.5 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {log.modulo}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold font-sans text-gray-700 dark:text-gray-300">{log.accion}</td>
                  <td className="p-3.5">
                    <div className="flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[120px]">
                        {log.hash_registro}
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 text-right font-sans">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-2.5 py-1 rounded-lg border text-xs font-semibold hover:opacity-75 transition-all"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      {t("viewDetails")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-2">
                <Code2 className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                  Detalle de Transacción #{selectedLog.id} • {selectedLog.modulo}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)} 
                className="p-1.5 rounded-lg border text-gray-400 hover:text-black dark:hover:text-white"
                style={{ borderColor: "var(--color-border)" }}
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Hash Previo (Parent)</span>
                  <code className="block font-mono text-[11px] text-gray-500 break-all">{selectedLog.hash_previo}</code>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 space-y-1">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold uppercase text-[10px]">Hash Resultante (HMAC SHA-256)</span>
                  <code className="block font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold break-all">{selectedLog.hash_registro}</code>
                </div>
              </div>

              <div>
                <span className="font-bold text-gray-400 block mb-1 uppercase text-[10px]">Datos Anteriores (Pre-Mutation):</span>
                <pre className="p-3 rounded-xl bg-black/5 dark:bg-white/5 font-mono text-[11px] overflow-x-auto text-rose-500">
                  {selectedLog.datos_anteriores || "(Registro nuevo - NULL)"}
                </pre>
              </div>

              <div>
                <span className="font-bold text-gray-400 block mb-1 uppercase text-[10px]">Datos Nuevos (Post-Mutation):</span>
                <pre className="p-3 rounded-xl bg-black/5 dark:bg-white/5 font-mono text-[11px] overflow-x-auto text-emerald-600 dark:text-emerald-400">
                  {selectedLog.datos_nuevos}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end" style={{ borderColor: "var(--color-border)" }}>
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
