import { notFound, redirect } from "next/navigation";
import { getAge } from "@/lib/matching";
import { createClient } from "@/lib/supabase/server";

const accommodationLabels: Record<string, string> = {
  camin: "Cămin",
  chirie: "Caut chirie",
  deja_am_chirie: "Am locuință și caut coleg",
  doar_coleg: "Am locuință și caut coleg",
};

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return <main className="min-h-screen bg-[#f6f3ee] p-10 text-[#173f35]">Configurează Supabase pentru a vedea profilurile.</main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: viewer } = await supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle();
  if (viewer?.account_type !== "staff") redirect("/discover");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();
  return <main className="min-h-screen bg-[#f6f3ee] px-6 py-10 text-[#173f35]"><div className="mx-auto max-w-3xl"><a href="/matches" className="mb-6 inline-block text-sm text-slate-500 hover:text-[#173f35]">← Înapoi la match-uri</a><section className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-[#173f35]/10"><header className="bg-gradient-to-br from-[#173f35] to-[#55927e] p-8 text-white sm:p-10"><p className="text-sm font-semibold uppercase tracking-wider text-white/75">Profil utilizator</p><h1 className="mt-2 text-4xl font-semibold">{profile.display_name}</h1><p className="mt-2 text-white/80">{getAge(profile.birth_date)} ani · {profile.city}{profile.district ? ` · ${profile.district}` : ""}</p></header><div className="grid gap-6 p-8 sm:grid-cols-2 sm:p-10"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Studii</p><p className="mt-2 font-semibold">{profile.university}</p><p className="text-sm text-slate-500">{profile.study_field}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Locuire</p><p className="mt-2 font-semibold">{accommodationLabels[profile.accommodation_preference] ?? "—"}</p><p className="text-sm text-slate-500">Buget: {profile.budget_min}–{profile.budget_max} lei/lună</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Preferință coleg</p><p className="mt-2 font-semibold">{profile.preferred_roommate_gender === "oricare" ? "Oricare" : profile.preferred_roommate_gender}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rutina de zi cu zi</p><p className="mt-2 font-semibold">Somn: {profile.sleep_schedule}</p><p className="text-sm text-slate-500">Organizare: {profile.organization_level ?? "—"}</p></div><div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Interese</p><div className="mt-2 flex flex-wrap gap-2">{(profile.interests ?? []).length ? profile.interests.map((interest: string) => <span key={interest} className="rounded-full bg-[#f0eee9] px-3 py-1.5 text-sm text-slate-600">{interest}</span>) : <span className="text-sm text-slate-500">—</span>}</div></div>{profile.bio && <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Despre</p><p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">{profile.bio}</p></div>}</div></section></div></main>;
}
