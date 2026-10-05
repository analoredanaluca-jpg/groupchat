import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 403 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase nu este configurat." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Trebuie să fii autentificat." }, { status: 401 });

  let payload: { password?: string; confirmation?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }
  if (payload.confirmation !== "STERGE" || !payload.password) {
    return NextResponse.json({ error: "Confirmă ștergerea și introdu parola contului." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Ștergerea contului nu este configurată pe server." }, { status: 503 });
  }

  const verifier = createSupabaseClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: verified, error: verifyError } = await verifier.auth.signInWithPassword({ email: user.email, password: payload.password });
  if (verifyError || verified.user?.id !== user.id) {
    return NextResponse.json({ error: "Parola nu este corectă." }, { status: 403 });
  }

  const admin = createSupabaseClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return NextResponse.json({ error: "Contul nu a putut fi șters. Contactează echipa de confidențialitate." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
