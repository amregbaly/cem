"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface ThemeConfig {
  id?: number;
  nombre: string;
  slug: string;
  es_modo_oscuro: boolean;
  es_sistema?: boolean;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
  color_fondo: string;
  color_superficie: string;
  color_texto: string;
  color_borde: string;
  descripcion?: string;
}

export const DEFAULT_THEMES: ThemeConfig[] = [
  {
    nombre: "San Carlos Clásico (Día)",
    slug: "sancarlos-classic",
    es_modo_oscuro: false,
    es_sistema: true,
    color_primario: "#1E3A8A",
    color_secundario: "#2563EB",
    color_acento: "#0D9488",
    color_fondo: "#F8FAFC",
    color_superficie: "#FFFFFF",
    color_texto: "#0F172A",
    color_borde: "#E2E8F0",
    descripcion: "Tema oficial institucional diurno"
  },
  {
    nombre: "San Carlos Nocturno (Noche)",
    slug: "sancarlos-night",
    es_modo_oscuro: true,
    es_sistema: true,
    color_primario: "#3B82F6",
    color_secundario: "#60A5FA",
    color_acento: "#14B8A6",
    color_fondo: "#0B0F19",
    color_superficie: "#111827",
    color_texto: "#F9FAFB",
    color_borde: "#1F2937",
    descripcion: "Modo noche de alto descanso visual"
  },
  {
    nombre: "Cachapoal Esmeralda",
    slug: "cachapoal-emerald",
    es_modo_oscuro: false,
    es_sistema: true,
    color_primario: "#065F46",
    color_secundario: "#059669",
    color_acento: "#D97706",
    color_fondo: "#F0FDF4",
    color_superficie: "#FFFFFF",
    color_texto: "#064E3B",
    color_borde: "#D1FAE5",
    descripcion: "Paleta natural inspirada en el verdor de Cachapoal"
  },
  {
    nombre: "Memoria Cálida (Sepia)",
    slug: "warm-sepia",
    es_modo_oscuro: false,
    es_sistema: true,
    color_primario: "#78350F",
    color_secundario: "#B45309",
    color_acento: "#92400E",
    color_fondo: "#FFFBEB",
    color_superficie: "#FFFFFF",
    color_texto: "#451A03",
    color_borde: "#FDE68A",
    descripcion: "Tono cálido y solemne memorial"
  }
];

interface ThemeContextType {
  currentTheme: ThemeConfig;
  isDarkMode: boolean;
  availableThemes: ThemeConfig[];
  setTheme: (slug: string) => void;
  toggleDayNight: () => void;
  updateThemeColors: (colors: Partial<ThemeConfig>) => void;
  addNewTheme: (newTheme: ThemeConfig) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [availableThemes, setAvailableThemes] = useState<ThemeConfig[]>(DEFAULT_THEMES);
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(DEFAULT_THEMES[0]);

  // Apply CSS variables and dark class to document root
  const applyThemeVariables = (theme: ThemeConfig) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    root.style.setProperty("--color-primary", theme.color_primario);
    root.style.setProperty("--color-secondary", theme.color_secundario);
    root.style.setProperty("--color-accent", theme.color_acento);
    root.style.setProperty("--color-bg", theme.color_fondo);
    root.style.setProperty("--color-surface", theme.color_superficie);
    root.style.setProperty("--color-text", theme.color_texto);
    root.style.setProperty("--color-border", theme.color_borde);

    if (theme.es_modo_oscuro) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  // Load saved themes and active theme from localStorage or backend
  useEffect(() => {
    const savedCustomThemes = localStorage.getItem("cem_custom_themes");
    let allThemes = DEFAULT_THEMES;
    if (savedCustomThemes) {
      try {
        const parsed = JSON.parse(savedCustomThemes);
        allThemes = [...DEFAULT_THEMES, ...parsed];
        setAvailableThemes(allThemes);
      } catch (e) {
        console.error("Failed to parse custom themes", e);
      }
    }

    const savedActiveSlug = localStorage.getItem("cem_active_theme");
    const active = allThemes.find(t => t.slug === savedActiveSlug) || allThemes[0];
    setCurrentTheme(active);
    applyThemeVariables(active);
  }, []);

  const setTheme = (slug: string) => {
    const found = availableThemes.find(t => t.slug === slug);
    if (found) {
      setCurrentTheme(found);
      localStorage.setItem("cem_active_theme", found.slug);
      applyThemeVariables(found);
    }
  };

  const toggleDayNight = () => {
    if (currentTheme.es_modo_oscuro) {
      // Switch to Day mode theme
      setTheme("sancarlos-classic");
    } else {
      // Switch to Night mode theme
      setTheme("sancarlos-night");
    }
  };

  const updateThemeColors = (updatedFields: Partial<ThemeConfig>) => {
    const updatedTheme = { ...currentTheme, ...updatedFields };
    setCurrentTheme(updatedTheme);
    applyThemeVariables(updatedTheme);

    const updatedList = availableThemes.map(t => t.slug === updatedTheme.slug ? updatedTheme : t);
    setAvailableThemes(updatedList);

    // Save custom themes
    const customOnly = updatedList.filter(t => !t.es_sistema);
    localStorage.setItem("cem_custom_themes", JSON.stringify(customOnly));
    localStorage.setItem("cem_active_theme", updatedTheme.slug);
  };

  const addNewTheme = (newTheme: ThemeConfig) => {
    const themeWithMeta: ThemeConfig = {
      ...newTheme,
      es_sistema: false
    };
    const nextList = [...availableThemes, themeWithMeta];
    setAvailableThemes(nextList);
    setCurrentTheme(themeWithMeta);
    applyThemeVariables(themeWithMeta);

    const customOnly = nextList.filter(t => !t.es_sistema);
    localStorage.setItem("cem_custom_themes", JSON.stringify(customOnly));
    localStorage.setItem("cem_active_theme", themeWithMeta.slug);
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        isDarkMode: currentTheme.es_modo_oscuro,
        availableThemes,
        setTheme,
        toggleDayNight,
        updateThemeColors,
        addNewTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
