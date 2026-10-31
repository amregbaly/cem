"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme, ThemeConfig, DEFAULT_THEMES } from "@/context/ThemeContext";
import { X, Check, Plus, Palette, Sparkles, Moon, Sun } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function ThemeCustomizerModal({ onClose }: Props) {
  const { t } = useLanguage();
  const { currentTheme, availableThemes, setTheme, updateThemeColors, addNewTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<"preset" | "customize" | "new">("preset");

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
      descripcion: `Tema personalizado creado por el Administrador`
    };

    addNewTheme(created);
    setActiveTab("preset");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
          color: "var(--color-text)"
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-accent" style={{ color: "var(--color-accent)" }} />
            <h3 className="text-lg font-bold">{t("themeSettings")}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b text-sm font-semibold px-6" style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={() => setActiveTab("preset")}
            className={`py-3 px-4 border-b-2 transition-all ${
              activeTab === "preset" ? "border-primary opacity-100 font-bold" : "border-transparent opacity-60 hover:opacity-100"
            }`}
            style={{ borderColor: activeTab === "preset" ? "var(--color-primary)" : "transparent" }}
          >
            Paletas Predeterminadas ({availableThemes.length})
          </button>
          <button
            onClick={() => setActiveTab("customize")}
            className={`py-3 px-4 border-b-2 transition-all ${
              activeTab === "customize" ? "border-primary opacity-100 font-bold" : "border-transparent opacity-60 hover:opacity-100"
            }`}
            style={{ borderColor: activeTab === "customize" ? "var(--color-primary)" : "transparent" }}
          >
            Ajustar Colores Activos
          </button>
          <button
            onClick={() => setActiveTab("new")}
            className={`flex items-center space-x-1.5 py-3 px-4 border-b-2 transition-all ${
              activeTab === "new" ? "border-primary opacity-100 font-bold" : "border-transparent opacity-60 hover:opacity-100"
            }`}
            style={{ borderColor: activeTab === "new" ? "var(--color-primary)" : "transparent" }}
          >
            <Plus className="w-4 h-4" />
            <span>{t("btnAddNewTheme")}</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* TAB 1: PRESET THEMES LIST */}
          {activeTab === "preset" && (
            <div className="space-y-4">
              <p className="text-sm opacity-80">
                Seleccione un tema visual para aplicarlo inmediatamente a la plataforma.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableThemes.map((theme) => {
                  const isSelected = currentTheme.slug === theme.slug;
                  return (
                    <div
                      key={theme.slug}
                      onClick={() => setTheme(theme.slug)}
                      className={`cursor-pointer p-4 rounded-xl border transition-all hover:shadow-md ${
                        isSelected ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/50"
                      }`}
                      style={{
                        backgroundColor: theme.color_fondo,
                        borderColor: isSelected ? "var(--color-primary)" : "var(--color-border)",
                        color: theme.color_texto
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">{theme.nombre}</span>
                        {isSelected && (
                          <span className="flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                            <Check className="w-3 h-3" />
                            <span>{t("themeActive")}</span>
                          </span>
                        )}
                      </div>

                      {/* Color Palette preview dots */}
                      <div className="flex items-center space-x-2 mt-3">
                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: theme.color_primario }} title="Primario" />
                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: theme.color_secundario }} title="Secundario" />
                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: theme.color_acento }} title="Acento" />
                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: theme.color_superficie }} title="Superficie" />
                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: theme.color_texto }} title="Texto" />
                        <span className="text-xs opacity-70 ml-2">
                          {theme.es_modo_oscuro ? "🌙 Noche" : "☀️ Día"}
                        </span>
                      </div>

                      {theme.descripcion && (
                        <p className="text-xs opacity-75 mt-2 line-clamp-1">{theme.descripcion}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE COLOR CUSTOMIZATION */}
          {activeTab === "customize" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border flex items-center justify-between text-sm" style={{ borderColor: "var(--color-border)" }}>
                <span>Modificando colores del tema activo: <strong>{currentTheme.nombre}</strong></span>
                <span className="text-xs px-2 py-1 rounded bg-accent text-white font-semibold">Tiempo Real</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
                      <div>
                        <div className="text-xs font-semibold">{item.label}</div>
                        <div className="text-xs opacity-60 font-mono">{val}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={val}
                          onChange={(e) => handleColorChange(item.key as any, e.target.value)}
                          className="w-9 h-9 rounded cursor-pointer border border-transparent bg-transparent"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CREATE NEW THEME */}
          {activeTab === "new" && (
            <form onSubmit={handleCreateThemeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">{t("themeName")}</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. San Carlos Primavera"
                    value={newThemeName}
                    onChange={(e) => {
                      setNewThemeName(e.target.value);
                      if (!newThemeSlug) {
                        setNewThemeSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t("themeSlug")}</label>
                  <input
                    type="text"
                    placeholder="sancarlos-primavera"
                    value={newThemeSlug}
                    onChange={(e) => setNewThemeSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm font-mono bg-transparent"
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
                <label htmlFor="chk-dark" className="text-sm cursor-pointer select-none">
                  ¿Es una variante de Modo Noche / Oscuro?
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "color_primario", label: "Primario" },
                  { key: "color_secundario", label: "Secundario" },
                  { key: "color_acento", label: "Acento" },
                  { key: "color_fondo", label: "Fondo" },
                  { key: "color_superficie", label: "Tarjeta" },
                  { key: "color_texto", label: "Texto" },
                  { key: "color_borde", label: "Borde" },
                ].map((item) => {
                  const val = (newColors as any)[item.key];
                  return (
                    <div key={item.key} className="p-2 border rounded-lg flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                      <span className="text-xs font-medium">{item.label}</span>
                      <input
                        type="color"
                        value={val}
                        onChange={(e) => setNewColors({ ...newColors, [item.key]: e.target.value })}
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("preset")}
                  className="px-4 py-2 rounded-lg border text-sm font-semibold opacity-80 hover:opacity-100"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-sm font-bold shadow-md text-white transition-transform hover:scale-105"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {t("btnAddNewTheme")}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold border transition-all hover:bg-black/5"
            style={{ borderColor: "var(--color-border)" }}
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
