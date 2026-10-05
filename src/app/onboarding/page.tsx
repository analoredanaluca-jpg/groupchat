"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAge } from "@/lib/matching";
import { parseCnp } from "@/lib/cnp";

const interestOptions = ["sport", "muzică", "gătit", "gaming", "călătorii", "socializare", "filme", "citit"];

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    account_type: "member",
    display_name: "", birth_date: "", city: "București", district: "", university: "", study_field: "",
    gender: "", preferred_roommate_gender: "oricare", accommodation_preference: "camin", budget_min: "800", budget_max: "1800",
    sleep_schedule: "flexibil", organization_level: "echilibrat", bio: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [cnp, setCnp] = useState("");
  const [cnpLookupEnabled, setCnpLookupEnabled] = useState(false);
  const [savedCnpLookupEnabled, setSavedCnpLookupEnabled] = useState(false);
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
        setForm({ account_type: profile.account_type ?? "member", display_name: profile.display_name, birth_date: profile.birth_date, city: profile.city, district: profile.district ?? "", university: profile.university, study_field: profile.study_field, gender: profile.gender, preferred_roommate_gender: profile.preferred_roommate_gender, accommodation_preference: profile.accommodation_preference ?? "camin", budget_min: String(profile.budget_min), budget_max: String(profile.budget_max), sleep_schedule: profile.sleep_schedule, organization_level: profile.organization_level ?? "echilibrat", bio: profile.bio ?? "" });
        setInterests(profile.interests ?? []);
        const cnpSettings = await fetch("/api/groupchat/cnp", { cache: "no-store" });
        if (cnpSettings.ok) {
          const settings = await cnpSettings.json() as { enabled: boolean };
          setCnpLookupEnabled(settings.enabled);
          setSavedCnpLookupEnabled(settings.enabled);
        }
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
      const identity = cnp ? parseCnp(cnp) : null;
      if (cnp && !identity) throw new Error("CNP-ul introdus nu este valid.");
      if (!identity && (!form.birth_date || !form.gender)) throw new Error("Completează data nașterii și genul.");
      if (cnpLookupEnabled && !cnp && !savedCnpLookupEnabled) throw new Error("Introdu CNP-ul pentru a activa căutarea CNP în invitații.");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      const { error: saveError } = await supabase.from("profiles").upsert({
        id: user.id, ...form, accommodation_preference: form.accommodation_preference === "doar_coleg" ? "deja_am_chirie" : form.accommodation_preference, birth_date: identity?.birthDate ?? form.birth_date, gender: identity?.gender ?? form.gender,
        budget_min: Number(form.budget_min), budget_max: Number(form.budget_max), interests,
      });
      if (saveError) throw saveError;
      if (cnpLookupEnabled && cnp) {
        const cnpResponse = await fetch("/api/groupchat/cnp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "register", cnp }),
        });
        if (!cnpResponse.ok) {
          const result = await cnpResponse.json() as { error?: string };
          throw new Error(result.error ?? "Identificatorul protejat nu a putut fi salvat.");
        }
        setSavedCnpLookupEnabled(true);
      } else if (!cnpLookupEnabled && savedCnpLookupEnabled) {
        const cnpResponse = await fetch("/api/groupchat/cnp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unregister" }),
        });
        if (!cnpResponse.ok) throw new Error("Setarea de căutare CNP nu a putut fi dezactivată.");
        setSavedCnpLookupEnabled(false);
      }
      router.push(form.account_type === "staff" ? "/matches" : "/discover"); router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Profilul nu a putut fi salvat.");
    } finally { setLoading(false); }
  }

  function toggleInterest(interest: string) {
    setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]);
  }

  const parsedCnp = cnp ? parseCnp(cnp) : null;
  const displayedBirthDate = parsedCnp?.birthDate ?? form.birth_date;
  const displayedGender = parsedCnp?.gender ?? form.gender;

  return (
    <main className="min-h-screen bg-[#f6f3ee] px-6 py-12 text-[#173f35]">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">{editing ? "Profilul tău" : "Pasul 1 din 1"}</p><button type="button" onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); router.push("/auth"); }} className="text-sm text-slate-500 hover:text-[#173f35]">Ieși din cont</button></div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{editing ? "Actualizează-ți profilul." : "Spune-ne cu cine ai vrea să locuiești."}</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Completează profilul pentru a primi recomandări relevante. Îți protejăm datele sensibile.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-8 rounded-3xl bg-white p-6 shadow-xl shadow-[#173f35]/10 sm:p-10">
          <section><h2 className="text-lg font-semibold">Despre tine</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">Nume afișat<input required value={form.display_name} onChange={(e) => updateField("display_name", e.target.value)} placeholder="Alex Popescu" className="input" /></label>
            <label className="text-sm font-medium">CNP <span className="font-normal text-slate-400">opțional</span><input inputMode="numeric" autoComplete="off" type="password" value={cnp} onChange={(e) => setCnp(e.target.value.replace(/\D/g, "").slice(0, 13))} placeholder="13 cifre" maxLength={13} className="input" aria-describedby="cnp-privacy" /><span id="cnp-privacy" className="mt-1 block text-xs font-normal text-slate-500">Poți completa manual data nașterii și genul. CNP-ul nu este necesar pentru cont.</span></label>
            <div className="text-sm font-medium">Data nașterii<input required type="date" readOnly={Boolean(parsedCnp)} value={displayedBirthDate} onChange={(e) => updateField("birth_date", e.target.value)} className="input mt-1" /></div>
            <label className="text-sm font-medium">Gen<select required disabled={Boolean(parsedCnp)} value={displayedGender} onChange={(e) => updateField("gender", e.target.value)} className="input"><option value="">Alege genul</option><option value="masculin">Masculin</option><option value="feminin">Feminin</option></select></label>
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm sm:col-span-2"><input type="checkbox" checked={cnpLookupEnabled} onChange={(e) => setCnpLookupEnabled(e.target.checked)} className="mt-1 h-4 w-4 accent-[#173f35]" /><span><span className="font-semibold">Permite căutarea profilului meu după CNP pentru invitații în Groupchat.</span><span className="mt-1 block text-xs leading-5 text-slate-500">Activarea necesită introducerea CNP-ului. Se păstrează doar un HMAC protejat al CNP-ului pentru potrivirea invitațiilor. Poți dezactiva opțiunea oricând; HMAC-ul și istoricul recent al căutărilor sunt șterse. CNP-ul nu dovedește identitatea și nu este folosit în matching-ul de colegi.</span></span></label>
            <div className="text-sm font-medium">Vârstă<input readOnly value={displayedBirthDate ? `${getAge(displayedBirthDate)} ani` : ""} placeholder="Calculată automat" className="input mt-1" /></div>
            <label className="text-sm font-medium">Oraș<select required value={form.city} onChange={(e) => updateField("city", e.target.value)} className="input"><option>București</option><option>Cluj-Napoca</option><option>Iași</option><option>Timișoara</option><option>Brașov</option><option>Constanța</option><option>Alt oraș</option></select></label>
            <label className="text-sm font-medium">Zonă preferată<input value={form.district} onChange={(e) => updateField("district", e.target.value)} placeholder="Centru, Mărăști..." className="input" /></label>
            <label className="text-sm font-medium">Universitate<input required value={form.university} onChange={(e) => updateField("university", e.target.value)} placeholder="Universitatea..." className="input" /></label>
            <label className="text-sm font-medium">Domeniu de studiu<input required value={form.study_field} onChange={(e) => updateField("study_field", e.target.value)} placeholder="Informatică" className="input" /></label>
          </div></section>

          <section className="rounded-3xl border border-[#173f35]/10 bg-[#fbfaf7] p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Ce tip de cont vrei?</h2><p className="mt-1 text-sm text-slate-500">Alege ce cauți. Profilul tău păstrează toate preferințele.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500">Pas important</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["camin", "Caut cămin"], ["chirie", "Caut chirie"], ["deja_am_chirie", "Am locuință și caut coleg"], ["staff", "Staff"]].map(([value, label]) => { const isStaff = value === "staff"; const isCombinedHousing = value === "deja_am_chirie"; const selected = isStaff ? form.account_type === "staff" : form.account_type !== "staff" && (form.accommodation_preference === value || (isCombinedHousing && form.accommodation_preference === "doar_coleg")); return <label key={value} className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-4 transition ${isStaff ? `sm:col-span-2 ${selected ? "border-[#173f35] bg-[#e8f2ed] text-[#173f35] shadow-md ring-2 ring-[#173f35]/15" : "border-[#173f35]/25 bg-white text-[#173f35] hover:border-[#173f35]/60 hover:bg-[#f1f7f3]"}` : selected ? "border-[#d66c4f] bg-[#fff4ef] font-semibold text-[#a8472f] shadow-sm ring-2 ring-[#d66c4f]/15" : "border-slate-200 bg-white text-slate-600 hover:border-[#d66c4f]/50"}`}><input type="radio" name="account_type_choice" value={value} checked={selected} onChange={() => { if (isStaff) updateField("account_type", "staff"); else { updateField("account_type", "member"); updateField("accommodation_preference", value); } }} className={`h-4 w-4 ${isStaff ? "accent-[#173f35]" : "accent-[#d66c4f]"}`} /><span className="flex-1"><span className="block font-semibold">{label}</span>{isStaff && <span className="mt-1 block text-xs font-normal text-slate-500">Acces la match-urile confirmate și profilurile lor.</span>}</span>{isStaff && <span className="rounded-full bg-[#173f35] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">Staff</span>}{selected && !isStaff && <span className="text-xs font-semibold uppercase tracking-wide">Selectat</span>}</label>; })}</div></section>

          <section><h2 className="text-lg font-semibold">Preferințe de locuire</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
            {form.account_type === "staff" && <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Preferință de locuire pentru profilul staff</legend><div className="mt-2 grid gap-3 sm:grid-cols-2">{[["camin", "Caut cămin"], ["chirie", "Caut chirie"], ["deja_am_chirie", "Am locuință și caut coleg"]].map(([value, label]) => { const selected = form.accommodation_preference === value || (value === "deja_am_chirie" && form.accommodation_preference === "doar_coleg"); return <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm transition ${selected ? "border-[#d66c4f] bg-[#fff4ef] font-semibold text-[#a8472f] shadow-sm ring-2 ring-[#d66c4f]/20" : "border-slate-200 bg-white text-slate-600 hover:border-[#d66c4f]/50"}`}><input required type="radio" name="accommodation_preference" value={value} checked={selected} onChange={(e) => updateField("accommodation_preference", e.target.value)} className="h-4 w-4 accent-[#d66c4f]" /><span>{label}</span>{selected && <span className="ml-auto text-xs font-semibold uppercase tracking-wide">Selectat</span>}</label>; })}</div></fieldset>}
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
