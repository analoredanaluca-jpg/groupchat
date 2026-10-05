"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type GroupChatMessage = { id: string; sender_id: string; body: string; created_at: string };
export type GroupChatPerson = { id: string; displayName: string };
export type GroupChatMember = GroupChatPerson;
export type GroupChatInvitation = { id: string; groupChatId: string; city: string; inviterName: string };

type Props = {
  userId: string;
  city: string;
  isStaff: boolean;
  groupChatId: string | null;
  isMember: boolean;
  members: GroupChatMember[];
  initialMessages: GroupChatMessage[];
  matchedPeople: GroupChatPerson[];
  invitations: GroupChatInvitation[];
};

function appendUnique(messages: GroupChatMessage[], next: GroupChatMessage) {
  if (messages.some((message) => message.id === next.id)) return messages;
  return [...messages, next].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export default function GroupChatClient({ userId, city, isStaff, groupChatId, isMember, members: initialMembers, initialMessages, matchedPeople: initialMatchedPeople, invitations: initialInvitations }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [messages, setMessages] = useState(initialMessages);
  const [matchedPeople, setMatchedPeople] = useState(initialMatchedPeople);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [body, setBody] = useState("");
  const [cnp, setCnp] = useState("");
  const [sending, setSending] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupChatId || !isMember) return;
    const supabase = createClient();
    let active = true;
    const channel = supabase
      .channel(`location-group:${groupChatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_group_chat_messages", filter: `group_chat_id=eq.${groupChatId}` }, (payload) => {
        if (active) setMessages((current) => appendUnique(current, payload.new as GroupChatMessage));
      })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [groupChatId, isMember]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function createGroup() {
    setWorking(true); setError("");
    try {
      const supabase = createClient();
      const { error: createError } = await supabase.rpc("create_location_group_chat");
      if (createError) throw createError;
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Grupul nu a putut fi creat.");
    } finally { setWorking(false); }
  }

  async function joinGroup() {
    if (!groupChatId) return;
    setWorking(true); setError("");
    try {
      const supabase = createClient();
      const { error: joinError } = await supabase.from("location_group_chat_members").insert({ group_chat_id: groupChatId, user_id: userId });
      if (joinError) throw joinError;
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Nu ai putut intra în grup.");
    } finally { setWorking(false); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!groupChatId || !text || sending) return;
    setSending(true); setError("");
    try {
      const supabase = createClient();
      const { data, error: sendError } = await supabase.from("location_group_chat_messages").insert({ group_chat_id: groupChatId, sender_id: userId, body: text }).select("id, sender_id, body, created_at").single();
      if (sendError) throw sendError;
      setMessages((current) => appendUnique(current, data as GroupChatMessage));
      setBody((current) => current.trim() === text ? "" : current);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Mesajul nu a putut fi trimis.");
    } finally { setSending(false); }
  }

  async function addMatchedPerson(person: GroupChatPerson) {
    if (!groupChatId || working) return;
    setWorking(true); setError(""); setNotice("");
    try {
      const supabase = createClient();
      const { error: addError } = await supabase.from("location_group_chat_members").insert({ group_chat_id: groupChatId, user_id: person.id });
      if (addError) throw addError;
      setMembers((current) => [...current, person]);
      setMatchedPeople((current) => current.filter((item) => item.id !== person.id));
      setNotice(`${person.displayName} a fost adăugat(ă) în grup.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Persoana nu a putut fi adăugată.");
    } finally { setWorking(false); }
  }

  async function inviteByCnp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupChatId || working) return;
    setWorking(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/groupchat/cnp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", cnp, groupChatId }),
      });
      const result = await response.json() as { id?: string; displayName?: string; error?: string };
      if (!response.ok || !result.id || !result.displayName) throw new Error(result.error ?? "Profilul nu a putut fi găsit.");

      const supabase = createClient();
      const { error: inviteError } = await supabase.from("location_group_chat_invitations").insert({ group_chat_id: groupChatId, inviter_id: userId, invitee_id: result.id });
      if (inviteError) throw inviteError;
      setCnp("");
      setNotice(`Invitația a fost trimisă către ${result.displayName}. Va trebui să o accepte.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Invitația nu a putut fi trimisă.");
    } finally { setWorking(false); }
  }

  async function respondToInvite(invitation: GroupChatInvitation, accept: boolean) {
    if (working) return;
    setWorking(true); setError("");
    try {
      const supabase = createClient();
      const { error: responseError } = await supabase.rpc("respond_to_location_group_chat_invitation", { invitation_id: invitation.id, accept_invitation: accept });
      if (responseError) throw responseError;
      setInvitations((current) => current.filter((item) => item.id !== invitation.id));
      if (accept) router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Răspunsul nu a putut fi salvat.");
    } finally { setWorking(false); }
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] px-6 py-10 text-[#173f35]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">Roommate</p><h1 className="mt-2 text-3xl font-semibold">Groupchat · {city}</h1><p className="mt-2 text-slate-600">Un grup pentru oamenii din orașul tău.</p></div>
          <nav aria-label="Meniu principal" className="flex flex-wrap gap-2 text-sm font-medium"><a href="/feed" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white">Acasă</a>{isStaff ? <a href="/matches" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white">Match-uri</a> : <><a href="/discover" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white">Match</a><a href="/matches" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white">Conversații</a></>}<a href="/groupchat" aria-current="page" className="rounded-full bg-[#173f35] px-3 py-2 text-white">Groupchat</a><a href="/onboarding" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white">Profil</a></nav>
        </header>

        {invitations.length > 0 && <section className="mb-6 rounded-3xl border border-[#d66c4f]/25 bg-white p-6 shadow-lg shadow-[#173f35]/5"><h2 className="text-lg font-semibold">Invitații primite</h2><div className="mt-4 space-y-3">{invitations.map((invitation) => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#fbfaf7] p-4"><p><span className="font-semibold">{invitation.inviterName}</span> te invită în grupul din {invitation.city}.</p><div className="flex gap-2"><button type="button" disabled={working} onClick={() => void respondToInvite(invitation, true)} className="rounded-xl bg-[#173f35] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Acceptă</button><button type="button" disabled={working} onClick={() => void respondToInvite(invitation, false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Refuză</button></div></div>)}</div></section>}

        {!groupChatId && <section className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-[#173f35]/10"><h2 className="text-xl font-semibold">Creează groupchat-ul pentru {city}</h2><p className="mx-auto mt-2 max-w-lg text-slate-500">Va exista un singur grup pentru fiecare oraș. Poți invita acolo persoane cu care ai făcut match.</p><button type="button" disabled={working} onClick={() => void createGroup()} className="mt-5 rounded-xl bg-[#173f35] px-6 py-3 font-semibold text-white disabled:opacity-50">{working ? "Se creează..." : "Creează grupul orașului"}</button></section>}

        {groupChatId && !isMember && <section className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-[#173f35]/10"><h2 className="text-xl font-semibold">Groupchat-ul din {city} este activ</h2><p className="mt-2 text-slate-500">{members.length} {members.length === 1 ? "membru" : "membri"} · poți face parte dintr-un singur groupchat.</p><button type="button" disabled={working} onClick={() => void joinGroup()} className="mt-5 rounded-xl bg-[#173f35] px-6 py-3 font-semibold text-white disabled:opacity-50">{working ? "Se procesează..." : "Intră în groupchat"}</button></section>}

        {groupChatId && isMember && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-[#173f35]/10">
            <header className="border-b border-slate-100 p-6"><h2 className="text-xl font-semibold">Groupchat · {city}</h2><p className="mt-1 text-sm text-slate-500">{members.length} {members.length === 1 ? "membru" : "membri"}</p></header>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6" role="log" aria-label={`Mesaje în groupchat-ul din ${city}`} aria-live="polite">
              {messages.length === 0 && <p className="py-16 text-center text-slate-500">Scrie primul mesaj în grup.</p>}
              {messages.map((message) => { const sender = members.find((member) => member.id === message.sender_id); const own = message.sender_id === userId; return <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${own ? "rounded-br-sm bg-[#173f35] text-white" : "rounded-bl-sm bg-[#f0eee9] text-[#173f35]"}`}>{!own && <p className="mb-1 text-xs font-semibold">{sender?.displayName ?? "Membru"}</p>}<p className="whitespace-pre-wrap break-words text-sm">{message.body}</p></div></div>; })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="border-t border-slate-100 p-4"><label htmlFor="group-message" className="sr-only">Scrie un mesaj în groupchat</label><div className="flex gap-3"><input id="group-message" value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} placeholder="Scrie un mesaj..." className="input flex-1" /><button type="submit" disabled={sending || !body.trim()} className="rounded-xl bg-[#173f35] px-5 font-semibold text-white disabled:opacity-50">{sending ? "Se trimite..." : "Trimite"}</button></div></form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl bg-white p-6 shadow-lg shadow-[#173f35]/5"><h2 className="font-semibold">Membri</h2><ul className="mt-3 space-y-2">{members.map((member) => <li key={member.id} className="rounded-xl bg-[#fbfaf7] px-3 py-2 text-sm">{member.displayName}{member.id === userId ? " (tu)" : ""}</li>)}</ul></section>
            <section className="rounded-3xl bg-white p-6 shadow-lg shadow-[#173f35]/5"><h2 className="font-semibold">Adaugă un match</h2><p className="mt-1 text-xs text-slate-500">Poți adăuga direct doar un match confirmat care locuiește în {city}.</p>{matchedPeople.length ? <ul className="mt-4 space-y-2">{matchedPeople.map((person) => <li key={person.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#fbfaf7] px-3 py-2 text-sm"><span>{person.displayName}</span><button type="button" disabled={working} onClick={() => void addMatchedPerson(person)} className="rounded-lg bg-[#173f35] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Adaugă</button></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Nu ai match-uri eligibile de adăugat acum.</p>}</section>
            <section className="rounded-3xl bg-white p-6 shadow-lg shadow-[#173f35]/5"><h2 className="font-semibold">Invită după CNP</h2><p className="mt-1 text-xs leading-5 text-slate-500">CNP-ul este folosit pentru căutare protejată. Persoana primește o invitație și trebuie să o accepte.</p><form onSubmit={inviteByCnp} className="mt-4 space-y-3"><label htmlFor="invite-cnp" className="sr-only">CNP-ul persoanei</label><input id="invite-cnp" type="password" inputMode="numeric" autoComplete="off" maxLength={13} value={cnp} onChange={(event) => setCnp(event.target.value.replace(/\D/g, "").slice(0, 13))} placeholder="CNP · 13 cifre" className="input" /><button type="submit" disabled={working || cnp.length !== 13} className="w-full rounded-xl border border-[#173f35]/20 px-4 py-2.5 text-sm font-semibold text-[#173f35] disabled:opacity-50">{working ? "Se procesează..." : "Trimite invitația"}</button></form></section>
          </aside>
        </div>}

        {notice && <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{notice}</p>}
        {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      </div>
    </main>
  );
}
