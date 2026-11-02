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

    // Optionally load live burials from backend API
    fetch(`${apiUrl}/api/v1/inhumaciones`)
      .then(res => {
        if (!res.ok) throw new Error("Acceso restringido");
        return res.json();
      })
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item, idx) => ({
            id: item.id || idx + 1,
            folio: item.pase_sepultacion_folio || item.numero_ingreso || `FOL-2026-${String(item.id || idx + 1).padStart(4, "0")}`,
            nombre: item.nombre_fallecido || "PERSONA NO IDENTIFICADA",
            rut: item.rut_fallecido || "NN",
            cementerio: item.ubicacion_codigo?.includes("PAT-R") ? "Cachapoal" : "San Carlos",
            sector: item.ubicacion_codigo?.split("-")[0] || "PAB-A",
            fila: item.ubicacion_codigo?.split("-")[1] || "F-01",
            numero: item.ubicacion_codigo?.split("-")[2] || "001",
            tipo: "Inhumación Oficial",
            fecha_sepultacion: item.fecha_sepultacion || "2026-10-28",
            fecha_defuncion: item.fecha_defuncion || "2026-10-25",
            causa: item.causa_fallecimiento || "Insuficiencia Cardiorrespiratoria",
            ubicacion_codigo: item.ubicacion_codigo
          }));
          setBurials(mapped);
        }
      })
      .catch(() => {
        // Keep default historical sample burials
      });
  }, [apiUrl]);

  const [downloadingFolio, setDownloadingFolio] = useState<string | null>(null);

  const handleDownloadPdf = (burial: any) => {
    const folio = burial.folio || burial.pase_sepultacion_folio || `FOL-2026-${String(burial.id).padStart(4, "0")}`;
    setDownloadingFolio(folio);

    const params = new URLSearchParams({
      fallecido: burial.nombre || "",
      rut: burial.rut || "",
      cementerio: burial.cementerio || "San Carlos",
      ubicacion: burial.sector ? `${burial.sector}-${burial.fila}-${burial.numero}` : (burial.ubicacion_codigo || "N/A"),
      tipo: "INHUMACION"
    });

    const downloadUrl = `${apiUrl}/api/v1/certificados/descargar/${encodeURIComponent(folio)}?${params.toString()}`;
    window.open(downloadUrl, "_blank");

    setTimeout(() => {
      setDownloadingFolio(null);
    }, 1500);
  };

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

  // Initial list of burials (Sourced strictly from Anexo 1_Muestra_Enmascarada_Base_Cementerio..xlsx)
  const [burials, setBurials] = useState([
    {
      id: 1,
      folio: "ING-2",
      nombre: "NN (PERSONA NO IDENTIFICADA)",
      rut: "S/RUT",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "2",
      tipo: "PAB",
      fecha_sepultacion: "1990-06-25",
      fecha_defuncion: "1990-06-25",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 2,
      folio: "ING-18",
      nombre: "JORGE MORALES",
      rut: "S/RUT",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "18",
      tipo: "PAB",
      fecha_sepultacion: "1989-05-23",
      fecha_defuncion: "1989-05-23",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 3,
      folio: "ING-12182",
      nombre: "PATRICIA HERNANDEZ FUENTES",
      rut: "S/RUT",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "12182",
      tipo: "PAB",
      fecha_sepultacion: "2000-01-01",
      fecha_defuncion: "2000-01-01",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 4,
      folio: "ING-61806",
      nombre: "OLGA SEPULVEDA CASTILLO",
      rut: "0",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "178544",
      tipo: "PAB",
      fecha_sepultacion: "1978-08-21",
      fecha_defuncion: "1978-08-21",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 5,
      folio: "ING-112260",
      nombre: "VICTOR TORRES VALENZUELA",
      rut: "S/RUT",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "112260",
      tipo: "PAB",
      fecha_sepultacion: "1999-12-21",
      fecha_defuncion: "1999-12-21",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 6,
      folio: "ING-134811",
      nombre: "OSCAR ARAYA REYES",
      rut: "S/RUT",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "196",
      tipo: "PAB",
      fecha_sepultacion: "2001-07-24",
      fecha_defuncion: "2001-07-24",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 7,
      folio: "ING-226991",
      nombre: "OLGA RODRIGUEZ CONTRERAS",
      rut: "S/RUT",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "51788",
      tipo: "PAB",
      fecha_sepultacion: "1990-12-26",
      fecha_defuncion: "1990-12-26",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 8,
      folio: "ING-257469",
      nombre: "SERGIO VALENZUELA FUENTES",
      rut: "S/RUT",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "257469",
      tipo: "PAB",
      fecha_sepultacion: "2000-01-01",
      fecha_defuncion: "2000-01-01",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 9,
      folio: "ING-266191",
      nombre: "OLGA ROJAS RODRIGUEZ",
      rut: "S/RUT",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "266191",
      tipo: "PAB",
      fecha_sepultacion: "1991-09-02",
      fecha_defuncion: "1991-09-02",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 10,
      folio: "ING-278492",
      nombre: "LUCIA MARTINEZ GUTIERREZ",
      rut: "S/RUT",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "278492",
      tipo: "PAB",
      fecha_sepultacion: "1992-01-13",
      fecha_defuncion: "1992-01-13",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 11,
      folio: "ING-411893",
      nombre: "VICTOR VALENZUELA FLORES",
      rut: "S/RUT",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "16980",
      tipo: "PAB",
      fecha_sepultacion: "1993-03-02",
      fecha_defuncion: "1993-03-02",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 12,
      folio: "ING-2668610",
      nombre: "PEDRO ARAYA SEPULVEDA",
      rut: "12169592-K",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "2668610",
      tipo: "PAB",
      fecha_sepultacion: "2010-07-21",
      fecha_defuncion: "2010-07-21",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 13,
      folio: "ING-2909311",
      nombre: "MANUEL CASTRO MORALES",
      rut: "17610009-5",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "2909311",
      tipo: "PAB",
      fecha_sepultacion: "2011-10-10",
      fecha_defuncion: "2011-10-10",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 14,
      folio: "ING-2978411",
      nombre: "PEDRO MORALES SOTO",
      rut: "21926942-0",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "2978412",
      tipo: "PAB",
      fecha_sepultacion: "2011-05-05",
      fecha_defuncion: "2011-05-05",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 15,
      folio: "ING-4347615",
      nombre: "MANUEL FUENTES GONZALEZ",
      rut: "13920272-9",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "563782022",
      tipo: "PAB",
      fecha_sepultacion: "2015-09-18",
      fecha_defuncion: "2015-09-18",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 16,
      folio: "ING-4382915",
      nombre: "OSCAR ALVAREZ SEPULVEDA",
      rut: "4496039-7",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "4382915",
      tipo: "PAB",
      fecha_sepultacion: "2016-03-18",
      fecha_defuncion: "2016-03-18",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 17,
      folio: "ING-4729117",
      nombre: "VICTOR TAPIA ESPINOZA",
      rut: "6003929-1",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "22585",
      tipo: "PAB",
      fecha_sepultacion: "2017-04-07",
      fecha_defuncion: "2017-04-07",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 18,
      folio: "ING-5065718",
      nombre: "LUCIA RODRIGUEZ ARAYA",
      rut: "18464014-7",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "5065718",
      tipo: "PAB",
      fecha_sepultacion: "2018-02-25",
      fecha_defuncion: "2018-02-25",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 19,
      folio: "ING-623302025",
      nombre: "PATRICIA CASTILLO ROJAS",
      rut: "21371451-1",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "5086818",
      tipo: "PAB",
      fecha_sepultacion: "2025-09-30",
      fecha_defuncion: "2025-09-30",
      causa: "Causa Natural / Certificada"
    },
    {
      id: 20,
      folio: "ING-627712025",
      nombre: "RAMON PIZARRO SOTO",
      rut: "21793309-9",
      cementerio: "San Carlos",
      sector: "MIG",
      fila: "0",
      numero: "89419",
      tipo: "PAB",
      fecha_sepultacion: "2025-05-19",
      fecha_defuncion: "2025-05-19",
      causa: "Causa Natural / Certificada"
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
                        onClick={() => handleDownloadPdf(b)}
                        disabled={downloadingFolio === (b.folio || `FOL-2026-${String(b.id).padStart(4, "0")}`)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer shadow-xs active:scale-95"
                        style={{ 
                          borderColor: "var(--color-border)",
                          backgroundColor: downloadingFolio === (b.folio || `FOL-2026-${String(b.id).padStart(4, "0")}`) ? "var(--color-primary)" : "transparent",
                          color: downloadingFolio === (b.folio || `FOL-2026-${String(b.id).padStart(4, "0")}`) ? "#FFFFFF" : "var(--color-text)"
                        }}
                        title="Ver / Descargar Permiso Oficial de Sepultación (PDF)"
                      >
                        <FileText className={`w-3.5 h-3.5 ${downloadingFolio === b.folio ? "animate-spin text-white" : "text-rose-500"}`} />
                        <span>{downloadingFolio === b.folio ? "Generando..." : "PDF"}</span>
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
