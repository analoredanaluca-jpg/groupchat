"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PrivacyControls() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function exportData() {
    setLoading(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/privacy/export", { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Exportul nu a putut fi descărcat.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "roommate-data-export.json";
      link.click();
      URL.revokeObjectURL(objectUrl);
      setNotice("Exportul datelor tale a fost descărcat.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Exportul nu a putut fi descărcat.");
    } finally { setLoading(false); }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/privacy/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Contul nu a putut fi șters.");
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign("/auth?deleted=1");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Contul nu a putut fi șters.");
    } finally { setLoading(false); }
  }

  return <section className="space-y-6">
    <div className="rounded-3xl bg-white p-6 shadow-lg shadow-[#173f35]/5 sm:p-8"><h2 className="text-xl font-semibold">Descarcă datele</h2><p className="mt-2 text-sm leading-6 text-slate-600">Descarcă o copie JSON a profilului, match-urilor, conversațiilor, postărilor, blocărilor, raportărilor și activității Groupchat disponibilă contului tău.</p><button type="button" onClick={() => void exportData()} disabled={loading} className="mt-5 rounded-xl bg-[#173f35] px-5 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Se procesează..." : "Descarcă datele mele"}</button></div>
    <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-lg shadow-[#173f35]/5 sm:p-8"><h2 className="text-xl font-semibold text-red-800">Șterge contul și datele</h2><p className="mt-2 text-sm leading-6 text-slate-600">Ștergerea contului este permanentă. Profilul, match-urile, mesajele, postările și datele asociate vor fi șterse prin baza de date. Mesajele tale din grup vor fi eliminate; grupurile orașelor vor rămâne pentru ceilalți membri.</p><form onSubmit={deleteAccount} className="mt-5 space-y-4"><label className="block text-sm font-medium">Parola contului<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" /></label><label className="block text-sm font-medium">Scrie <span className="font-bold">STERGE</span> pentru confirmare<input required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="input" /></label><button type="submit" disabled={loading || confirmation !== "STERGE" || !password} className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Șterge definitiv contul</button></form></div>
    {notice && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</p>}
    {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
  </section>;
}
