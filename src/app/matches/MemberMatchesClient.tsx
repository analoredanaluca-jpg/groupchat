export type MemberConversation = {
  id: string;
  displayName: string;
  status: "matched" | "cancelled";
};

export default function MemberMatchesClient({ conversations }: { conversations: MemberConversation[] }) {
  const active = conversations.filter((conversation) => conversation.status === "matched");
  const cancelled = conversations.filter((conversation) => conversation.status === "cancelled");

  function renderConversation(conversation: MemberConversation) {
    const isCancelled = conversation.status === "cancelled";
    return <article key={conversation.id} className={`rounded-2xl border p-5 ${isCancelled ? "border-red-200 bg-red-50/70" : "border-slate-100 bg-white"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{conversation.displayName}</h3><p className={`mt-1 text-xs font-semibold uppercase tracking-wide ${isCancelled ? "text-red-700" : "text-emerald-700"}`}>{isCancelled ? "Match anulat · conversație păstrată" : "Match confirmat"}</p></div><a href={`/chat?with=${conversation.id}`} className={`rounded-xl px-4 py-2 text-sm font-semibold ${isCancelled ? "border border-red-200 text-red-800 hover:bg-red-100" : "bg-[#173f35] text-white hover:bg-[#25584b]"}`}>{isCancelled ? "Vezi conversația" : "Deschide chat-ul"}</a></div>{isCancelled && <p className="mt-3 text-sm text-red-800">Mesajele vechi pot fi citite. Trimiterea mesajelor noi este dezactivată.</p>}</article>;
  }

  return <div className="space-y-8">
    <section><h2 className="mb-4 text-lg font-semibold">Conversații active <span className="text-sm font-normal text-slate-400">({active.length})</span></h2>{active.length ? <div className="space-y-3">{active.map(renderConversation)}</div> : <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">Nu ai conversații active acum.</p>}</section>
    <section><h2 className="mb-4 text-lg font-semibold text-red-800">Match-uri anulate <span className="text-sm font-normal text-red-500">({cancelled.length})</span></h2>{cancelled.length ? <div className="space-y-3">{cancelled.map(renderConversation)}</div> : <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">Match-urile anulate vor rămâne aici, iar conversațiile lor vor putea fi citite.</p>}</section>
  </div>;
}
