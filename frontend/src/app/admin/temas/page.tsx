"use client";

import React, { useState } from "react";
import { 
  Palette, 
  Plus, 
  Check, 
  Save, 
  RotateCcw, 
  Sun, 
  Moon, 
  Sparkles, 
  CheckCircle2, 
  Building2,
  Trash2,
  Layers,
  ArrowRight
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme, ThemeConfig } from "@/context/ThemeContext";

export default function AdminTemasPage() {
  const { t } = useLanguage();
  const { 
    currentTheme, 
    availableThemes, 
    setTheme, 
    updateThemeColors, 
    addNewTheme,
    toggleDayNight,
    isDarkMode 
  } = useTheme();

  // Local state for color editing of current theme
  const [editingColors, setEditingColors] = useState({
    color_primario: currentTheme.color_primario,
    color_secundario: currentTheme.color_secundario,
    color_acento: currentTheme.color_acento,
    color_fondo: currentTheme.color_fondo,
    color_superficie: currentTheme.color_superficie,
    color_texto: currentTheme.color_texto,
    color_borde: currentTheme.color_borde,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showNewThemeModal, setShowNewThemeModal] = useState(false);

  // New Theme Form
  const [newNombre, setNewNombre] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newIsDark, setNewIsDark] = useState(false);
  const [newPrimary, setNewPrimary] = useState("#2563EB");
  const [newSecondary, setNewSecondary] = useState("#3B82F6");
  const [newAccent, setNewAccent] = useState("#10B981");
  const [newBg, setNewBg] = useState("#F8FAFC");
  const [newSurface, setNewSurface] = useState("#FFFFFF");
  const [newText, setNewText] = useState("#0F172A");
  const [newBorder, setNewBorder] = useState("#E2E8F0");

  const handleColorChange = (key: keyof typeof editingColors, value: string) => {
    const updated = { ...editingColors, [key]: value };
    setEditingColors(updated);
    updateThemeColors(updated);
  };

  const handleSaveToBackend = async () => {
    setSavedSuccess(true);
    try {
      await fetch("http://localhost:8001/api/v1/temas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: currentTheme.nombre,
          slug: currentTheme.slug,
          es_modo_oscuro: currentTheme.es_modo_oscuro,
          ...editingColors
        })
      });
    } catch {
      // LocalStorage already handled in ThemeContext
    }
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCreateNewTheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim() || !newSlug.trim()) return;

    const createdTheme: ThemeConfig = {
      nombre: newNombre.trim(),
      slug: newSlug.trim().toLowerCase().replace(/\s+/g, "-"),
      es_modo_oscuro: newIsDark,
      color_primario: newPrimary,
      color_secundario: newSecondary,
      color_acento: newAccent,
      color_fondo: newBg,
      color_superficie: newSurface,
      color_texto: newText,
      color_borde: newBorder,
      descripcion: `Tema personalizado creado por el Administrador`
    };

    addNewTheme(createdTheme);
    setEditingColors({
      color_primario: createdTheme.color_primario,
      color_secundario: createdTheme.color_secundario,
      color_acento: createdTheme.color_acento,
      color_fondo: createdTheme.color_fondo,
      color_superficie: createdTheme.color_superficie,
      color_texto: createdTheme.color_texto,
      color_borde: createdTheme.color_borde,
    });

    setShowNewThemeModal(false);
    // Reset form
    setNewNombre("");
    setNewSlug("");
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {t("navAdminTemas")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("themeAdminDescription")}
          </p>
        </div>

        <button
          onClick={() => setShowNewThemeModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all hover:opacity-90 active:scale-95 self-start sm:self-center"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <Plus className="w-4 h-4" />
          <span>{t("btnAddNewTheme")}</span>
        </button>
      </div>

      {/* Theme Presets Gallery */}
      <div className="space-y-3">
        <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
          Temas Disponibles en el Sistema
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableThemes.map((theme) => {
            const isActive = currentTheme.slug === theme.slug;
            return (
              <div
                key={theme.slug}
                onClick={() => {
                  setTheme(theme.slug);
                  setEditingColors({
                    color_primario: theme.color_primario,
                    color_secundario: theme.color_secundario,
                    color_acento: theme.color_acento,
                    color_fondo: theme.color_fondo,
                    color_superficie: theme.color_superficie,
                    color_texto: theme.color_texto,
                    color_borde: theme.color_borde,
                  });
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  isActive ? "ring-2 ring-blue-500 shadow-lg scale-102" : "hover:shadow-md hover:-translate-y-0.5"
                }`}
                style={{
                  backgroundColor: theme.color_superficie,
                  borderColor: isActive ? theme.color_primario : theme.color_borde,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm" style={{ color: theme.color_texto }}>
                    {theme.nombre}
                  </span>
                  {isActive && (
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white"
                      style={{ backgroundColor: theme.color_primario }}
                    >
                      {t("themeActive")}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                  {theme.descripcion || "Tema personalizado"}
                </p>

                {/* Color preview stripes */}
                <div className="flex items-center space-x-1.5 h-4 rounded-lg overflow-hidden border" style={{ borderColor: theme.color_borde }}>
                  <div className="flex-1 h-full" style={{ backgroundColor: theme.color_primario }} title="Primario" />
                  <div className="flex-1 h-full" style={{ backgroundColor: theme.color_secundario }} title="Secundario" />
                  <div className="flex-1 h-full" style={{ backgroundColor: theme.color_acento }} title="Acento" />
                  <div className="flex-1 h-full" style={{ backgroundColor: theme.color_fondo }} title="Fondo" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Color Editor & Component Preview Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Color Palette Editor */}
        <div 
          className="p-6 rounded-2xl border space-y-5 shadow-sm"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                Editor de Paleta: {currentTheme.nombre}
              </h3>
              <p className="text-xs text-gray-500">
                Ajuste los colores en tiempo real. Los cambios se reflejan inmediatamente en toda la plataforma.
              </p>
            </div>
            <button
              onClick={handleSaveToBackend}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90"
              style={{ backgroundColor: savedSuccess ? "#10B981" : "var(--color-primary)" }}
            >
              <Save className="w-4 h-4" />
              <span>{savedSuccess ? "¡Guardado!" : t("btnSaveTheme")}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Primary Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span>{t("themePrimaryColor")}</span>
                <span className="font-mono text-[11px] text-gray-400">{editingColors.color_primario}</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={editingColors.color_primario}
                  onChange={(e) => handleColorChange("color_primario", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={editingColors.color_primario}
                  onChange={(e) => handleColorChange("color_primario", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                  style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span>{t("themeSecondaryColor")}</span>
                <span className="font-mono text-[11px] text-gray-400">{editingColors.color_secundario}</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={editingColors.color_secundario}
                  onChange={(e) => handleColorChange("color_secundario", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={editingColors.color_secundario}
                  onChange={(e) => handleColorChange("color_secundario", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                  style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                />
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span>{t("themeAccentColor")}</span>
                <span className="font-mono text-[11px] text-gray-400">{editingColors.color_acento}</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={editingColors.color_acento}
                  onChange={(e) => handleColorChange("color_acento", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={editingColors.color_acento}
                  onChange={(e) => handleColorChange("color_acento", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                  style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                />
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span>{t("themeBgColor")}</span>
                <span className="font-mono text-[11px] text-gray-400">{editingColors.color_fondo}</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={editingColors.color_fondo}
                  onChange={(e) => handleColorChange("color_fondo", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={editingColors.color_fondo}
                  onChange={(e) => handleColorChange("color_fondo", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                  style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                />
              </div>
            </div>

            {/* Surface Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span>{t("themeSurfaceColor")}</span>
                <span className="font-mono text-[11px] text-gray-400">{editingColors.color_superficie}</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={editingColors.color_superficie}
                  onChange={(e) => handleColorChange("color_superficie", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={editingColors.color_superficie}
                  onChange={(e) => handleColorChange("color_superficie", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                  style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                />
              </div>
            </div>

            {/* Text Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span>{t("themeTextColor")}</span>
                <span className="font-mono text-[11px] text-gray-400">{editingColors.color_texto}</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={editingColors.color_texto}
                  onChange={(e) => handleColorChange("color_texto", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={editingColors.color_texto}
                  onChange={(e) => handleColorChange("color_texto", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                  style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                />
              </div>
            </div>

            {/* Border Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span>{t("themeBorderColor")}</span>
                <span className="font-mono text-[11px] text-gray-400">{editingColors.color_borde}</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={editingColors.color_borde}
                  onChange={(e) => handleColorChange("color_borde", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={editingColors.color_borde}
                  onChange={(e) => handleColorChange("color_borde", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                  style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Live Component Preview */}
        <div 
          className="p-6 rounded-2xl border space-y-5 shadow-sm"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
            <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
              {t("previewTheme")}
            </h3>
            <p className="text-xs text-gray-500">
              Así se visualizarán los botones, badges, modales y tarjetas con los colores actuales
            </p>
          </div>

          {/* Sample Card */}
          <div 
            className="p-5 rounded-2xl border shadow-md space-y-3"
            style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  SC
                </div>
                <span className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                  Cementerio San Carlos
                </span>
              </div>
              <span 
                className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                Activo
              </span>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text)" }}>
              Ficha de inhumación N° 0891 correspondiente al Pabellón B, Fila 03, Número 142. Registro legal validado según Art. 12 Ley 20.584.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <button 
                className="px-4 py-2 rounded-xl font-bold text-xs text-white shadow-sm hover:opacity-90 transition-all"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {t("themeSampleButton")}
              </button>
              <button 
                className="px-4 py-2 rounded-xl font-bold text-xs text-white shadow-sm hover:opacity-90 transition-all"
                style={{ backgroundColor: "var(--color-secondary)" }}
              >
                {t("themeSampleBadge")}
              </button>
              <button 
                className="px-3.5 py-2 rounded-xl font-semibold text-xs border hover:opacity-80 transition-all"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              >
                {t("themeSampleCard")}
              </button>
            </div>
          </div>

          {/* Metric preview */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-gray-400 block font-semibold">Sepulturas Disponibles</span>
              <span className="text-xl font-extrabold" style={{ color: "var(--color-accent)" }}>3,390</span>
            </div>
            <div className="p-3 rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-gray-400 block font-semibold">Trazabilidad HMAC</span>
              <span className="text-xl font-extrabold" style={{ color: "var(--color-primary)" }}>100% OK</span>
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Crear Nuevo Tema */}
      {showNewThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                  {t("btnAddNewTheme")}
                </h3>
              </div>
              <button onClick={() => setShowNewThemeModal(false)} className="p-1 rounded-lg border text-gray-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewTheme} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-500 mb-1">{t("themeName")} *</label>
                <input
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => {
                    setNewNombre(e.target.value);
                    if (!newSlug) {
                      setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    }
                  }}
                  placeholder="Ej. Municipalidad Dorado Cordillera"
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 mb-1">{t("themeSlug")} *</label>
                <input
                  type="text"
                  required
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="ej. muni-dorado"
                  className="w-full px-3 py-2 rounded-xl border text-sm font-mono outline-none"
                  style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isDarkCheck"
                  checked={newIsDark}
                  onChange={(e) => setNewIsDark(e.target.checked)}
                  className="rounded w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isDarkCheck" className="font-bold cursor-pointer">
                  ¿Es un tema con Modo Noche / Oscuro?
                </label>
              </div>

              {/* Color pickers */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Color Primario</label>
                  <div className="flex items-center space-x-2">
                    <input type="color" value={newPrimary} onChange={(e) => setNewPrimary(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                    <input type="text" value={newPrimary} onChange={(e) => setNewPrimary(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border font-mono" />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Color Secundario</label>
                  <div className="flex items-center space-x-2">
                    <input type="color" value={newSecondary} onChange={(e) => setNewSecondary(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                    <input type="text" value={newSecondary} onChange={(e) => setNewSecondary(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border font-mono" />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Color de Acento</label>
                  <div className="flex items-center space-x-2">
                    <input type="color" value={newAccent} onChange={(e) => setNewAccent(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                    <input type="text" value={newAccent} onChange={(e) => setNewAccent(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border font-mono" />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-500 mb-1 block">Color de Fondo</label>
                  <div className="flex items-center space-x-2">
                    <input type="color" value={newBg} onChange={(e) => setNewBg(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                    <input type="text" value={newBg} onChange={(e) => setNewBg(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border font-mono" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button
                  type="button"
                  onClick={() => setShowNewThemeModal(false)}
                  className="px-4 py-2 rounded-xl border font-bold"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white shadow-md"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  Crear y Activar Tema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
