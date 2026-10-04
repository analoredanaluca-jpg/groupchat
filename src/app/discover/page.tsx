import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMatches, type Profile } from "@/lib/matching";
import DiscoverClient from "./DiscoverClient";

export default async function DiscoverPage() {
  const supabase = await createClient();
  if (!supabase) {
    return <main className="min-h-screen bg-[#f6f3ee] px-6 py-16"><div className="mx-auto max-w-4xl"><h1 className="text-4xl font-semibold text-[#173f35]">Configurează Supabase</h1><p className="mt-4 text-slate-600">Adaugă valorile din `.env.example` în `.env.local` pentru a vedea recomandările.</p></div></main>;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: currentProfile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!currentProfile) redirect("/onboarding");

  const { data: blocked } = await supabase.from("blocked_users").select("blocked_user_id").eq("blocker_id", user.id);
  const blockedIds = (blocked ?? []).map((item) => item.blocked_user_id);
  const { data: profiles, error } = await supabase.from("profiles").select("*").neq("id", user.id).not("id", "in", `(${blockedIds.join(",") || "00000000-0000-0000-0000-000000000000"})`);
  if (error) throw new Error(error.message);
  const matches = getMatches(currentProfile as Profile, (profiles ?? []) as Profile[]);

  return <main className="min-h-screen bg-[#f6f3ee] px-6 py-10 text-[#173f35]"><div className="mx-auto max-w-5xl"><header className="mb-10 flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">Roommate</p><h1 className="mt-2 text-3xl font-semibold">Descoperă colegi compatibili</h1></div><div className="flex gap-4 text-sm font-medium text-slate-500"><a href="/onboarding" className="hover:text-[#173f35]">Editează profilul</a><a href="/" className="hover:text-[#173f35]">Acasă</a></div></header><DiscoverClient matches={matches} currentUserId={user.id} /></div></main>;
}
