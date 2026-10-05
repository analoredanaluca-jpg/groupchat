import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedClient, { type FeedPost } from "./FeedClient";

export default async function FeedPage() {
  const supabase = await createClient();
  if (!supabase) {
    return <main className="min-h-screen bg-[#f6f3ee] p-10 text-[#173f35]">Configurează Supabase pentru a activa feedul.</main>;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase.from("profiles").select("display_name, account_type").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const { data: posts, error } = await supabase
    .from("feed_posts")
    .select("id, author_id, body, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const authorIds = [...new Set((posts ?? []).map((post) => post.author_id))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", authorIds)
    : { data: [] };
  const authorNames = new Map((authors ?? []).map((author) => [author.id, author.display_name]));
  const feedPosts: FeedPost[] = (posts ?? []).map((post) => ({
    ...post,
    author_name: authorNames.get(post.author_id) ?? "Utilizator",
  }));

  return <FeedClient initialPosts={feedPosts} userId={user.id} userName={profile.display_name} accountType={profile.account_type ?? "member"} />;
}
