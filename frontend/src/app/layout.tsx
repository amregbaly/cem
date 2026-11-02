import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Sistema de Gestión Cementerios Municipales | San Carlos & Cachapoal",
  description: "Plataforma Web de Gestión Interna para los Cementerios Municipales de San Carlos y Cachapoal (EETT 2026)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <LanguageProvider>
          <ThemeProvider>
            <AppShell>
              {children}
            </AppShell>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
