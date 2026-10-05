"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type StaffPair = {
  firstId: string;
  firstName: string;
  firstCity: string;
  firstUniversity: string;
  secondId: string;
  secondName: string;
  secondCity: string;
  secondUniversity: string;
};

export default function StaffMatchesClient({ initialPairs }: { initialPairs: StaffPair[] }) {
  const [pairs, setPairs] = useState(initialPairs);
  const [workingPair, setWorkingPair] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function deleteMatch(pair: StaffPair) {
    const key = `${pair.firstId}:${pair.secondId}`;
    if (workingPair) return;
    if (!window.confirm(`Ștergi definitiv match-ul dintre ${pair.firstName} și ${pair.secondName}? Și conversația lor privată va fi ștearsă.`)) return;
    setWorkingPair(key);
    setError("");
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.rpc("staff_delete_match", {
        first_user_id: pair.firstId,
        second_user_id: pair.secondId,
      });
      if (deleteError) throw deleteError;
      setPairs((current) => current.filter((item) => `${item.firstId}:${item.secondId}` !== key));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Match-ul nu a putut fi șters.");
    } finally {
      setWorkingPair(null);
    }
  }

  return <>
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    {pairs.length === 0 ? <section className="rounded-3xl bg-white p-10 text-center shadow-lg shadow-[#173f35]/5"><h2 className="text-xl font-semibold">Nu există match-uri confirmate</h2><p className="mt-2 text-slate-500">Perechile confirmate vor apărea aici.</p></section> : <section className="grid gap-5 md:grid-cols-2">{pairs.map((pair) => {
      const key = `${pair.firstId}:${pair.secondId}`;
      return <article key={key} className="rounded-3xl bg-white p-6 shadow-lg shadow-[#173f35]/5"><p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#d66c4f]">Match confirmat</p><div className="grid grid-cols-2 gap-3">{[[pair.firstId, pair.firstName, pair.firstCity, pair.firstUniversity], [pair.secondId, pair.secondName, pair.secondCity, pair.secondUniversity]].map(([id, name, city, university]) => <a key={id} href={`/staff/profiles/${id}`} className="rounded-2xl border border-slate-100 p-4 transition hover:border-[#d66c4f]/50 hover:bg-[#fffaf7]"><h2 className="font-semibold">{name}</h2><p className="mt-1 text-sm text-slate-500">{city}</p><p className="mt-3 text-xs text-slate-400">{university}</p></a>)}</div><button type="button" onClick={() => void deleteMatch(pair)} disabled={workingPair !== null} className="mt-4 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">{workingPair === key ? "Se șterge..." : "Șterge match-ul și conversația"}</button></article>;
    })}</section>}
  </>;
}
