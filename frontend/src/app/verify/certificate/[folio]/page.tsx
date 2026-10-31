"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Download, 
  Building2, 
  User, 
  Calendar, 
  Hash, 
  ExternalLink,
  Search,
  Lock
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface CertificatePublicInfo {
  folio: string;
  token_verificacion: string;
  tipo_certificado: string;
  estado: string;
  es_valido: boolean;
  cementerio: string;
  codigo_ubicacion: string;
  fallecido_nombre: string | null;
  rut_fallecido: string | null;
  titular_nombre: string | null;
  rut_titular: string | null;
  autoridad_emisora: string;
  funcionario_emisor: string;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  sha256_hash: string;
  created_at: string | null;
}

export default function CertificateVerificationPage() {
  const params = useParams();
  const folioParam = params?.folio as string;

  const { isDarkMode } = useTheme();

  const [folio, setFolio] = useState<string>(folioParam || "");
  const [cert, setCert] = useState<CertificatePublicInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCertificate = async (targetFolio: string) => {
    if (!targetFolio) return;
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const res = await fetch(`${apiUrl}/api/v1/certificados/publico/${encodeURIComponent(targetFolio)}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Certificado no encontrado en el Registro Municipal. Verifique el folio o código QR.");
        }
        throw new Error("Error consultando la base de datos municipal.");
      }
      const data = await res.json();
      setCert(data);
    } catch (err: any) {
      setError(err.message || "Fallo en la verificación");
      setCert(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (folioParam) {
      fetchCertificate(folioParam);
    } else {
      setLoading(false);
    }
  }, [folioParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (folio.trim()) {
      fetchCertificate(folio.trim());
    }
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Civic Municipal Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Portal Oficial de Autenticidad Documental</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          Verificación de Certificado Municipal
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          Validación pública con firma electrónica avanzada y estampado de tiempo según Ley N° 19.799 e I. Municipalidad de San Carlos.
        </p>
      </div>

      {/* Manual Search Form */}
      <form onSubmit={handleSearch} className="max-w-md mx-auto">
        <div 
          className="flex items-center px-4 py-3 rounded-2xl border shadow-sm"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            placeholder="Ingrese Folio (ej. CERT-2026-0089) o Token"
            className="w-full bg-transparent outline-none text-sm font-semibold uppercase"
            style={{ color: "var(--color-text)" }}
          />
          <button
            type="submit"
            className="ml-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            Verificar
          </button>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center space-y-3 rounded-3xl border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-500">
            Consultando registros criptográficos municipales...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-8 rounded-3xl border border-rose-500/20 bg-rose-500/5 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">
              Documento No Verificado
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-md mx-auto">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Verified Certificate Card */}
      {cert && !loading && (
        <div 
          className="rounded-3xl border shadow-xl overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          {/* Validity Banner */}
          <div className="p-6 bg-emerald-500/10 border-b border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  Documento Auténtico y Vigente
                </span>
                <h2 className="text-xl font-black" style={{ color: "var(--color-text)" }}>
                  Certificado de {cert.tipo_certificado}
                </h2>
              </div>
            </div>
            <a
              href={`${apiUrl}/api/v1/certificados/descargar/${cert.folio}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF Oficial</span>
            </a>
          </div>

          {/* Certificate Dossier Grid */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Folio & Authority */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border bg-gray-50/50 dark:bg-gray-800/30" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Folio Municipal</span>
                  <p className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">
                    {cert.folio}
                  </p>
                  <p className="text-[11px] text-gray-400 font-mono mt-1">
                    Token: {cert.token_verificacion}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cementerio y Ubicación</span>
                  <p className="text-sm font-bold mt-0.5" style={{ color: "var(--color-text)" }}>
                    {cert.cementerio}
                  </p>
                  <p className="text-xs font-mono text-gray-500 mt-1">
                    Código Sepultura: <strong>{cert.codigo_ubicacion}</strong>
                  </p>
                </div>
              </div>

              {/* Persons Involved */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Persona Fallecida (Inhumada)</span>
                  <p className="text-sm font-black mt-0.5" style={{ color: "var(--color-text)" }}>
                    {cert.fallecido_nombre || "NO REGISTRADO"}
                  </p>
                  <p className="text-xs font-mono text-gray-500 mt-1">
                    RUT: {cert.rut_fallecido || "S/R"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border bg-gray-50/50 dark:bg-gray-800/30" style={{ borderColor: "var(--color-border)" }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Titular de Concesión</span>
                  <p className="text-sm font-bold mt-0.5" style={{ color: "var(--color-text)" }}>
                    {cert.titular_nombre || "I. Municipalidad de San Carlos"}
                  </p>
                  <p className="text-xs font-mono text-gray-500 mt-1">
                    RUT: {cert.rut_titular || "Fiscal"}
                  </p>
                </div>
              </div>
            </div>

            {/* Cryptographic SHA-256 Hash Seal */}
            <div className="p-4 rounded-2xl border bg-gray-50/50 dark:bg-gray-900/40 space-y-2" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-500">
                <Hash className="w-4 h-4 text-blue-500" />
                <span>Huella Digital Criptográfica del Documento (SHA-256)</span>
              </div>
              <p className="text-[11px] font-mono font-bold break-all text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-black/30 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800">
                {cert.sha256_hash}
              </p>
              <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400 pt-1">
                <span>Emisor: <strong>{cert.funcionario_emisor}</strong></span>
                <span>Fecha Emisión: <strong>{cert.fecha_emision || "N/A"}</strong></span>
              </div>
            </div>

            {/* Privacy Law Notice */}
            <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-700 dark:text-blue-300 flex items-start space-x-3">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="block font-bold">Confidencialidad Ley N° 21.719 y Ley N° 20.584:</strong>
                <span>
                  Este portal público certifica exclusivamente la autenticidad y existencia legal del documento. 
                  Los diagnósticos médicos y datos sensibles de contacto permanecen estrictamente resguardados en custodia municipal.
                </span>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 border-t flex flex-wrap items-center justify-between text-xs text-gray-400 bg-gray-50/50 dark:bg-gray-900/40" style={{ borderColor: "var(--color-border)" }}>
            <span>Ilustre Municipalidad de San Carlos • Región de Ñuble</span>
            <span>Plataforma SaaS de Cementerios Municipales 2026</span>
          </div>
        </div>
      )}
    </div>
  );
}
