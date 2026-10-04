import Link from "next/link";

export default function ChatPage() {
  return <main className="min-h-screen bg-[#f6f3ee] px-6 py-16 text-[#173f35]"><div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl shadow-[#173f35]/10"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">Roommate</p><h1 className="mt-3 text-3xl font-semibold">Conversația ta</h1><p className="mt-4 text-slate-600">Chatul intern va fi activat la pasul următor. Fluxul de contact este deja pregătit.</p><Link href="/discover" className="mt-8 inline-flex rounded-xl bg-[#173f35] px-5 py-3 font-semibold text-white">Înapoi la recomandări</Link></div></main>;
}
