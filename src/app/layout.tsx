import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kontaktu | Inteligencia de contactos",
  description:
    "Espacio de trabajo para preparar cada conversación inmobiliaria.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
