"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="route-message" id="contenido" role="alert">
      <p className="section-kicker">Error inesperado</p>
      <h1>No pudimos abrir el espacio de contactos</h1>
      <p>
        Vuelve a intentarlo. No perderás ningún cambio porque esta vista es de
        consulta.
      </p>
      <button type="button" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
