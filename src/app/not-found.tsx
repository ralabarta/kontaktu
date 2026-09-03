import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-message" id="contenido">
      <p className="section-kicker">404 · Ruta no disponible</p>
      <h1>Esta ficha no existe</h1>
      <p>Puede que el contacto ya no esté disponible en este espacio.</p>
      <Link href="/">Volver a contactos</Link>
    </main>
  );
}
