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
  if (currentProfile.account_type === "staff") redirect("/matches");

  const { data: incomingMatches, error: incomingMatchesError } = await supabase
    .from("matches")
    .select("user_id")
    .eq("matched_user_id", user.id)
    .eq("status", "pending");
  if (incomingMatchesError) throw new Error(incomingMatchesError.message);
  const incomingMatchIds = (incomingMatches ?? []).map((match) => match.user_id);

  const { data: blocked } = await supabase.from("blocked_users").select("blocked_user_id").eq("blocker_id", user.id);
  const blockedIds = (blocked ?? []).map((item) => item.blocked_user_id);
  const { data: profiles, error } = await supabase.from("profiles").select("*").neq("id", user.id).not("id", "in", `(${blockedIds.join(",") || "00000000-0000-0000-0000-000000000000"})`);
  if (error) throw new Error(error.message);
  const matches = getMatches(currentProfile as Profile, (profiles ?? []) as Profile[]);

  return <main className="min-h-screen bg-[#f6f3ee] px-6 py-10 text-[#173f35]"><div className="mx-auto max-w-5xl"><header className="mb-10 flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">Roommate</p><h1 className="mt-2 text-3xl font-semibold">Descoperă colegi compatibili</h1></div><nav aria-label="Meniu principal" className="flex flex-wrap gap-2 text-sm font-medium"><a href="/feed" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Acasă</a><a href="/discover" aria-current="page" className="rounded-full bg-[#173f35] px-3 py-2 text-white">Match</a><a href="/matches" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Conversații</a><a href="/groupchat" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Groupchat</a><a href="/onboarding" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Profil</a></nav></header><DiscoverClient matches={matches} incomingMatchIds={incomingMatchIds} currentUserId={user.id} /></div></main>;
}
