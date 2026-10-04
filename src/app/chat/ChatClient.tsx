"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = { id: string; sender_id: string; receiver_id: string; body: string; created_at: string };

export default function ChatClient({ userId, targetId, targetName, initialMessages }: { userId: string; targetId: string; targetName: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`messages:${userId}:${targetId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const message = payload.new as Message;
      if ((message.sender_id === userId && message.receiver_id === targetId) || (message.sender_id === targetId && message.receiver_id === userId)) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      }
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [targetId, userId]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true); setError("");
    try {
      const supabase = createClient();
      const { data, error: sendError } = await supabase.from("messages").insert({ sender_id: userId, receiver_id: targetId, body: trimmed }).select().single();
      if (sendError) throw sendError;
      setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
      setBody("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Mesajul nu a putut fi trimis.");
    } finally { setSending(false); }
  }

  return <div className="flex min-h-[70vh] flex-col rounded-3xl bg-white shadow-xl shadow-[#173f35]/10"><header className="border-b border-slate-100 p-6"><p className="text-sm text-slate-500">Conversație cu</p><h1 className="mt-1 text-2xl font-semibold text-[#173f35]">{targetName}</h1></header><div className="flex-1 space-y-3 overflow-y-auto p-6">{messages.length === 0 && <p className="py-16 text-center text-slate-500">Spune-i „Salut!” și începe conversația.</p>}{messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}><p className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${message.sender_id === userId ? "rounded-br-sm bg-[#173f35] text-white" : "rounded-bl-sm bg-[#f0eee9] text-[#173f35]"}`}>{message.body}</p></div>)}</div><form onSubmit={sendMessage} className="border-t border-slate-100 p-4"><div className="flex gap-3"><input value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} placeholder="Scrie un mesaj..." className="input flex-1" /><button disabled={sending || !body.trim()} className="rounded-xl bg-[#173f35] px-5 font-semibold text-white disabled:opacity-50">Trimite</button></div>{error && <p className="mt-2 text-sm text-red-700">{error}</p>}</form></div>;
}
