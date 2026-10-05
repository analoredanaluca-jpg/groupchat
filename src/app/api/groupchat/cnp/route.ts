import { createHmac } from "node:crypto";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { parseCnp } from "@/lib/cnp";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createSupabaseAdmin(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function digestCnp(cnp: string, secret: string) {
  return createHmac("sha256", secret).update(cnp).digest("hex");
}

export async function POST(request: NextRequest) {
  const userClient = await createClient();
  if (!userClient) return NextResponse.json({ error: "Supabase nu este configurat." }, { status: 503 });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Trebuie să fii autentificat." }, { status: 401 });

  const secret = process.env.CNP_LOOKUP_SECRET;
  const admin = getAdminClient();
  if (!secret || !admin) {
    return NextResponse.json({ error: "Căutarea după CNP nu este configurată pe server." }, { status: 503 });
  }

  let payload: { action?: string; cnp?: string; groupChatId?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }
  const cnp = typeof payload.cnp === "string" ? payload.cnp.trim() : "";
  if (payload.action === "unregister") {
    const [{ error: lookupError }, { error: attemptsError }] = await Promise.all([
      admin.from("profile_cnp_lookup").delete().eq("profile_id", user.id),
      admin.from("profile_cnp_lookup_attempts").delete().eq("user_id", user.id),
    ]);
    if (lookupError || attemptsError) return NextResponse.json({ error: "Setarea de căutare CNP nu a putut fi eliminată." }, { status: 500 });
    return NextResponse.json({ enabled: false });
  }
  if (!/^\d{13}$/.test(cnp)) return NextResponse.json({ error: "Introdu un CNP de 13 cifre." }, { status: 400 });

  if (payload.action === "register") {
    if (!parseCnp(cnp)) return NextResponse.json({ error: "CNP-ul nu este valid." }, { status: 400 });
    const { error } = await admin.from("profile_cnp_lookup").upsert(
      { profile_id: user.id, cnp_digest: digestCnp(cnp, secret), updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    );
    if (error) {
      const status = error.code === "23505" ? 409 : 500;
      return NextResponse.json({ error: status === 409 ? "Acest CNP este deja asociat unui cont." : "Nu s-a putut actualiza identificatorul protejat." }, { status });
    }
    return NextResponse.json({ ok: true });
  }

  if (payload.action !== "lookup" || typeof payload.groupChatId !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.groupChatId)) {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }
  const expiredBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await admin.from("profile_cnp_lookup_attempts").delete().lt("created_at", expiredBefore);
  const { count, error: countError } = await admin
    .from("profile_cnp_lookup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if (countError) return NextResponse.json({ error: "Nu s-a putut verifica limita de căutări." }, { status: 500 });
  if ((count ?? 0) >= 10) return NextResponse.json({ error: "Ai atins limita de 10 căutări pe oră." }, { status: 429 });
  const { error: attemptError } = await admin.from("profile_cnp_lookup_attempts").insert({ user_id: user.id });
  if (attemptError) return NextResponse.json({ error: "Căutarea nu a putut fi înregistrată." }, { status: 500 });

  if (!parseCnp(cnp)) return NextResponse.json({ error: "Nu am găsit un profil eligibil pentru acest CNP." }, { status: 404 });
  const { data: group } = await admin.from("location_group_chats").select("id, city").eq("id", payload.groupChatId).maybeSingle();
  if (!group) return NextResponse.json({ error: "Grupul nu a fost găsit." }, { status: 404 });

  const { data: currentMembership } = await admin
    .from("location_group_chat_members")
    .select("group_chat_id")
    .eq("group_chat_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!currentMembership) return NextResponse.json({ error: "Trebuie să faci parte din grup pentru a invita persoane." }, { status: 403 });

  const { data: lookup } = await admin.from("profile_cnp_lookup").select("profile_id").eq("cnp_digest", digestCnp(cnp, secret)).maybeSingle();
  if (!lookup || lookup.profile_id === user.id) return NextResponse.json({ error: "Nu am găsit un profil eligibil pentru acest CNP." }, { status: 404 });
  const { data: profile } = await admin.from("profiles").select("id, display_name, city").eq("id", lookup.profile_id).maybeSingle();
  if (!profile || profile.city !== group.city) return NextResponse.json({ error: "Nu am găsit un profil eligibil pentru acest CNP." }, { status: 404 });

  const { data: existingMembership } = await admin.from("location_group_chat_members").select("group_chat_id").eq("user_id", profile.id).maybeSingle();
  if (existingMembership) return NextResponse.json({ error: "Această persoană face deja parte dintr-un grup." }, { status: 409 });
  return NextResponse.json({ id: profile.id, displayName: profile.display_name });
}

export async function GET() {
  const userClient = await createClient();
  if (!userClient) return NextResponse.json({ error: "Supabase nu este configurat." }, { status: 503 });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Trebuie să fii autentificat." }, { status: 401 });
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Căutarea după CNP nu este configurată pe server." }, { status: 503 });
  const { data, error } = await admin.from("profile_cnp_lookup").select("profile_id").eq("profile_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Setarea de căutare CNP nu a putut fi citită." }, { status: 500 });
  return NextResponse.json({ enabled: Boolean(data) });
}
