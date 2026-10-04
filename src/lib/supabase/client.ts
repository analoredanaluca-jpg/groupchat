import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase nu este configurat. Copiază .env.example în .env.local și adaugă valorile proiectului Supabase.",
    );
  }

  return createBrowserClient(url, anonKey);
}
