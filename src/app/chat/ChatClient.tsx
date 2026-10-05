"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
};

type ChatClientProps = {
  userId: string;
  targetId: string;
  targetName: string;
  initialMessages: Message[];
  isCancelled: boolean;
};

function addMessage(messages: Message[], incoming: Message): Message[] {
  if (messages.some((message) => message.id === incoming.id)) return messages;
  return [...messages, incoming].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export default function ChatClient({ userId, targetId, targetName, initialMessages, isCancelled: initiallyCancelled }: ChatClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isCancelled, setIsCancelled] = useState(initiallyCancelled);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsCancelled(initiallyCancelled);
  }, [initiallyCancelled]);

  useEffect(() => {
    if (isCancelled) return;
    let isActive = true;
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${userId}:${targetId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `user_id=eq.${userId}` }, (payload) => {
        const match = payload.new as { matched_user_id?: string; status?: string };
        if (isActive && match.matched_user_id === targetId && match.status === "cancelled") {
          setIsCancelled(true);
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const message = payload.new as Message;
        const isForThisChat =
          (message.sender_id === userId && message.receiver_id === targetId) ||
          (message.sender_id === targetId && message.receiver_id === userId);

        if (isActive && isForThisChat) {
          setMessages((current) => addMessage(current, message));
        }
      })
      .subscribe();

    return () => {
      isActive = false;
      void supabase.removeChannel(channel);
    };
  }, [isCancelled, targetId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody || sending || isCancelled) return;

    setSending(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: sendError } = await supabase
        .from("messages")
        .insert({ sender_id: userId, receiver_id: targetId, body: trimmedBody })
        .select("id, sender_id, receiver_id, body, created_at")
        .single();

      if (sendError) throw sendError;
      setMessages((current) => addMessage(current, data as Message));
      setBody((current) => current.trim() === trimmedBody ? "" : current);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Mesajul nu a putut fi trimis.");
    } finally {
      setSending(false);
    }
  }

  async function cancelMatch() {
    if (isCancelled || cancelling) return;
    if (!window.confirm(`Anulezi match-ul cu ${targetName}? Conversația va rămâne vizibilă, dar nu vei mai putea trimite mesaje.`)) return;
    setCancelling(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: cancelError } = await supabase.rpc("cancel_match", { other_user_id: targetId });
      if (cancelError) throw cancelError;
      setIsCancelled(true);
      router.refresh();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Match-ul nu a putut fi anulat.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl bg-white shadow-xl shadow-[#173f35]/10">
      <header className="border-b border-slate-100 p-6">
        <p className="text-sm text-slate-500">Conversație cu</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#173f35]">{targetName}</h1>
        {!isCancelled && <button type="button" onClick={() => void cancelMatch()} disabled={cancelling} className="mt-4 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">{cancelling ? "Se anulează..." : "Anulează match-ul"}</button>}
        {isCancelled && <p role="status" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">MATCH ANULAT · Conversația este păstrată pentru vizualizare. Mesajele noi sunt dezactivate.</p>}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6" role="log" aria-label={`Mesaje cu ${targetName}`} aria-live="polite">
        {messages.length === 0 && <p className="py-16 text-center text-slate-500">Spune-i „Salut!” și începe conversația.</p>}
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === userId;
          return (
            <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
              <p className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm ${isOwnMessage ? "rounded-br-sm bg-[#173f35] text-white" : "rounded-bl-sm bg-[#f0eee9] text-[#173f35]"}`}>
                {message.body}
              </p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {!isCancelled && <form onSubmit={sendMessage} className="border-t border-slate-100 p-4">
        <label htmlFor="chat-message" className="sr-only">Scrie un mesaj</label>
        <div className="flex gap-3">
          <input
            id="chat-message"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            placeholder="Scrie un mesaj..."
            autoComplete="off"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="rounded-xl bg-[#173f35] px-5 font-semibold text-white transition hover:bg-[#25584b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Se trimite..." : "Trimite"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
      </form>}
    </section>
  );
}
