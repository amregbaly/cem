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
  border_radius?: string;
}

export const DEFAULT_THEMES: ThemeConfig[] = [
  {
    nombre: "San Carlos Clásico (Día)",
    slug: "sancarlos-classic",
    es_modo_oscuro: false,
    es_sistema: true,
    color_primario: "#AC115B",
    color_secundario: "#0F7573",
    color_acento: "#F8AC1A",
    color_fondo: "#F8FAFC",
    color_superficie: "#FFFFFF",
    color_texto: "#0F172A",
    color_borde: "#E2E8F0",
    descripcion: "Tema oficial institucional Ilustre Municipalidad de San Carlos",
    border_radius: "0.75rem"
  },
  {
    nombre: "San Carlos Nocturno (Noche)",
    slug: "sancarlos-night",
    es_modo_oscuro: true,
    es_sistema: true,
    color_primario: "#D81384",
    color_secundario: "#1FB4B0",
    color_acento: "#FFAE0B",
    color_fondo: "#0B0F19",
    color_superficie: "#111827",
    color_texto: "#F9FAFB",
    color_borde: "#1F2937",
    descripcion: "Modo noche institucional San Carlos de alto descanso visual",
    border_radius: "0.75rem"
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
    descripcion: "Paleta natural inspirada en el verdor de Cachapoal",
    border_radius: "0.75rem"
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
    descripcion: "Tono cálido y solemne memorial",
    border_radius: "0.75rem"
  },
  {
    nombre: "Océano Cívico (Noche)",
    slug: "civic-navy",
    es_modo_oscuro: true,
    es_sistema: true,
    color_primario: "#38BDF8",
    color_secundario: "#0284C7",
    color_acento: "#2DD4BF",
    color_fondo: "#0A192F",
    color_superficie: "#112240",
    color_texto: "#CCD6F6",
    color_borde: "#233554",
    descripcion: "Paleta marina profunda con acentos cian para trabajo nocturno",
    border_radius: "0.75rem"
  },
  {
    nombre: "Aurora Andina (Noche)",
    slug: "andean-twilight",
    es_modo_oscuro: true,
    es_sistema: true,
    color_primario: "#C084FC",
    color_secundario: "#9333EA",
    color_acento: "#F472B6",
    color_fondo: "#0F0B1E",
    color_superficie: "#1B1333",
    color_texto: "#F3E8FF",
    color_borde: "#2E2154",
    descripcion: "Crepúsculo andino con matices púrpura y violeta",
    border_radius: "0.75rem"
  }
];

interface ThemeContextType {
  currentTheme: ThemeConfig;
  isDarkMode: boolean;
  availableThemes: ThemeConfig[];
  borderRadius: string;
  setTheme: (slug: string) => void;
  toggleDayNight: () => void;
  updateThemeColors: (colors: Partial<ThemeConfig>) => void;
  setBorderRadius: (radius: string) => void;
  addNewTheme: (newTheme: ThemeConfig) => void;
  resetToDefaults: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [availableThemes, setAvailableThemes] = useState<ThemeConfig[]>(DEFAULT_THEMES);
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(DEFAULT_THEMES[0]);
  const [borderRadius, setBorderRadiusState] = useState<string>("0.75rem");

  // Apply CSS variables and dark class to document root
  const applyThemeVariables = (theme: ThemeConfig, radius: string = "0.75rem") => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    root.style.setProperty("--color-primary", theme.color_primario);
    root.style.setProperty("--color-secondary", theme.color_secundario);
    root.style.setProperty("--color-accent", theme.color_acento);
    root.style.setProperty("--color-bg", theme.color_fondo);
    root.style.setProperty("--color-surface", theme.color_superficie);
    root.style.setProperty("--color-text", theme.color_texto);
    root.style.setProperty("--color-border", theme.color_borde);
    root.style.setProperty("--theme-radius", theme.border_radius || radius);

    if (theme.es_modo_oscuro) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  // Load saved themes, active theme, and border radius from localStorage
  useEffect(() => {
    const savedCustomThemes = localStorage.getItem("cem_custom_themes");
    let allThemes = DEFAULT_THEMES;
    if (savedCustomThemes) {
      try {
        const parsed = JSON.parse(savedCustomThemes);
        const customOnly = Array.isArray(parsed) ? parsed.filter((p: any) => !p.es_sistema && p.slug !== "sancarlos-classic" && p.slug !== "sancarlos-night") : [];
        allThemes = [...DEFAULT_THEMES, ...customOnly];
        setAvailableThemes(allThemes);
      } catch (e) {
        console.error("Failed to parse custom themes", e);
      }
    }

    const savedRadius = localStorage.getItem("cem_border_radius") || "0.75rem";
    setBorderRadiusState(savedRadius);

    const savedActiveSlug = localStorage.getItem("cem_active_theme");
    const active = allThemes.find(t => t.slug === savedActiveSlug) || allThemes[0];
    setCurrentTheme(active);
    applyThemeVariables(active, savedRadius);
  }, []);

  const setTheme = (slug: string) => {
    const found = availableThemes.find(t => t.slug === slug);
    if (found) {
      setCurrentTheme(found);
      localStorage.setItem("cem_active_theme", found.slug);
      applyThemeVariables(found, borderRadius);
    }
  };

  const toggleDayNight = () => {
    if (currentTheme.es_modo_oscuro) {
      setTheme("sancarlos-classic");
    } else {
      setTheme("sancarlos-night");
    }
  };

  const updateThemeColors = (updatedFields: Partial<ThemeConfig>) => {
    const updatedTheme: ThemeConfig = { ...currentTheme, ...updatedFields };
    setCurrentTheme(updatedTheme);
    applyThemeVariables(updatedTheme, borderRadius);

    const updatedList = availableThemes.map(t => t.slug === updatedTheme.slug ? updatedTheme : t);
    setAvailableThemes(updatedList);

    const customOnly = updatedList.filter(t => !t.es_sistema);
    localStorage.setItem("cem_custom_themes", JSON.stringify(customOnly));
    localStorage.setItem("cem_active_theme", updatedTheme.slug);
  };

  const setBorderRadius = (radius: string) => {
    setBorderRadiusState(radius);
    localStorage.setItem("cem_border_radius", radius);
    updateThemeColors({ border_radius: radius });
  };

  const addNewTheme = (newTheme: ThemeConfig) => {
    const themeWithMeta: ThemeConfig = {
      ...newTheme,
      es_sistema: false,
      border_radius: borderRadius
    };
    const nextList = [...availableThemes, themeWithMeta];
    setAvailableThemes(nextList);
    setCurrentTheme(themeWithMeta);
    applyThemeVariables(themeWithMeta, borderRadius);

    const customOnly = nextList.filter(t => !t.es_sistema);
    localStorage.setItem("cem_custom_themes", JSON.stringify(customOnly));
    localStorage.setItem("cem_active_theme", themeWithMeta.slug);
  };

  const resetToDefaults = () => {
    localStorage.removeItem("cem_custom_themes");
    localStorage.removeItem("cem_active_theme");
    localStorage.removeItem("cem_border_radius");
    setAvailableThemes(DEFAULT_THEMES);
    setCurrentTheme(DEFAULT_THEMES[0]);
    setBorderRadiusState("0.75rem");
    applyThemeVariables(DEFAULT_THEMES[0], "0.75rem");
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        isDarkMode: currentTheme.es_modo_oscuro,
        availableThemes,
        borderRadius,
        setTheme,
        toggleDayNight,
        updateThemeColors,
        setBorderRadius,
        addNewTheme,
        resetToDefaults
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
