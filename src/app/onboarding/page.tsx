"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const interestOptions = ["sport", "muzică", "gătit", "gaming", "călătorii", "socializare", "filme", "citit"];

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    display_name: "", birth_date: "", city: "București", district: "", university: "", study_field: "",
    gender: "", preferred_roommate_gender: "oricare", budget_min: "800", budget_max: "1800",
    sleep_schedule: "flexibil", organization_level: "echilibrat", bio: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (!profile) return;
        setEditing(true);
        setForm({ display_name: profile.display_name, birth_date: profile.birth_date, city: profile.city, district: profile.district ?? "", university: profile.university, study_field: profile.study_field, gender: profile.gender, preferred_roommate_gender: profile.preferred_roommate_gender, budget_min: String(profile.budget_min), budget_max: String(profile.budget_max), sleep_schedule: profile.sleep_schedule, organization_level: profile.organization_level ?? "echilibrat", bio: profile.bio ?? "" });
        setInterests(profile.interests ?? []);
      } catch { /* The submit action displays the actionable error. */ }
    }
    void loadProfile();
  }, []);

  function updateField(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      const { error: saveError } = await supabase.from("profiles").upsert({
        id: user.id, ...form, budget_min: Number(form.budget_min), budget_max: Number(form.budget_max), interests,
      });
      if (saveError) throw saveError;
      router.push("/discover"); router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Profilul nu a putut fi salvat.");
    } finally { setLoading(false); }
  }

  function toggleInterest(interest: string) {
    setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]);
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] px-6 py-12 text-[#173f35]">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">{editing ? "Profilul tău" : "Pasul 1 din 1"}</p><button type="button" onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); router.push("/auth"); }} className="text-sm text-slate-500 hover:text-[#173f35]">Ieși din cont</button></div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{editing ? "Actualizează-ți profilul." : "Spune-ne cu cine ai vrea să locuiești."}</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Completează profilul pentru a primi recomandări relevante. Îți protejăm datele sensibile.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-8 rounded-3xl bg-white p-6 shadow-xl shadow-[#173f35]/10 sm:p-10">
          <section><h2 className="text-lg font-semibold">Despre tine</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">Nume afișat<input required value={form.display_name} onChange={(e) => updateField("display_name", e.target.value)} placeholder="Alex Popescu" className="input" /></label>
            <label className="text-sm font-medium">Data nașterii<input required type="date" value={form.birth_date} onChange={(e) => updateField("birth_date", e.target.value)} className="input" /></label>
            <label className="text-sm font-medium">Oraș<select required value={form.city} onChange={(e) => updateField("city", e.target.value)} className="input"><option>București</option><option>Cluj-Napoca</option><option>Iași</option><option>Timișoara</option><option>Brașov</option><option>Constanța</option><option>Alt oraș</option></select></label>
            <label className="text-sm font-medium">Zonă preferată<input value={form.district} onChange={(e) => updateField("district", e.target.value)} placeholder="Centru, Mărăști..." className="input" /></label>
            <label className="text-sm font-medium">Universitate<input required value={form.university} onChange={(e) => updateField("university", e.target.value)} placeholder="Universitatea..." className="input" /></label>
            <label className="text-sm font-medium">Domeniu de studiu<input required value={form.study_field} onChange={(e) => updateField("study_field", e.target.value)} placeholder="Informatică" className="input" /></label>
          </div></section>

          <section><h2 className="text-lg font-semibold">Preferințe de locuire</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">Gen<select required value={form.gender} onChange={(e) => updateField("gender", e.target.value)} className="input"><option value="">Alege...</option><option value="masculin">Masculin</option><option value="feminin">Feminin</option></select></label>
            <label className="text-sm font-medium">Preferință coleg<select required value={form.preferred_roommate_gender} onChange={(e) => updateField("preferred_roommate_gender", e.target.value)} className="input"><option value="oricare">Oricare</option><option value="masculin">Masculin</option><option value="feminin">Feminin</option></select></label>
            <label className="text-sm font-medium">Buget minim (lei/lună)<input required min="0" type="number" value={form.budget_min} onChange={(e) => updateField("budget_min", e.target.value)} className="input" /></label>
            <label className="text-sm font-medium">Buget maxim (lei/lună)<input required min="0" type="number" value={form.budget_max} onChange={(e) => updateField("budget_max", e.target.value)} className="input" /></label>
            <label className="text-sm font-medium">Program de somn<select value={form.sleep_schedule} onChange={(e) => updateField("sleep_schedule", e.target.value)} className="input"><option value="devreme">Mă trezesc devreme</option><option value="flexibil">Flexibil</option><option value="tarziu">Sunt activ noaptea</option></select></label>
            <label className="text-sm font-medium">Nivel de organizare<select value={form.organization_level} onChange={(e) => updateField("organization_level", e.target.value)} className="input"><option value="relaxat">Relaxat</option><option value="echilibrat">Echilibrat</option><option value="organizat">Organizat</option></select></label>
          </div></section>

          <section><h2 className="text-lg font-semibold">Interese</h2><div className="mt-4 flex flex-wrap gap-2">{interestOptions.map((interest) => <button key={interest} type="button" onClick={() => toggleInterest(interest)} className={`rounded-full px-4 py-2 text-sm transition ${interests.includes(interest) ? "bg-[#173f35] text-white" : "bg-[#f0eee9] text-slate-600 hover:bg-[#e4e0d8]"}`}>{interest}</button>)}</div></section>

          <label className="block text-sm font-medium">Descriere scurtă<span className="ml-2 font-normal text-slate-400">opțional</span><textarea maxLength={300} value={form.bio} onChange={(e) => updateField("bio", e.target.value)} placeholder="Ce ar trebui să știe un viitor coleg despre tine?" className="input min-h-28 resize-y" /></label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-[#173f35] px-4 py-3.5 font-semibold text-white transition hover:bg-[#25584b] disabled:opacity-60">{loading ? "Se salvează..." : editing ? "Actualizează profilul" : "Salvează profilul și continuă"}</button>
        </form>
      </div>
    </main>
  );
}
