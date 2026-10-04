# Roommate

MVP web pentru găsirea unui coleg de cameră compatibil în orașele mari din România.

## Stack

- Next.js + TypeScript
- Tailwind CSS
- Supabase Auth, Database și Realtime
- Deploy recomandat: Vercel

## Pornire locală

### 1. Instalare dependențe

```bash
npm install
```

### 2. Configurare Supabase

Creează un proiect Supabase și copiază `.env.example` în `.env.local`:

```bash
copy .env.example .env.local
```

Completează valorile din Supabase Dashboard → Project Settings → API:

```env
NEXT_PUBLIC_SUPABASE_URL=https://project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=cheia-publica-anon
```

Nu folosi cheia `service_role` în frontend și nu o urca în GitHub.

### 3. Migrații SQL

Rulează în Supabase SQL Editor, în această ordine:

1. `supabase/migrations/001_profiles.sql`
2. `supabase/migrations/002_messages.sql`
3. `supabase/migrations/003_safety.sql`

### 4. Pornire

```bash
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000).

## Fluxul demo

1. Creează două conturi cu e-mail și parolă.
2. Completează profilul pentru fiecare cont.
3. Verifică recomandările și scorul de compatibilitate.
4. Contactează celălalt utilizator.
5. Trimite mesaje în chat.
6. Testează editarea profilului, block și report.

## Structura principală

- `src/app/auth` — autentificare și resetare parolă
- `src/app/onboarding` — creare/editare profil
- `src/app/discover` — recomandări și matching
- `src/app/chat` — conversații private
- `src/lib/matching.ts` — formula scorului de compatibilitate
- `supabase/migrations` — schema bazei de date și politicile RLS

## Matching

Genul preferat și bugetul sunt filtre obligatorii. Pentru profilurile eligibile, scorul este calculat pe baza orașului, bugetului, programului de somn, studiilor, intereselor și nivelului de organizare.

## Siguranță

Aplicația nu stochează CNP și nu afișează public e-mailul sau numărul de telefon. Mesajele, profilurile și acțiunile de block/report sunt protejate prin politici Supabase RLS.

## Repository

[github.com/analoredanaluca-jpg/groupchat](https://github.com/analoredanaluca-jpg/groupchat)
