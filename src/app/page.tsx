export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] px-6 py-8 text-[#173f35]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">Roommate</span>
        <a href="/auth" className="rounded-full border border-[#173f35]/20 px-5 py-2 text-sm font-semibold transition hover:bg-white">Intră în cont</a>
      </nav>
      <section className="mx-auto flex min-h-[75vh] max-w-6xl items-center py-20">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">Locuiește mai bine împreună</p>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight sm:text-7xl">Găsește un coleg de cameră care ți se potrivește.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">Compatibilitate reală, buget clar și conversații directe — pentru o casă în care te simți bine.</p>
          <a href="/auth" className="mt-9 inline-flex rounded-full bg-[#173f35] px-7 py-3.5 font-semibold text-white transition hover:bg-[#25584b]">Începe acum <span className="ml-2">→</span></a>
        </div>
      </section>
    </main>
  );
}
