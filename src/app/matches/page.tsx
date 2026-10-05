import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberMatchesClient, { type MemberConversation } from "./MemberMatchesClient";
import StaffMatchesClient, { type StaffPair } from "./StaffMatchesClient";

export default async function MatchesPage() {
  const supabase = await createClient();
  if (!supabase) return <main className="min-h-screen bg-[#f6f3ee] p-10 text-[#173f35]">Configurează Supabase pentru a vedea match-urile.</main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  if (profile.account_type === "staff") {
    const { data: rows, error } = await supabase.from("matches").select("user_id, matched_user_id, created_at").eq("status", "matched").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const directions = new Set((rows ?? []).map((row) => `${row.user_id}:${row.matched_user_id}`));
    const uniquePairs = new Map<string, { firstId: string; secondId: string }>();
    for (const row of rows ?? []) {
      if (!directions.has(`${row.matched_user_id}:${row.user_id}`)) continue;
      const [firstId, secondId] = [row.user_id, row.matched_user_id].sort();
      uniquePairs.set(`${firstId}:${secondId}`, { firstId, secondId });
    }
    const ids = [...new Set([...uniquePairs.values()].flatMap((pair) => [pair.firstId, pair.secondId]))];
    const { data: profiles, error: profilesError } = ids.length
      ? await supabase.from("profiles").select("id, display_name, city, university").in("id", ids)
      : { data: [], error: null };
    if (profilesError) throw new Error(profilesError.message);
    const byId = new Map((profiles ?? []).map((person) => [person.id, person]));
    const pairs: StaffPair[] = [...uniquePairs.values()].flatMap((pair) => {
      const first = byId.get(pair.firstId);
      const second = byId.get(pair.secondId);
      return first && second ? [{
        ...pair,
        firstName: first.display_name,
        firstCity: first.city,
        firstUniversity: first.university,
        secondName: second.display_name,
        secondCity: second.city,
        secondUniversity: second.university,
      }] : [];
    });

    return <main className="min-h-screen bg-[#f6f3ee] px-6 py-10 text-[#173f35]"><div className="mx-auto max-w-5xl"><header className="mb-10 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">Roommate · Staff</p><h1 className="mt-2 text-3xl font-semibold">Match-uri realizate</h1><p className="mt-2 text-slate-600">Vezi perechile confirmate, deschide profilurile sau elimină un match.</p></div><nav aria-label="Meniu principal" className="flex flex-wrap gap-2 text-sm font-medium"><a href="/feed" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Acasă</a><a href="/matches" aria-current="page" className="rounded-full bg-[#173f35] px-3 py-2 text-white">Match-uri</a><a href="/groupchat" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Groupchat</a><a href="/onboarding" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Profil</a></nav></header><StaffMatchesClient initialPairs={pairs} /></div></main>;
  }

  const { data: rows, error } = await supabase.from("matches").select("user_id, matched_user_id, status").or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`).in("status", ["matched", "cancelled"]);
  if (error) throw new Error(error.message);
  const byPerson = new Map<string, "matched" | "cancelled">();
  for (const row of rows ?? []) {
    const otherId = row.user_id === user.id ? row.matched_user_id : row.user_id;
    if (row.status === "cancelled" || !byPerson.has(otherId)) byPerson.set(otherId, row.status as "matched" | "cancelled");
  }
  const otherIds = [...byPerson.keys()];
  const { data: otherProfiles, error: otherProfilesError } = otherIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", otherIds)
    : { data: [], error: null };
  if (otherProfilesError) throw new Error(otherProfilesError.message);
  const names = new Map((otherProfiles ?? []).map((person) => [person.id, person.display_name]));
  const conversations: MemberConversation[] = [...byPerson].flatMap(([id, status]) => names.has(id) ? [{ id, displayName: names.get(id)!, status }] : []);

  return <main className="min-h-screen bg-[#f6f3ee] px-6 py-10 text-[#173f35]"><div className="mx-auto max-w-4xl"><header className="mb-10 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">Roommate</p><h1 className="mt-2 text-3xl font-semibold">Conversațiile tale</h1><p className="mt-2 text-slate-600">Match-urile active și conversațiile păstrate după anulare.</p></div><nav aria-label="Meniu principal" className="flex flex-wrap gap-2 text-sm font-medium"><a href="/feed" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Acasă</a><a href="/discover" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Match</a><a href="/matches" aria-current="page" className="rounded-full bg-[#173f35] px-3 py-2 text-white">Conversații</a><a href="/groupchat" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Groupchat</a><a href="/onboarding" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Profil</a></nav></header><MemberMatchesClient conversations={conversations} /></div></main>;
}
