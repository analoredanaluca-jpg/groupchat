"use client";

import { useRef, useState, type PointerEvent, type TransitionEvent } from "react";
import { useRouter } from "next/navigation";
import { getAge, type Match } from "@/lib/matching";
import { createClient } from "@/lib/supabase/client";

export default function DiscoverClient({ matches, incomingMatchIds, currentUserId }: { matches: Match[]; incomingMatchIds: string[]; currentUserId: string }) {
  const [remaining, setRemaining] = useState(matches);
  const [matchStatus, setMatchStatus] = useState<"idle" | "pending" | "matched">("idle");
  const [matchMessage, setMatchMessage] = useState("");
  const [matchError, setMatchError] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const swipeAction = useRef<"skip" | "match" | null>(null);
  const router = useRouter();
  const current = remaining[0];
  const hasIncomingMatch = current ? incomingMatchIds.includes(current.profile.id) : false;

  function dismiss() {
    setRemaining((items) => items.slice(1));
    setMatchStatus("idle");
    setMatchMessage("");
    setMatchError("");
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (isSwiping || isMatching || (event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    dragStartX.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    if (dragStartX.current === null) return;
    setDragX(event.clientX - dragStartX.current);
  }

  function finishDrag(event: PointerEvent<HTMLElement>) {
    if (dragStartX.current === null) return;
    const offset = event.clientX - dragStartX.current;
    dragStartX.current = null;
    setIsDragging(false);
    setDragX(offset);
    if (offset < -90) {
      swipeAction.current = "skip";
      setIsSwiping(true);
      setDragX(-520);
    } else if (offset > 90 && matchStatus !== "pending") {
      swipeAction.current = "match";
      setIsSwiping(true);
      setDragX(520);
    } else {
      setDragX(0);
    }
  }

  function finishSwipeAnimation(event: TransitionEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || event.propertyName !== "transform" || !swipeAction.current) return;
    const action = swipeAction.current;
    swipeAction.current = null;
    setIsSwiping(false);
    if (action === "skip") {
      dismiss();
      setDragX(0);
    } else {
      void requestMutualMatch();
      setDragX(0);
    }
  }

  function skipWithAnimation() {
    if (isSwiping || isMatching) return;
    swipeAction.current = "skip";
    setIsSwiping(true);
    setDragX(-520);
  }

  async function moderate(action: "block" | "report") {
    if (!current) return;
    const supabase = createClient();
    if (action === "block") {
      await supabase.from("blocked_users").insert({ blocker_id: currentUserId, blocked_user_id: current.profile.id });
      dismiss();
    } else {
      await supabase.from("reports").insert({ reporter_id: currentUserId, reported_id: current.profile.id, reason: "Profil raportat de utilizator" });
      dismiss();
    }
  }

  async function requestMutualMatch() {
    if (!current) return;
    const supabase = createClient();
    setMatchError("");
    setIsMatching(true);

    try {
      const { data: reverseMatch, error: reverseMatchError } = await supabase
        .from("matches")
        .select("status")
        .eq("user_id", current.profile.id)
        .eq("matched_user_id", currentUserId)
        .maybeSingle();

      if (reverseMatchError) throw reverseMatchError;

      if (reverseMatch?.status === "matched") {
        setMatchStatus("matched");
        router.push(`/chat?with=${current.profile.id}`);
        return;
      }

      const { error: upsertError } = await supabase.from("matches").upsert(
        { user_id: currentUserId, matched_user_id: current.profile.id, status: "pending" },
        { onConflict: "user_id,matched_user_id" }
      );

      if (upsertError) throw upsertError;

      const { data: currentStatus, error: currentStatusError } = await supabase
        .from("matches")
        .select("status")
        .eq("user_id", current.profile.id)
        .eq("matched_user_id", currentUserId)
        .maybeSingle();

      if (currentStatusError) throw currentStatusError;

      if (currentStatus && (currentStatus.status === "pending" || currentStatus.status === "matched")) {
        const { error: acceptError } = await supabase.from("matches").upsert([
          { user_id: currentUserId, matched_user_id: current.profile.id, status: "matched" },
          { user_id: current.profile.id, matched_user_id: currentUserId, status: "matched" }
        ], { onConflict: "user_id,matched_user_id" });

        if (acceptError) throw acceptError;
        setMatchStatus("matched");
        setMatchMessage("Ai făcut match! Puteți începe conversația.");
        router.push(`/chat?with=${current.profile.id}`);
        return;
      }

      setMatchStatus("pending");
      setMatchMessage("Cererea de match a fost trimisă. Așteaptă confirmarea celuilalt utilizator.");
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : "Nu s-a putut crea match-ul.");
    } finally {
      setIsMatching(false);
    }
  }

  if (!current) {
    return <div className="rounded-3xl bg-white p-10 text-center shadow-xl shadow-[#173f35]/10"><p className="text-4xl">✨</p><h2 className="mt-4 text-2xl font-semibold text-[#173f35]">Ai văzut toate recomandările</h2><p className="mt-3 text-slate-600">Revino când apar profiluri noi compatibile.</p></div>;
  }

  const { profile, score, reasons } = current;
  const actionLabel = matchStatus === "matched" ? "Deschide chat" : matchStatus === "pending" ? "Așteaptă confirmare" : hasIncomingMatch ? "Acceptă match-ul" : "Trimite match";

  return <div className="relative mx-auto w-full max-w-md" style={{ perspective: 1000 }}>
    {remaining[1] && <div aria-hidden="true" className="pointer-events-none absolute z-0 h-[660px] w-full rounded-3xl border border-[#173f35]/10 bg-white shadow-lg transition-transform duration-300" style={{ transform: `translateY(${14 + Math.min(Math.abs(dragX) * 0.035, 18)}px) scale(${0.96 + Math.min(Math.abs(dragX) * 0.00008, 0.025)}) rotateY(${dragX * -0.08}deg)`, transformOrigin: "50% 50%" }}><div className="h-72 rounded-t-[20px] bg-gradient-to-br from-[#55927e] to-[#b7d8c8]" /><p className="p-7 text-xl font-semibold text-[#173f35]">{remaining[1].profile.display_name}</p></div>}
    <article
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={() => { dragStartX.current = null; setIsDragging(false); setIsSwiping(false); swipeAction.current = null; setDragX(0); }}
      onTransitionEnd={finishSwipeAnimation}
      style={{ transform: `translateX(${dragX}px) rotate(${dragX * 0.035}deg) rotateY(${dragX * -0.08}deg)`, transition: isDragging ? "none" : isSwiping ? "transform 420ms cubic-bezier(.22,.8,.25,1)" : "transform 220ms ease-out", transformOrigin: "50% 50%", transformStyle: "preserve-3d", backfaceVisibility: "hidden", touchAction: "pan-y", zIndex: 1 }}
      className={`relative overflow-hidden rounded-3xl border-4 bg-white shadow-xl shadow-[#173f35]/10 ${hasIncomingMatch ? "border-yellow-400" : "border-transparent"} ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      {Math.abs(dragX) > 35 && <span className={`absolute right-5 top-5 z-10 rounded-xl border-2 px-4 py-2 text-lg font-bold ${dragX > 0 ? "rotate-12 border-emerald-600 text-emerald-700" : "-rotate-12 border-rose-600 text-rose-700"}`}>{dragX > 0 ? "MATCH" : "OMITE"}</span>}
      <div className="flex h-72 items-end bg-gradient-to-br from-[#173f35] to-[#55927e] p-7 text-white">
        <div><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/20 px-3 py-1 text-sm">{score}% compatibil</span>{profile.is_verified && <span className="rounded-full bg-white/20 px-3 py-1 text-sm">✓ verificat</span>}{hasIncomingMatch && <span className="rounded-full bg-yellow-300 px-3 py-1 text-sm font-semibold text-[#173f35]">A dat match cu tine</span>}</div><h2 className="text-4xl font-semibold">{profile.display_name}</h2><p className="mt-1 text-white/80">{getAge(profile.birth_date)} ani · {profile.city}</p></div>
      </div>
      <div className="space-y-5 p-7">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-[#d66c4f]">De ce vă potriviți</p><div className="mt-3 flex flex-wrap gap-2">{reasons.map((reason) => <span key={reason} className="rounded-full bg-[#f0eee9] px-3 py-1.5 text-sm text-slate-600">{reason}</span>)}</div></div>
        <div className="mb-4 rounded-xl border border-[#d66c4f]/30 bg-[#fff4ef] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-[#a8472f]">Cazare</p><p className="mt-1 font-semibold text-[#a8472f]">{{ camin: "Caut cămin", chirie: "Caut chirie", deja_am_chirie: "Am locuință și caut coleg", doar_coleg: "Am locuință și caut coleg" }[profile.accommodation_preference] ?? "—"}</p></div><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-slate-400">Buget</p><p className="mt-1 font-semibold text-[#173f35]">{profile.budget_min}–{profile.budget_max} lei</p></div><div><p className="text-slate-400">Program</p><p className="mt-1 font-semibold text-[#173f35]">{profile.sleep_schedule}</p></div><div><p className="text-slate-400">Studii</p><p className="mt-1 font-semibold text-[#173f35]">{profile.university}</p></div><div><p className="text-slate-400">Interese</p><p className="mt-1 font-semibold text-[#173f35]">{profile.interests?.slice(0, 2).join(", ") || "—"}</p></div></div>
        {profile.bio && <p className="border-l-2 border-[#d66c4f] pl-4 text-sm italic leading-6 text-slate-600">„{profile.bio}”</p>}
        <div className="flex gap-3"><button type="button" onClick={skipWithAnimation} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600 transition hover:bg-slate-50">Nu acum</button><button type="button" onClick={() => void requestMutualMatch()} disabled={isMatching || matchStatus === "pending"} className="flex-1 rounded-xl bg-[#173f35] px-4 py-3 font-semibold text-white transition hover:bg-[#25584b] disabled:cursor-not-allowed disabled:opacity-70">{isMatching ? "Se trimite..." : actionLabel}</button></div>
        {matchMessage && <p className="text-sm text-[#173f35]">{matchMessage}</p>}
        {matchError && <p className="text-sm text-red-700">{matchError}</p>}
        <div className="flex justify-center gap-5 text-xs text-slate-400"><button type="button" onClick={() => void moderate("block")} className="hover:text-red-600">Blochează</button><button type="button" onClick={() => void moderate("report")} className="hover:text-red-600">Raportează</button></div>
      </div>
    </article>
    <p className="mt-3 text-center text-xs text-slate-400">Glisează la stânga pentru a sări sau la dreapta pentru a trimite match.</p>
    <p className="mt-4 text-center text-sm text-slate-500">{remaining.length} recomandări disponibile</p>
  </div>;
}
