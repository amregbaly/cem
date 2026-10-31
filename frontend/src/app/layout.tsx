import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";

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
      <body className="antialiased flex flex-col min-h-screen">
        <LanguageProvider>
          <ThemeProvider>
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {children}
            </main>
            <footer 
              className="border-t py-6 text-xs transition-colors"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text)"
              }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 opacity-80">
                <div className="flex items-center space-x-2">
                  <span className="font-bold">Ilustre Municipalidad de San Carlos</span>
                  <span>•</span>
                  <span>Cementerios Municipales (San Carlos & Cachapoal)</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>OWASP ASVS Nivel 2</span>
                  <span>•</span>
                  <span>Trazabilidad Criptográfica HMAC SHA-256</span>
                  <span>•</span>
                  <span>Ley 20.584</span>
                </div>
              </div>
            </footer>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
