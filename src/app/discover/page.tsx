import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DiscoverPage() {
  const supabase = await createClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth");
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!profile) redirect("/onboarding");
  }
  return <main className="min-h-screen bg-[#f6f3ee] px-6 py-16"><div className="mx-auto max-w-4xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d66c4f]">Roommate</p><h1 className="mt-3 text-4xl font-semibold text-[#173f35]">Descoperă colegi compatibili</h1><p className="mt-4 max-w-xl text-slate-600">Profilul și recomandările vor fi construite în pașii următori.</p></div></main>;
}
