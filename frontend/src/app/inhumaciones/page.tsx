"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  PlusCircle, 
  Search, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Calendar,
  X,
  Building2,
  AlertCircle,
  Lock,
  FileCheck2,
  ArrowRight
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

// Chilean RUT Modulo 11 check function
function validateRut(fullRut: string): { isValid: boolean; cleanRut: string; dv: string } {
  if (!fullRut) return { isValid: false, cleanRut: "", dv: "" };
  const clean = fullRut.replace(/[.\-\s]/g, "").toUpperCase();
  if (clean.length < 2) return { isValid: false, cleanRut: clean, dv: "" };

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  if (!/^\d+$/.test(body)) return { isValid: false, cleanRut: clean, dv };

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
    cleanRut: `${body}-${dv}`,
    dv: expectedDv
  };
}

export default function InhumacionesPage() {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [portalConfig, setPortalConfig] = useState({
    permitir_lista_fallecidos: false,
    titulo_portal: "Portal Ciudadano de Certificados Municipales",
    mensaje_portal: ""
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [search, setSearch] = useState("");
  const [cemeteryFilter, setCemeteryFilter] = useState<string>("all");
  const [maskCause, setMaskCause] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem("cem_auth_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        setCurrentUser(null);
      }
    }

    fetch(`${apiUrl}/api/v1/portal/config`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.permitir_lista_fallecidos === "boolean") {
          setPortalConfig(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingConfig(false);
      });
  }, [apiUrl]);

  // Form states for new burial
  const [formRut, setFormRut] = useState("");
  const [formNombres, setFormNombres] = useState("");
  const [formPaterno, setFormPaterno] = useState("");
  const [formMaterno, setFormMaterno] = useState("");
  const [formCementerio, setFormCementerio] = useState("San Carlos");
  const [formTipo, setFormTipo] = useState("PAB");
  const [formSector, setFormSector] = useState("PAB-A");
  const [formFila, setFormFila] = useState("F-01");
  const [formNumero, setFormNumero] = useState("101");
  const [formFechaDef, setFormFechaDef] = useState("");
  const [formFechaSep, setFormFechaSep] = useState(new Date().toISOString().split("T")[0]);
  const [formCausa, setFormCausa] = useState("");
  const [formFolio, setFormFolio] = useState("FOL-2026-0901");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const rutValidation = validateRut(formRut);

  // Initial list of burials
  const [burials, setBurials] = useState([
    {
      id: 1,
      folio: "FOL-2026-0891",
      nombre: "MANUEL JESUS MUÑOZ SEPULVEDA",
      rut: "7.842.119-4",
      cementerio: "San Carlos",
      sector: "PAB-B",
      fila: "F-03",
      numero: "142",
      tipo: "Pabellón",
      fecha_sepultacion: "2026-10-28",
      fecha_defuncion: "2026-10-25",
      causa: "Insuficiencia Cardiorrespiratoria Aguda"
    },
    {
      id: 2,
      folio: "FOL-2026-0888",
      nombre: "MARIA DEL CARMEN YAÑEZ VENEGAS",
      rut: "11.239.812-K",
      cementerio: "San Carlos",
      sector: "PAT-01",
      fila: "F-12",
      numero: "088",
      tipo: "Patio Común",
      fecha_sepultacion: "2026-10-26",
      fecha_defuncion: "2026-10-24",
      causa: "Neumonía Severa Multifocal"
    },
    {
      id: 3,
      folio: "FOL-2026-0884",
      nombre: "HECTOR OSVALDO RETAMAL ACUÑA",
      rut: "8.319.445-1",
      cementerio: "Cachapoal",
      sector: "PAT-R",
      fila: "F-01",
      numero: "019",
      tipo: "Patio Rural",
      fecha_sepultacion: "2026-10-22",
      fecha_defuncion: "2026-10-20",
      causa: "Shock Séptico de Foco Pulmonar"
    },
    {
      id: 4,
      folio: "FOL-2026-0879",
      nombre: "ROSA ANGELICA FUENTES BRAVO",
      rut: "13.441.982-3",
      cementerio: "San Carlos",
      sector: "BOV-NORTE",
      fila: "F-05",
      numero: "007",
      tipo: "Bóveda Familiar",
      fecha_sepultacion: "2026-10-18",
      fecha_defuncion: "2026-10-16",
      causa: "Accidente Cerebrovascular Isquémico"
    },
    {
      id: 5,
      folio: "FOL-2026-0870",
      nombre: "JUAN CARLOS DE LA FUENTE SILVA",
      rut: "9.182.744-8",
      cementerio: "Cachapoal",
      sector: "SP4-A",
      fila: "F-02",
      numero: "034",
      tipo: "Sepultura en Altura",
      fecha_sepultacion: "2026-10-15",
      fecha_defuncion: "2026-10-13",
      causa: "Infarto Agudo al Miocardio"
    }
  ]);

  const handleRegisterBurial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rutValidation.isValid && formRut.trim() !== "NN") {
      alert("Por favor ingrese un RUT válido con Módulo 11 o 'NN' para no identificado.");
      return;
    }

    const newBurial = {
      id: burials.length + 1,
      folio: formFolio,
      nombre: `${formNombres} ${formPaterno} ${formMaterno}`.trim().toUpperCase(),
      rut: rutValidation.cleanRut || "NN",
      cementerio: formCementerio,
      sector: formSector,
      fila: formFila,
      numero: formNumero,
      tipo: formTipo === "PAB" ? "Pabellón" : formTipo === "PAT" ? "Patio Común" : formTipo === "BOV" ? "Bóveda" : "Sepultura Altura",
      fecha_sepultacion: formFechaSep,
      fecha_defuncion: formFechaDef || formFechaSep,
      causa: formCausa || "Causa en certificación médica"
    };

    setBurials([newBurial, ...burials]);
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setShowModal(false);
      // Reset form
      setFormRut("");
      setFormNombres("");
      setFormPaterno("");
      setFormMaterno("");
      setFormCausa("");
    }, 1000);
  };

  const filtered = burials.filter(item => {
    const matchesCem = cemeteryFilter === "all" || item.cementerio.toLowerCase() === cemeteryFilter.toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = 
      item.nombre.toLowerCase().includes(q) ||
      item.rut.toLowerCase().includes(q) ||
      item.folio.toLowerCase().includes(q) ||
      `${item.sector} ${item.fila} ${item.numero}`.toLowerCase().includes(q);
    return matchesCem && matchesSearch;
  });

  // If unauthenticated visitor and admin disallowed death list
  if (mounted && !currentUser && !portalConfig.permitir_lista_fallecidos) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {t("navInhumaciones")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Registro Oficial de Sepultaciones de los Cementerios Municipales de San Carlos y Cachapoal
          </p>
        </div>

        <div 
          className="p-8 sm:p-12 rounded-3xl border text-center shadow-lg max-w-3xl mx-auto my-6"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold mb-3">
            <span>MODO RESTRINGIDO POR ADMINISTRACIÓN</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mb-3" style={{ color: "var(--color-text)" }}>
            Lista Nominal de Fallecidos No Disponible para Visitantes
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed mb-8">
            La administración municipal ha configurado el portal público en <strong>Modo Exclusivo de Certificados</strong> en cumplimiento de las normativas de protección de datos personales y sensibles (Ley 21.719). Para validar la autenticidad de un certificado o sepultura ya emitido, ingrese el folio o token en el verificador oficial.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/verify/certificate"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-md transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Verificar Certificado Oficial</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link
              href="/admin"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl border font-bold text-sm transition-all hover:opacity-90"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              <span>Acceso Funcionarios / Administrador</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {t("navInhumaciones")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Registro Oficial de Sepultaciones, Validación RUT Módulo 11 y Gestión de Folios
          </p>
        </div>

        {currentUser ? (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all hover:opacity-90 active:scale-95 self-start sm:self-center"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <PlusCircle className="w-5 h-5" />
            <span>{t("registerBurial")}</span>
          </button>
        ) : (
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-500/20">
            <Eye className="w-4 h-4" />
            <span>Vista Pública Habilitada por Administración</span>
          </div>
        )}
      </div>

      {/* Control Bar: Search, Filters, Privacy Mode */}
      <div 
        className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por fallecido, RUT o folio..."
            className="w-full bg-transparent outline-none text-sm placeholder-gray-400"
            style={{ color: "var(--color-text)" }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Cemetery Selector */}
          <select
            value={cemeteryFilter}
            onChange={(e) => setCemeteryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold bg-transparent outline-none cursor-pointer"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            <option value="all" className="bg-white dark:bg-gray-800">{t("allCemeteries")}</option>
            <option value="San Carlos" className="bg-white dark:bg-gray-800">San Carlos</option>
            <option value="Cachapoal" className="bg-white dark:bg-gray-800">Cachapoal</option>
          </select>

          {/* Privacy Mask Toggle (Staff only) */}
          {currentUser ? (
            <button
              onClick={() => setMaskCause(!maskCause)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:opacity-90"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: maskCause ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)",
                color: maskCause ? "#D97706" : "#059669"
              }}
            >
              {maskCause ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{maskCause ? t("toggleCausePrivacy") : "Causa Visible (Personal)"}</span>
            </button>
          ) : (
            <div 
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                color: "#D97706"
              }}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Causa Reservada (Ley 21.719)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Burials Table */}
      <div 
        className="rounded-2xl border overflow-hidden shadow-sm"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead 
              className="text-xs uppercase font-semibold text-gray-400 border-b"
              style={{ borderColor: "var(--color-border)", backgroundColor: isDarkMode ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)" }}
            >
              <tr>
                <th className="p-3.5 sm:px-4">Folio</th>
                <th className="p-3.5 sm:px-4">{t("deceasedName")}</th>
                <th className="p-3.5 sm:px-4">{t("rut")}</th>
                <th className="p-3.5 sm:px-4">Cementerio</th>
                <th className="p-3.5 sm:px-4">{t("location")}</th>
                <th className="p-3.5 sm:px-4">{t("burialDate")}</th>
                <th className="p-3.5 sm:px-4">{t("causeOfDeath")}</th>
                <th className="p-3.5 sm:px-4 text-right">Permiso</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    {t("noResults")}
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3.5 sm:px-4 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                      {b.folio}
                    </td>
                    <td className="p-3.5 sm:px-4 font-bold" style={{ color: "var(--color-text)" }}>
                      {b.nombre}
                    </td>
                    <td className="p-3.5 sm:px-4 font-mono font-medium text-gray-600 dark:text-gray-300">
                      {b.rut}
                    </td>
                    <td className="p-3.5 sm:px-4">
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: b.cementerio === "San Carlos" ? "var(--color-primary)" : "#059669" }}
                      >
                        {b.cementerio}
                      </span>
                    </td>
                    <td className="p-3.5 sm:px-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="font-semibold text-gray-700 dark:text-gray-200">{b.tipo}</div>
                      <div>Sec. {b.sector} • F- {b.fila} • N° {b.numero}</div>
                    </td>
                    <td className="p-3.5 sm:px-4 text-gray-600 dark:text-gray-300">
                      {b.fecha_sepultacion}
                    </td>
                    <td className="p-3.5 sm:px-4">
                      {maskCause ? (
                        <span className="italic text-gray-400 select-none">
                          [Confidencial Ley 20.584]
                        </span>
                      ) : (
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {b.causa}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 sm:px-4 text-right">
                      <button 
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-medium hover:opacity-75 transition-all"
                        style={{ borderColor: "var(--color-border)" }}
                        title="Ver Permiso de Sepultación (PDF)"
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Inhumación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            {/* Modal Header */}
            <div 
              className="p-5 border-b flex items-center justify-between"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl text-white shadow-sm" style={{ backgroundColor: "var(--color-primary)" }}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: "var(--color-text)" }}>
                    {t("registerBurial")}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Ingreso a los libros matrices de defunción de San Carlos y Cachapoal
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg border hover:opacity-75"
                style={{ borderColor: "var(--color-border)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRegisterBurial} className="p-6 overflow-y-auto space-y-4">
              
              {/* RUT Input with Modulo 11 Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text)" }}>
                  {t("deceasedRUT")} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formRut}
                    onChange={(e) => setFormRut(e.target.value)}
                    placeholder="12345678-K o NN"
                    className="w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm outline-none transition-all"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      borderColor: formRut.length > 3 ? (rutValidation.isValid ? "#10B981" : "#EF4444") : "var(--color-border)",
                      color: "var(--color-text)"
                    }}
                  />
                  {formRut.length > 3 && (
                    <div className="absolute right-3 top-2.5 flex items-center space-x-1 text-xs">
                      {rutValidation.isValid ? (
                        <span className="flex items-center space-x-1 text-emerald-600 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t("rutValid")}</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-rose-500 font-bold">
                          <XCircle className="w-4 h-4" />
                          <span>{t("rutInvalid")} (DV esperada: {rutValidation.dv})</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Names Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{t("names")} *</label>
                  <input
                    type="text"
                    required
                    value={formNombres}
                    onChange={(e) => setFormNombres(e.target.value)}
                    placeholder="Manuel Jesús"
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{t("paternalSurname")} *</label>
                  <input
                    type="text"
                    required
                    value={formPaterno}
                    onChange={(e) => setFormPaterno(e.target.value)}
                    placeholder="Muñoz"
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{t("maternalSurname")}</label>
                  <input
                    type="text"
                    value={formMaterno}
                    onChange={(e) => setFormMaterno(e.target.value)}
                    placeholder="Sepúlveda"
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              {/* Cemetery & Grave Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Cementerio Destino *</label>
                  <select
                    value={formCementerio}
                    onChange={(e) => setFormCementerio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  >
                    <option value="San Carlos">San Carlos</option>
                    <option value="Cachapoal">Cachapoal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{t("locationType")} *</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  >
                    <option value="PAB">Pabellón de Nichos (PAB)</option>
                    <option value="PAT">Patio Común en Tierra (PAT)</option>
                    <option value="BOV">Bóveda Familiar (BOV)</option>
                    <option value="SP4">Sepultura en Altura 4 Capacidad (SP4)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{t("sector")}</label>
                  <input
                    type="text"
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{t("row")}</label>
                  <input
                    type="text"
                    value={formFila}
                    onChange={(e) => setFormFila(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{t("number")}</label>
                  <input
                    type="text"
                    value={formNumero}
                    onChange={(e) => setFormNumero(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              {/* Dates & Cause */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{t("deathDate")}</label>
                  <input
                    type="date"
                    value={formFechaDef}
                    onChange={(e) => setFormFechaDef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">{t("burialDate")} *</label>
                  <input
                    type="date"
                    required
                    value={formFechaSep}
                    onChange={(e) => setFormFechaSep(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{t("causeOfDeath")}</label>
                <input
                  type="text"
                  value={formCausa}
                  onChange={(e) => setFormCausa(e.target.value)}
                  placeholder="Ej. Paro cardiorrespiratorio"
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
                <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block">
                  {t("visitorMaskNotice")}
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold hover:opacity-80"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitSuccess}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-90"
                  style={{ backgroundColor: submitSuccess ? "#10B981" : "var(--color-primary)" }}
                >
                  {submitSuccess ? "¡Inhumación Registrada con Éxito!" : t("save")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
