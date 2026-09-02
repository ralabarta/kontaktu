const preparationItems = [
  "Identidad y canal de origen",
  "Necesidades y contexto",
  "Historial de interacciones",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-10">
          <a
            className="brand-mark"
            href="#contenido"
            aria-label="Kontaktu, ir al contenido"
          >
            kontaktu<span aria-hidden="true">.</span>
          </a>
          <p className="text-sm font-medium text-[var(--muted)]">
            Espacio de contactos
          </p>
        </div>
      </header>

      <main
        id="contenido"
        className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1.25fr_0.75fr] lg:px-10 lg:py-24"
      >
        <section aria-labelledby="page-title" className="self-center">
          <p className="eyebrow">Preparación inteligente</p>
          <h1
            id="page-title"
            className="mt-5 max-w-3xl text-5xl leading-[0.96] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl"
          >
            Cada contacto merece una conversación bien preparada.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Una ficha clara para entender a la persona, ordenar el contexto y
            actuar con criterio antes de llamar.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <span className="status-chip">
              <span className="status-dot" aria-hidden="true" />
              Base técnica lista
            </span>
            <span className="text-sm text-[var(--muted)]">
              Primer ciclo de calidad en curso
            </span>
          </div>
        </section>

        <aside aria-labelledby="preview-title" className="preview-panel">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-5">
            <div>
              <p className="eyebrow">Vista previa</p>
              <h2 id="preview-title" className="mt-2 text-xl font-semibold">
                Antes de llamar
              </h2>
            </div>
            <span className="index-badge" aria-label="Tres puntos de contexto">
              03
            </span>
          </div>
          <ol className="mt-3 divide-y divide-[var(--line)]">
            {preparationItems.map((item, index) => (
              <li key={item} className="flex items-center gap-4 py-5">
                <span className="item-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-medium">{item}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-l-2 border-[var(--accent)] pl-4 text-sm leading-6 text-[var(--muted)]">
            Esta superficie mínima valida el sistema visual. La ficha completa
            se construirá en los siguientes ciclos TDD.
          </p>
        </aside>
      </main>
    </div>
  );
}
