import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kontaktu | Ficha de contactos",
  description:
    "Espacio de trabajo inmobiliario para preparar conversaciones con contexto.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#contenido">
          Ir al contenido
        </a>
        <header className="app-header">
          <Link
            className="brand-mark"
            href="/"
            aria-label="Kontaktu, contactos"
          >
            kontaktu<span aria-hidden="true">.</span>
          </Link>
          <div className="app-header__context">
            <span className="live-mark" aria-hidden="true" />
            <span>Workspace demo</span>
            <strong>Inteligencia de contactos</strong>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
