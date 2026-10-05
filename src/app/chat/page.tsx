import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatClient from "./ChatClient";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const targetId = (await searchParams).with;
  if (!targetId) redirect("/discover");
  const supabase = await createClient();
  if (!supabase) return <main className="min-h-screen bg-[#f6f3ee] p-10 text-[#173f35]">Configurează Supabase pentru a activa chatul.</main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: target } = await supabase.from("profiles").select("display_name").eq("id", targetId).maybeSingle();
  if (!target) redirect("/discover");

  const [outgoingMatch, incomingMatch] = await Promise.all([
    supabase
      .from("matches")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("matched_user_id", targetId)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("id, status")
      .eq("user_id", targetId)
      .eq("matched_user_id", user.id)
      .maybeSingle(),
  ]);

  const activeMatch = outgoingMatch.data?.status === "matched" && incomingMatch.data?.status === "matched";
  const cancelledMatch = outgoingMatch.data?.status === "cancelled" && incomingMatch.data?.status === "cancelled";
  if (outgoingMatch.error || incomingMatch.error || (!activeMatch && !cancelledMatch)) {
    redirect("/discover");
  }

  const { data: messages } = await supabase.from("messages").select("id, sender_id, receiver_id, body, created_at").or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${user.id})`).order("created_at", { ascending: true });
  return <main className="min-h-screen bg-[#f6f3ee] px-6 py-10 text-[#173f35]"><div className="mx-auto max-w-2xl"><a href="/matches" className="mb-6 inline-block text-sm text-slate-500 hover:text-[#173f35]">← Înapoi la conversații</a><ChatClient userId={user.id} targetId={targetId} targetName={target.display_name} initialMessages={messages ?? []} isCancelled={cancelledMatch} /></div></main>;
}
