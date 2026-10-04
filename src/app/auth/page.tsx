"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setSuccess("");
    try {
      const supabase = createClient();
      const result = mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (result.error) throw result.error;
      if (mode === "sign-up" && !result.data.session) {
        setSuccess("Cont creat. Verifică e-mailul pentru confirmare, apoi autentifică-te.");
      } else { router.push("/discover"); router.refresh(); }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "A apărut o eroare.");
    } finally { setLoading(false); }
  }

  async function handlePasswordReset() {
    if (!email) { setError("Introdu adresa de e-mail pentru resetarea parolei."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset-password` });
      if (resetError) throw resetError;
      setSuccess("Dacă adresa există, vei primi instrucțiunile de resetare.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "A apărut o eroare.");
    } finally { setLoading(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f3ee] px-6 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-[#173f35]/10 sm:p-10">
        <div className="mb-8"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">Roommate</p><h1 className="text-3xl font-semibold tracking-tight text-[#173f35]">{mode === "sign-in" ? "Bine ai revenit" : "Găsește-ți colegul"}</h1><p className="mt-3 text-sm leading-6 text-slate-600">Conectează-te cu persoane compatibile pentru o locuire mai simplă și mai sigură.</p></div>
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-[#f0eee9] p-1 text-sm font-medium">
          {(["sign-in", "sign-up"] as Mode[]).map((item) => <button key={item} type="button" onClick={() => { setMode(item); setError(""); setSuccess(""); }} className={`rounded-lg px-3 py-2 transition ${mode === item ? "bg-white text-[#173f35] shadow-sm" : "text-slate-500"}`}>{item === "sign-in" ? "Autentificare" : "Cont nou"}</button>)}
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-[#173f35]">E-mail<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@exemplu.ro" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#d66c4f] focus:ring-2 focus:ring-[#d66c4f]/20" /></label>
          <label className="block text-sm font-medium text-[#173f35]">Parolă<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 caractere" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#d66c4f] focus:ring-2 focus:ring-[#d66c4f]/20" /></label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{success && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-[#173f35] px-4 py-3 font-semibold text-white transition hover:bg-[#25584b] disabled:cursor-wait disabled:opacity-60">{loading ? "Se procesează..." : mode === "sign-in" ? "Intră în cont" : "Creează cont"}</button>
        </form>
        {mode === "sign-in" && <button type="button" onClick={handlePasswordReset} className="mt-5 w-full text-sm font-medium text-[#d66c4f] hover:underline">Ai uitat parola?</button>}
        <a href="/" className="mt-8 block text-center text-sm text-slate-500 hover:text-[#173f35]">← Înapoi la pagina principală</a>
      </section>
    </main>
  );
}
