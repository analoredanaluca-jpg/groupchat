import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase nu este configurat." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Trebuie să fii autentificat." }, { status: 401 });

  const [profile, outgoingMatches, incomingMatches, messages, posts, blocks, reports, memberships, invitations] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("matches").select("*").eq("user_id", user.id),
    supabase.from("matches").select("*").eq("matched_user_id", user.id),
    supabase.from("messages").select("*").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at", { ascending: true }),
    supabase.from("feed_posts").select("*").eq("author_id", user.id).order("created_at", { ascending: true }),
    supabase.from("blocked_users").select("*").eq("blocker_id", user.id),
    supabase.from("reports").select("*").eq("reporter_id", user.id),
    supabase.from("location_group_chat_members").select("*").eq("user_id", user.id),
    supabase.from("location_group_chat_invitations").select("*").or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`),
  ]);

  const groupIds = (memberships.data ?? []).map((membership) => membership.group_chat_id);
  const groupMessages = groupIds.length
    ? await supabase.from("location_group_chat_messages").select("*").in("group_chat_id", groupIds).order("created_at", { ascending: true })
    : { data: [], error: null };

  const responses = [profile, outgoingMatches, incomingMatches, messages, posts, blocks, reports, memberships, invitations, groupMessages];
  const failed = responses.find((response) => response.error);
  if (failed?.error) return NextResponse.json({ error: "Exportul nu a putut fi pregătit. Încearcă din nou." }, { status: 500 });

  let cnpLookupEnabled = false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) {
    const admin = createSupabaseAdmin(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data } = await admin.from("profile_cnp_lookup").select("profile_id").eq("profile_id", user.id).maybeSingle();
    cnpLookupEnabled = Boolean(data);
  }

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at },
    profile: profile.data,
    cnp_lookup_enabled: cnpLookupEnabled,
    matches: [...(outgoingMatches.data ?? []), ...(incomingMatches.data ?? [])],
    direct_messages: messages.data ?? [],
    feed_posts: posts.data ?? [],
    blocks_created: blocks.data ?? [],
    reports_submitted: reports.data ?? [],
    location_group_memberships: memberships.data ?? [],
    location_group_messages: groupMessages.data ?? [],
    location_group_invitations: invitations.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="roommate-data-export.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
