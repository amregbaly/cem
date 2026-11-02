"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme, ThemeConfig, DEFAULT_THEMES } from "@/context/ThemeContext";
import { 
  X, 
  Check, 
  Plus, 
  Palette, 
  Sparkles, 
  Moon, 
  Sun, 
  RotateCcw,
  Sliders,
  Eye,
  CheckCircle2,
  Box
} from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function ThemeCustomizerModal({ onClose }: Props) {
  const { t } = useLanguage();
  const { 
    currentTheme, 
    availableThemes, 
    borderRadius,
    setTheme, 
    updateThemeColors, 
    setBorderRadius,
    addNewTheme,
    resetToDefaults
  } = useTheme();

  const [activeTab, setActiveTab] = useState<"preset" | "customize" | "new">("preset");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // State for creating a new theme
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeSlug, setNewThemeSlug] = useState("");
  const [newIsDark, setNewIsDark] = useState(false);
  const [newColors, setNewColors] = useState({
    color_primario: currentTheme.color_primario,
    color_secundario: currentTheme.color_secundario,
    color_acento: currentTheme.color_acento,
    color_fondo: currentTheme.color_fondo,
    color_superficie: currentTheme.color_superficie,
    color_texto: currentTheme.color_texto,
    color_borde: currentTheme.color_borde,
  });

  const handleColorChange = (key: keyof typeof newColors, value: string) => {
    updateThemeColors({ [key]: value });
  };

  const handleRadiusChange = (radius: string) => {
    setBorderRadius(radius);
  };

  const handleCreateThemeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeName.trim()) return;
    const slug = newThemeSlug.trim() || newThemeName.toLowerCase().replace(/\s+/g, "-");

    const created: ThemeConfig = {
      nombre: newThemeName.trim(),
      slug: slug,
      es_modo_oscuro: newIsDark,
      es_sistema: false,
      ...newColors,
      descripcion: `Custom user-defined theme`
    };

    addNewTheme(created);
    setSuccessBanner(t("themeSuccessSaved"));
    setActiveTab("preset");
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  const radiusOptions = [
    { label: t("radiusCompact"), value: "0.25rem" },
    { label: t("radiusBalanced"), value: "0.5rem" },
    { label: t("radiusRounded"), value: "0.75rem" },
    { label: t("radiusFull"), value: "1.25rem" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
          color: "var(--color-text)"
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center space-x-2.5">
            <div 
              className="p-2 rounded-xl text-white shadow-sm"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t("themeSettings")}</h3>
              <p className="text-xs opacity-70">
                {t("themeAdminDescription")}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            aria-label={t("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b text-sm font-semibold px-6 gap-2" style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={() => setActiveTab("preset")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === "preset" ? "border-primary opacity-100 font-bold" : "border-transparent opacity-60 hover:opacity-100"
            }`}
            style={{ borderColor: activeTab === "preset" ? "var(--color-primary)" : "transparent" }}
          >
            <Sparkles className="w-4 h-4" />
            <span>{t("themePresetsTab")} ({availableThemes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("customize")}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === "customize" ? "border-primary opacity-100 font-bold" : "border-transparent opacity-60 hover:opacity-100"
            }`}
            style={{ borderColor: activeTab === "customize" ? "var(--color-primary)" : "transparent" }}
          >
            <Sliders className="w-4 h-4" />
            <span>{t("themeCustomizeTab")}</span>
          </button>
          <button
            onClick={() => setActiveTab("new")}
            className={`flex items-center space-x-1.5 py-3 px-4 border-b-2 transition-all ${
              activeTab === "new" ? "border-primary opacity-100 font-bold" : "border-transparent opacity-60 hover:opacity-100"
            }`}
            style={{ borderColor: activeTab === "new" ? "var(--color-primary)" : "transparent" }}
          >
            <Plus className="w-4 h-4" />
            <span>{t("themeNewTab")}</span>
          </button>
        </div>

        {/* Feedback Banner */}
        {successBanner && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{successBanner}</span>
          </div>
        )}

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* TAB 1: PRESET THEMES LIST */}
          {activeTab === "preset" && (
            <div className="space-y-4">
              <p className="text-sm opacity-80">
                {t("themeSelectPrompt")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {availableThemes.map((theme) => {
                  const isSelected = currentTheme.slug === theme.slug;
                  return (
                    <div
                      key={theme.slug}
                      onClick={() => setTheme(theme.slug)}
                      className={`cursor-pointer p-4 rounded-xl border transition-all hover:shadow-lg ${
                        isSelected ? "ring-2 ring-primary ring-offset-2 scale-102" : "hover:border-primary/50 hover:-translate-y-0.5"
                      }`}
                      style={{
                        backgroundColor: theme.color_fondo,
                        borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)",
                        color: theme.color_texto
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm leading-tight">{theme.nombre}</span>
                        {isSelected && (
                          <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                            <Check className="w-3 h-3" />
                            <span>{t("themeActive")}</span>
                          </span>
                        )}
                      </div>

                      {/* Color Palette preview dots */}
                      <div className="flex items-center space-x-1.5 mt-3">
                        <div className="w-5 h-5 rounded-full border shadow-xs" style={{ backgroundColor: theme.color_primario }} title="Primario" />
                        <div className="w-5 h-5 rounded-full border shadow-xs" style={{ backgroundColor: theme.color_secundario }} title="Secundario" />
                        <div className="w-5 h-5 rounded-full border shadow-xs" style={{ backgroundColor: theme.color_acento }} title="Acento" />
                        <div className="w-5 h-5 rounded-full border shadow-xs" style={{ backgroundColor: theme.color_superficie }} title="Superficie" />
                        <span className="text-[11px] opacity-75 font-semibold ml-auto flex items-center gap-1">
                          {theme.es_modo_oscuro ? <Moon className="w-3 h-3 text-indigo-400" /> : <Sun className="w-3 h-3 text-amber-500" />}
                          {theme.es_modo_oscuro ? "Dark" : "Light"}
                        </span>
                      </div>

                      {theme.descripcion && (
                        <p className="text-xs opacity-75 mt-2 line-clamp-2 leading-relaxed">{theme.descripcion}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE COLOR & RADIUS CUSTOMIZATION */}
          {activeTab === "customize" && (
            <div className="space-y-6">
              <div className="p-3.5 rounded-xl border flex items-center justify-between text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <span>{t("themeModifyingActive")} <strong className="font-bold" style={{ color: "var(--color-primary)" }}>{currentTheme.nombre}</strong></span>
                <span className="text-xs px-2.5 py-1 rounded-full text-white font-bold shadow-xs" style={{ backgroundColor: "var(--color-accent)" }}>
                  {t("themeRealTime")}
                </span>
              </div>

              {/* Color Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { key: "color_primario", label: t("themePrimaryColor") },
                  { key: "color_secundario", label: t("themeSecondaryColor") },
                  { key: "color_acento", label: t("themeAccentColor") },
                  { key: "color_fondo", label: t("themeBgColor") },
                  { key: "color_superficie", label: t("themeSurfaceColor") },
                  { key: "color_texto", label: t("themeTextColor") },
                  { key: "color_borde", label: t("themeBorderColor") },
                ].map((item) => {
                  const val = (currentTheme as any)[item.key] || "#000000";
                  return (
                    <div 
                      key={item.key} 
                      className="flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-xs" 
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
                    >
                      <div>
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-xs opacity-60 font-mono mt-0.5">{val}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={val}
                          onChange={(e) => handleColorChange(item.key as any, e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer border border-transparent bg-transparent shadow-xs transition-transform hover:scale-105"
                          title={`Click to pick ${item.label}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Border Radius Customizer */}
              <div className="p-4 rounded-xl border space-y-2.5" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Box className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                    <span className="text-xs font-bold">{t("themeBorderRadius")}</span>
                  </div>
                  <span className="text-xs font-mono opacity-60">{borderRadius}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {radiusOptions.map((opt) => {
                    const isSelected = borderRadius === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleRadiusChange(opt.value)}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                          isSelected ? "text-white font-bold shadow-xs" : "opacity-75 hover:opacity-100"
                        }`}
                        style={{
                          backgroundColor: isSelected ? "var(--color-primary)" : "transparent",
                          borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)"
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Component Preview Card */}
              <div className="p-5 rounded-2xl border space-y-4 shadow-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider opacity-70">
                  <Eye className="w-4 h-4" />
                  <span>{t("previewTheme")}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-transform hover:scale-105"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    {t("themeSampleButton")}
                  </button>

                  <span 
                    className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: "var(--color-accent)" }}
                  >
                    {t("themeSampleBadge")}
                  </span>

                  <input 
                    type="text" 
                    readOnly 
                    value={t("themeSampleInput")} 
                    className="px-3 py-1.5 rounded-xl border text-xs bg-transparent"
                    style={{ borderColor: "var(--color-border)" }}
                  />

                  <button
                    onClick={resetToDefaults}
                    className="ml-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold opacity-70 hover:opacity-100 text-rose-500 border-rose-200 dark:border-rose-900"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t("themeResetDefaults")}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CREATE NEW THEME */}
          {activeTab === "new" && (
            <form onSubmit={handleCreateThemeSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">{t("themeName")}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. San Carlos Primavera"
                    value={newThemeName}
                    onChange={(e) => {
                      setNewThemeName(e.target.value);
                      if (!newThemeSlug) {
                        setNewThemeSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm bg-transparent"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5">{t("themeSlug")}</label>
                  <input
                    type="text"
                    placeholder="sancarlos-primavera"
                    value={newThemeSlug}
                    onChange={(e) => setNewThemeSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono bg-transparent"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 py-2">
                <input
                  type="checkbox"
                  id="chk-dark"
                  checked={newIsDark}
                  onChange={(e) => setNewIsDark(e.target.checked)}
                  className="rounded w-4 h-4 cursor-pointer"
                />
                <label htmlFor="chk-dark" className="text-sm cursor-pointer select-none font-medium">
                  {t("themeIsDarkVariant")}
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "color_primario", label: t("themePrimaryColor") },
                  { key: "color_secundario", label: t("themeSecondaryColor") },
                  { key: "color_acento", label: t("themeAccentColor") },
                  { key: "color_fondo", label: t("themeBgColor") },
                  { key: "color_superficie", label: t("themeSurfaceColor") },
                  { key: "color_texto", label: t("themeTextColor") },
                  { key: "color_borde", label: t("themeBorderColor") },
                ].map((item) => {
                  const val = (newColors as any)[item.key];
                  return (
                    <div 
                      key={item.key} 
                      className="p-3 border rounded-xl flex items-center justify-between" 
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
                    >
                      <span className="text-xs font-medium">{item.label}</span>
                      <input
                        type="color"
                        value={val}
                        onChange={(e) => setNewColors({ ...newColors, [item.key]: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("preset")}
                  className="px-4 py-2.5 rounded-xl border text-sm font-semibold opacity-80 hover:opacity-100"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold shadow-md text-white transition-transform hover:scale-105"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {t("btnAddNewTheme")}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center space-x-2 text-xs opacity-60">
            <span>{currentTheme.es_modo_oscuro ? "🌙 Night Palette Active" : "☀️ Day Palette Active"}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold border transition-all hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: "var(--color-border)" }}
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
