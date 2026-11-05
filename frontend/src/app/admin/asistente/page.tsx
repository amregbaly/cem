"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Key,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Loader2,
  RefreshCw,
  Cpu,
  Sliders,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import {
  getAsistenteConfig,
  updateAsistenteConfig,
  AsistenteConfig,
} from "@/lib/asistente-api";

// ── Provider / Model catalogue ────────────────────────────────────────────────
const PROVIDERS = [
  { value: "gemini", label: "Google Gemini", color: "#4285F4" },
  { value: "openai", label: "OpenAI", color: "#10a37f" },
  { value: "openrouter", label: "OpenRouter", color: "#8b5cf6" },
  { value: "anthropic", label: "Anthropic Claude", color: "#d97706" },
];

const MODEL_SUGGESTIONS: Record<string, string[]> = {
  gemini: [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
  ],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  openrouter: [
    "openai/gpt-4o-mini",
    "anthropic/claude-3-haiku",
    "google/gemini-flash-1.5",
    "meta-llama/llama-3.1-8b-instruct:free",
  ],
  anthropic: [
    "claude-3-haiku-20240307",
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet-20241022",
  ],
};

export default function AdminAsistentePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [habilitado, setHabilitado] = useState(false);
  const [proveedor, setProveedor] = useState("gemini");
  const [modelo, setModelo] = useState("gemini-3.8-flash");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [maxTokens, setMaxTokens] = useState(512);
  const [temperaturaX10, setTemperaturaX10] = useState(7);
  const [modelDropdown, setModelDropdown] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("cem_auth_token");
      if (!token) {
        throw new Error("No has iniciado sesión como Administrador. Por favor ingresa a /admin.");
      }
      const cfg: AsistenteConfig = await getAsistenteConfig(token);
      setHabilitado(cfg.habilitado);
      setProveedor(cfg.proveedor || "gemini");
      setModelo(cfg.modelo || "gemini-3.8-flash");
      setApiKeyMasked(cfg.api_key_masked);
      setMaxTokens(cfg.max_tokens);
      setTemperaturaX10(cfg.temperatura_x10);
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("Could not validate credentials") || msg.includes("401") || msg.includes("No autenticado")) {
        setError("Tu sesión en el sistema ha expirado o no estás autenticado como Administrador. Por favor inicia sesión en /admin.");
      } else {
        setError(msg || "Error al cargar configuración");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const token = localStorage.getItem("cem_auth_token");
      if (!token) {
        throw new Error("No has iniciado sesión como Administrador. Por favor ingresa a /admin.");
      }
      const cfg = await updateAsistenteConfig(token, {
        habilitado,
        proveedor,
        modelo,
        api_key: apiKey || null,
        max_tokens: maxTokens,
        temperatura_x10: temperaturaX10,
      });
      setApiKeyMasked(cfg.api_key_masked);
      setApiKey(""); // clear plaintext immediately
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (e: any) {
      try {
        const parsed = JSON.parse(e.message.replace(/^Error \d+: /, ""));
        if (parsed.detail === "Could not validate credentials" || e.message.includes("401")) {
          setError("Tu sesión en el sistema ha expirado o no estás autenticado como Administrador. Por favor inicia sesión en /admin.");
        } else {
          setError(parsed.detail || e.message);
        }
      } catch {
        if (e.message?.includes("Could not validate credentials") || e.message?.includes("401")) {
          setError("Tu sesión en el sistema ha expirado o no estás autenticado como Administrador. Por favor inicia sesión en /admin.");
        } else {
          setError(e.message);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const providerColor =
    PROVIDERS.find((p) => p.value === proveedor)?.color || "#6366f1";
  const suggestions = MODEL_SUGGESTIONS[proveedor] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2
          className="animate-spin"
          style={{ color: "var(--color-primary)" }}
          size={36}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="p-2.5 rounded-xl"
          style={{ background: "var(--color-primary)20" }}
        >
          <Bot size={24} style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--color-text)" }}
          >
            Asistente de IA
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text)90" }}>
            Configuración del módulo opcional de asistente inteligente
          </p>
        </div>
      </div>

      {/* Privacy notice */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl border text-sm"
        style={{
          background: "var(--color-primary)08",
          borderColor: "var(--color-primary)30",
          color: "var(--color-text)",
        }}
      >
        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0"
          style={{ color: "var(--color-primary)" }}
        />
        <div>
          <p className="font-semibold mb-1">Privacidad y seguridad (Ley 21.719)</p>
          <p style={{ color: "var(--color-text)90" }}>
            La clave API se cifra con AES-256-GCM y nunca se almacena en texto
            plano. El asistente solo accede a datos con campos permitidos — sin
            RUT, causas de fallecimiento ni datos de contacto.
          </p>
        </div>
      </div>

      {/* Enable toggle */}
      <div
        className="p-5 rounded-xl border"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              Estado del módulo
            </p>
            <p className="text-sm mt-0.5" style={{ color: "var(--color-text)80" }}>
              {habilitado
                ? "El asistente está activo para todos los funcionarios."
                : "El asistente está desactivado. Los funcionarios no lo verán."}
            </p>
          </div>
          <button
            onClick={() => setHabilitado(!habilitado)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all"
            style={{
              background: habilitado
                ? "var(--color-primary)20"
                : "var(--color-border)",
              color: habilitado
                ? "var(--color-primary)"
                : "var(--color-text)70",
            }}
          >
            {habilitado ? (
              <ToggleRight size={22} />
            ) : (
              <ToggleLeft size={22} />
            )}
            {habilitado ? "Habilitado" : "Deshabilitado"}
          </button>
        </div>
      </div>

      {/* Provider & Model */}
      <div
        className="p-5 rounded-xl border space-y-5"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Cpu size={16} style={{ color: "var(--color-primary)" }} />
          <span
            className="font-semibold text-sm"
            style={{ color: "var(--color-text)" }}
          >
            Proveedor e Modelo
          </span>
        </div>

        {/* Provider selector */}
        <div>
          <label
            className="text-xs font-medium mb-2 block"
            style={{ color: "var(--color-text)80" }}
          >
            Proveedor
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setProveedor(p.value);
                  const suggestions = MODEL_SUGGESTIONS[p.value];
                  if (suggestions?.length) setModelo(suggestions[0]);
                }}
                className="px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-all"
                style={{
                  borderColor:
                    proveedor === p.value ? p.color : "var(--color-border)",
                  background:
                    proveedor === p.value
                      ? `${p.color}15`
                      : "var(--color-background)",
                  color:
                    proveedor === p.value ? p.color : "var(--color-text)80",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model input with suggestions */}
        <div className="relative">
          <label
            className="text-xs font-medium mb-2 block"
            style={{ color: "var(--color-text)80" }}
          >
            Modelo
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="e.g. gemini-3.8-flash"
              className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--color-background)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
            />
            <button
              onClick={() => setModelDropdown(!modelDropdown)}
              className="px-3 py-2 rounded-lg border text-sm flex items-center gap-1"
              style={{
                background: "var(--color-background)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)80",
              }}
              title="Sugerencias"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          {modelDropdown && suggestions.length > 0 && (
            <div
              className="absolute z-10 left-0 right-10 mt-1 rounded-lg border shadow-lg overflow-hidden"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setModelo(s);
                    setModelDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:opacity-80 transition-opacity border-b last:border-b-0"
                  style={{
                    color: "var(--color-text)",
                    borderColor: "var(--color-border)",
                    background:
                      modelo === s
                        ? "var(--color-primary)15"
                        : "transparent",
                  }}
                >
                  {s}
                  {modelo === s && (
                    <CheckCircle2
                      size={13}
                      className="inline ml-2"
                      style={{ color: "var(--color-primary)" }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Quick select badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span
              className="text-[11px] font-medium mr-0.5"
              style={{ color: "var(--color-text)70" }}
            >
              Sugeridos:
            </span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setModelo(s)}
                className="text-xs px-2.5 py-1 rounded-full border transition-all hover:scale-102 active:scale-98"
                style={{
                  borderColor:
                    modelo === s ? "var(--color-primary)" : "var(--color-border)",
                  background:
                    modelo === s
                      ? "var(--color-primary)20"
                      : "var(--color-background)",
                  color:
                    modelo === s
                      ? "var(--color-primary)"
                      : "var(--color-text)80",
                  fontWeight: modelo === s ? "600" : "400",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* API Key */}
      <div
        className="p-5 rounded-xl border space-y-4"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Key size={16} style={{ color: "var(--color-primary)" }} />
          <span
            className="font-semibold text-sm"
            style={{ color: "var(--color-text)" }}
          >
            Clave API
          </span>
        </div>

        {apiKeyMasked && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono"
            style={{
              background: "var(--color-background)",
              color: "var(--color-text)80",
            }}
          >
            <ShieldCheck size={14} style={{ color: "#22c55e" }} />
            <span>Clave almacenada: {apiKeyMasked}</span>
          </div>
        )}

        <div>
          <label
            className="text-xs font-medium mb-2 block"
            style={{ color: "var(--color-text)80" }}
          >
            {apiKeyMasked
              ? "Nueva clave API (dejar vacío para mantener la actual)"
              : "Clave API"}
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                apiKeyMasked
                  ? "Ingresar nueva clave para reemplazar..."
                  : "AQ-... o AIza... o sk-..."
              }
              autoComplete="off"
              className="w-full px-3 py-2 pr-10 rounded-lg border text-sm font-mono focus:outline-none"
              style={{
                background: "var(--color-background)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
              style={{ color: "var(--color-text)" }}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p
            className="text-xs mt-1.5"
            style={{ color: "var(--color-text)60" }}
          >
            La clave se cifra con AES-256-GCM al guardar. Nunca se muestra en
            texto plano.
          </p>
        </div>
      </div>

      {/* Advanced settings */}
      <div
        className="p-5 rounded-xl border space-y-5"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Sliders size={16} style={{ color: "var(--color-primary)" }} />
          <span
            className="font-semibold text-sm"
            style={{ color: "var(--color-text)" }}
          >
            Parámetros avanzados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Max tokens */}
          <div>
            <label
              className="text-xs font-medium mb-2 block"
              style={{ color: "var(--color-text)80" }}
            >
              Máx. tokens respuesta:{" "}
              <strong style={{ color: "var(--color-primary)" }}>
                {maxTokens}
              </strong>
            </label>
            <input
              type="range"
              min={64}
              max={2048}
              step={64}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full accent-primary"
              style={{ accentColor: "var(--color-primary)" }}
            />
            <div
              className="flex justify-between text-xs mt-1"
              style={{ color: "var(--color-text)50" }}
            >
              <span>64</span>
              <span>2048</span>
            </div>
          </div>

          {/* Temperature */}
          <div>
            <label
              className="text-xs font-medium mb-2 block"
              style={{ color: "var(--color-text)80" }}
            >
              Temperatura:{" "}
              <strong style={{ color: "var(--color-primary)" }}>
                {(temperaturaX10 / 10).toFixed(1)}
              </strong>
            </label>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={temperaturaX10}
              onChange={(e) => setTemperaturaX10(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--color-primary)" }}
            />
            <div
              className="flex justify-between text-xs mt-1"
              style={{ color: "var(--color-text)50" }}
            >
              <span>0.0 (Preciso)</span>
              <span>2.0 (Creativo)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border text-sm"
          style={{
            background: "#ef444410",
            borderColor: "#ef444440",
            color: "#ef4444",
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          {error.includes("/admin") && (
            <a
              href="/admin"
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto shrink-0 transition-opacity hover:opacity-90"
              style={{
                background: "var(--color-primary)",
                color: "#ffffff",
              }}
            >
              Ir a Iniciar Sesión (/admin)
            </a>
          )}
        </div>
      )}
      {success && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl border text-sm"
          style={{
            background: "#22c55e10",
            borderColor: "#22c55e40",
            color: "#22c55e",
          }}
        >
          <CheckCircle2 size={16} />
          <span>Configuración guardada correctamente.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background: "var(--color-primary)",
            color: "white",
          }}
        >
          {saving ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
        <button
          onClick={loadConfig}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm border transition-all hover:opacity-80"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text)80",
          }}
        >
          <RefreshCw size={14} />
          Recargar
        </button>
      </div>
    </div>
  );
}
