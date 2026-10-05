# Roommate

MVP web pentru găsirea unui coleg de cameră compatibil în orașele mari din România.

https://groupchat-flax.vercel.app/

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
SUPABASE_SERVICE_ROLE_KEY=cheia-service-role-doar-pe-server
CNP_LOOKUP_SECRET=un-secret-random-lung-pastrat-doar-pe-server
PRIVACY_CONTROLLER_NAME=numele persoanei sau organizatiei care opereaza serviciul
NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL=adresa-pentru-solicitari@example.com
```

Nu folosi cheia `service_role` în frontend și nu o urca în GitHub.
`SUPABASE_SERVICE_ROLE_KEY` și `CNP_LOOKUP_SECRET` sunt folosite numai de ruta server-side pentru identificatorul HMAC al CNP-ului; nu le prefixa cu `NEXT_PUBLIC_`.
Completează și `PRIVACY_CONTROLLER_NAME` și `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL` cu date reale înainte de a pune aplicația la dispoziția publicului.

### 3. Migrații SQL

Rulează în Supabase SQL Editor, în această ordine:

1. `supabase/migrations/001_profiles.sql`
2. `supabase/migrations/002_messages.sql`
3. `supabase/migrations/003_safety.sql`
4. `supabase/migrations/004_realtime.sql`
5. `supabase/migrations/005_matches.sql`
6. `supabase/migrations/006_mutual_match_chat.sql`
7. `supabase/migrations/007_feed_posts.sql`
8. `supabase/migrations/008_accommodation_preference.sql`
9. `supabase/migrations/009_staff_accounts.sql`
10. `supabase/migrations/010_location_groupchats.sql`
11. `supabase/migrations/011_groupchat_cnp_invites.sql`
12. `supabase/migrations/012_gdpr_account_deletion.sql`
13. `supabase/migrations/013_match_cancellation_and_staff_deletion.sql`

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

## Groupchat pe oraș

Există un singur groupchat pentru fiecare oraș, iar constrângerea bazei de date permite fiecărui profil să fie membru într-un singur grup. Utilizatorii pot intra în grupul orașului, pot adăuga direct persoane cu care au un match reciproc în același oraș sau pot trimite o invitație după căutarea CNP-ului. Invitațiile CNP trebuie acceptate de persoana invitată. CNP-ul brut nu este salvat; ruta server-side păstrează doar un HMAC într-o tabelă fără acces pentru rolurile `anon` și `authenticated`. Pentru profilurile create înainte de această funcție, utilizatorul trebuie să-și salveze din nou profilul ca să se înregistreze HMAC-ul. Validarea CNP-ului confirmă formatul și cifra de control, nu identitatea persoanei.

## Siguranță

Aplicația nu stochează CNP și nu afișează public e-mailul sau numărul de telefon. CNP-ul este validat doar în browser și folosit pentru a completa data nașterii și sexul în profil; vârsta este calculată în interfață din data nașterii. Pentru CNP-urile cu prima cifră 7/8, secolul nu este codificat, așa că aplicația estimează cel mai recent an care nu este în viitor. CNP-urile cu prima cifră 9 nu pot completa automat sexul și nu sunt acceptate pentru acest câmp.

Validatorul folosește algoritmul cifrei de control și regulile de decodare descrise în [gist-ul de validare CNP de bandicsongor](https://gist.github.com/bandicsongor/5782245) și în [romanian-personal-identity-code-validator de alceanicu](https://github.com/alceanicu/romanian-personal-identity-code-validator). Aceste proiecte sunt menționate ca surse și inspirație; aplicația implementează local validarea, fără să stocheze sau să trimită CNP-ul.

## Repository

[github.com/analoredanaluca-jpg/groupchat](https://github.com/analoredanaluca-jpg/groupchat)

## Deploy fără rulare locală

Proiectul poate fi importat direct în Vercel din repository-ul GitHub. În Vercel → Project Settings → Environment Variables adaugă:

```env
NEXT_PUBLIC_SUPABASE_URL=https://project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=cheia-publica-anon-sau-publishable
SUPABASE_SERVICE_ROLE_KEY=cheia-service-role-doar-pe-server
CNP_LOOKUP_SECRET=un-secret-random-lung-pastrat-doar-pe-server
```

Vercel va instala automat dependențele și va executa build-ul remote. Rulează mai întâi toate cele patru migrații în Supabase.
