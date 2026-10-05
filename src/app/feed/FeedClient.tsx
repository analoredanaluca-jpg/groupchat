"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type FeedPost = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function FeedClient({ initialPosts, userId, userName, accountType }: { initialPosts: FeedPost[]; userId: string; userName: string; accountType: "member" | "staff" }) {
  const [posts, setPosts] = useState(initialPosts);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function publishPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("feed_posts")
        .insert({ author_id: userId, body: trimmed })
        .select("id, author_id, body, created_at")
        .single();
      if (insertError) throw insertError;
      setPosts((current) => [{ ...data, author_name: userName }, ...current]);
      setBody("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Postarea nu a putut fi publicată.");
    } finally {
      setSending(false);
    }
  }

  async function deletePost(postId: string) {
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("feed_posts").delete().eq("id", postId).eq("author_id", userId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPosts((current) => current.filter((post) => post.id !== postId));
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] px-6 py-10 text-[#173f35]">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">Roommate</p>
            <h1 className="mt-2 text-3xl font-semibold">Acasă</h1>
            <p className="mt-2 text-slate-600">Împărtășește o idee, o întrebare sau o opinie.</p>
          </div>
          <nav aria-label="Meniu principal" className="flex flex-wrap gap-2 text-sm font-medium"><a href="/feed" aria-current="page" className="rounded-full bg-[#173f35] px-3 py-2 text-white">Acasă</a>{accountType === "staff" ? <a href="/matches" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Match-uri</a> : <><a href="/discover" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Match</a><a href="/matches" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Conversații</a></>}<a href="/groupchat" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Groupchat</a><a href="/onboarding" className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-white hover:text-[#173f35]">Profil</a></nav>
        </header>

        <form onSubmit={publishPost} className="rounded-3xl bg-white p-5 shadow-xl shadow-[#173f35]/10 sm:p-7">
          <label htmlFor="post-body" className="mb-3 block font-semibold">La ce te gândești?</label>
          <textarea id="post-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} rows={4} placeholder="Scrie un mesaj pentru comunitate..." className="input min-h-32 resize-y" />
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">{body.length}/1000</span>
            <button disabled={sending || !body.trim()} className="rounded-xl bg-[#173f35] px-5 py-3 font-semibold text-white transition hover:bg-[#25584b] disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Se publică..." : "Publică"}</button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        </form>

        <section aria-label="Postări" className="mt-7 space-y-4">
          {posts.length === 0 && <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-lg shadow-[#173f35]/5"><p className="text-lg font-semibold">Feedul e încă gol</p><p className="mt-2 text-slate-500">Fii primul care împărtășește o idee.</p></div>}
          {posts.map((post) => (
            <article key={post.id} className="rounded-3xl bg-white p-5 shadow-lg shadow-[#173f35]/5 sm:p-7">
              <header className="mb-4 flex items-start justify-between gap-4">
                <div><h2 className="font-semibold">{post.author_name}</h2><time dateTime={post.created_at} className="mt-1 block text-xs text-slate-400">{formatDate(post.created_at)}</time></div>
                {post.author_id === userId && <button type="button" onClick={() => void deletePost(post.id)} className="text-sm text-slate-400 hover:text-red-700">Șterge</button>}
              </header>
              <p className="whitespace-pre-wrap break-words leading-7 text-slate-700">{post.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
