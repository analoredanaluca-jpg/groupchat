"use client";

import { useState } from "react";
import Link from "next/link";
import { getAge, type Match } from "@/lib/matching";
import { createClient } from "@/lib/supabase/client";

export default function DiscoverClient({ matches, currentUserId }: { matches: Match[]; currentUserId: string }) {
  const [remaining, setRemaining] = useState(matches);
  const current = remaining[0];

  function dismiss() { setRemaining((items) => items.slice(1)); }

  async function moderate(action: "block" | "report") {
    const supabase = createClient();
    if (action === "block") {
      await supabase.from("blocked_users").insert({ blocker_id: currentUserId, blocked_user_id: profile.id });
      dismiss();
    } else {
      await supabase.from("reports").insert({ reporter_id: currentUserId, reported_id: profile.id, reason: "Profil raportat de utilizator" });
      dismiss();
    }
  }

  if (!current) {
    return <div className="rounded-3xl bg-white p-10 text-center shadow-xl shadow-[#173f35]/10"><p className="text-4xl">✨</p><h2 className="mt-4 text-2xl font-semibold text-[#173f35]">Ai văzut toate recomandările</h2><p className="mt-3 text-slate-600">Revino când apar profiluri noi compatibile.</p></div>;
  }

  const { profile, score, reasons } = current;
  return <div className="mx-auto w-full max-w-md">
    <article className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-[#173f35]/10">
      <div className="flex h-72 items-end bg-gradient-to-br from-[#173f35] to-[#55927e] p-7 text-white">
        <div><div className="mb-3 flex items-center gap-2"><span className="rounded-full bg-white/20 px-3 py-1 text-sm">{score}% compatibil</span>{profile.is_verified && <span className="rounded-full bg-white/20 px-3 py-1 text-sm">✓ verificat</span>}</div><h2 className="text-4xl font-semibold">{profile.display_name}</h2><p className="mt-1 text-white/80">{getAge(profile.birth_date)} ani · {profile.city}</p></div>
      </div>
      <div className="space-y-5 p-7">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-[#d66c4f]">De ce vă potriviți</p><div className="mt-3 flex flex-wrap gap-2">{reasons.map((reason) => <span key={reason} className="rounded-full bg-[#f0eee9] px-3 py-1.5 text-sm text-slate-600">{reason}</span>)}</div></div>
        <div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-slate-400">Buget</p><p className="mt-1 font-semibold text-[#173f35]">{profile.budget_min}–{profile.budget_max} lei</p></div><div><p className="text-slate-400">Program</p><p className="mt-1 font-semibold text-[#173f35]">{profile.sleep_schedule}</p></div><div><p className="text-slate-400">Studii</p><p className="mt-1 font-semibold text-[#173f35]">{profile.university}</p></div><div><p className="text-slate-400">Interese</p><p className="mt-1 font-semibold text-[#173f35]">{profile.interests?.slice(0, 2).join(", ") || "—"}</p></div></div>
        {profile.bio && <p className="border-l-2 border-[#d66c4f] pl-4 text-sm italic leading-6 text-slate-600">„{profile.bio}”</p>}
        <div className="flex gap-3"><button type="button" onClick={dismiss} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600 transition hover:bg-slate-50">Nu acum</button><Link href={`/chat?with=${profile.id}`} className="flex-1 rounded-xl bg-[#173f35] px-4 py-3 text-center font-semibold text-white transition hover:bg-[#25584b]">Contactează</Link></div>
        <div className="flex justify-center gap-5 text-xs text-slate-400"><button type="button" onClick={() => void moderate("block")} className="hover:text-red-600">Blochează</button><button type="button" onClick={() => void moderate("report")} className="hover:text-red-600">Raportează</button></div>
      </div>
    </article>
    <p className="mt-4 text-center text-sm text-slate-500">{remaining.length} recomandări disponibile</p>
  </div>;
}
