# Plan de implementare — MVP colegi de cameră

## 1. Obiectiv

Construim în câteva ore un prototip web funcțional pentru orașele mari universitare din România, în care un utilizator își completează profilul, descoperă potențiali colegi de cameră printr-o interfață de tip card/swipe, vede un scor explicabil de compatibilitate și poate începe o conversație.

Produsul se concentrează în MVP exclusiv pe găsirea colegului de cameră. Nu construim încă marketplace pentru locuințe sau integrare reală cu Persona/Veriff.

## Plan executabil pe pași

Ordinea de mai jos este ordinea recomandată pentru implementare. Nu treceți la polish înainte ca pașii 1–7 să funcționeze.

### Pasul 1 — Inițializarea proiectului

Responsabil: Membrul 1

- Creează proiectul Next.js cu TypeScript.
- Instalează și configurează Tailwind CSS.
- Creează proiectul Supabase și adaugă variabilele de mediu.
- Configurează structura de bază: `app`, `components`, `lib` și `types`.
- Verifică faptul că aplicația pornește local și că poate fi publicată pe Vercel.

Rezultat: aplicația pornește și afișează pagina principală.

### Pasul 2 — Autentificarea

Responsabil: Membrul 1

- Activează autentificarea Supabase cu e-mail și parolă.
- Construiește paginile Sign up, Sign in și Sign out.
- Adaugă protecție pentru paginile private.
- După autentificare, verifică dacă utilizatorul are profil complet.

Rezultat: un utilizator real poate crea cont și se poate autentifica.

### Pasul 3 — Baza de date și profilul

Responsabili: Membrii 1 și 2

- Creează tabela `profiles` conform schemei de mai jos.
- Adaugă politici RLS astfel încât utilizatorul să își poată modifica doar propriul profil.
- Construiește formularul de onboarding.
- Include câmpurile obligatorii: nume afișat, vârstă/data nașterii, oraș, gen, preferința de gen, buget minim/maxim, program de somn și interese.
- Salvează și validează datele în Supabase.
- Blochează accesul la Discover până când profilul este complet.

Rezultat: un utilizator real poate finaliza profilul și datele apar în Supabase.

### Pasul 4 — Profiluri demo și date reale de test

Responsabil: Membrul 1, cu ajutorul întregii echipe

- Creați cel puțin 5 profiluri reale sau de test în orașele vizate.
- Folosiți fotografii și date pentru care aveți acordul persoanelor.
- Marcați unele profiluri cu `is_verified = true` pentru demonstrarea badge-ului.
- Verificați combinații diferite de bugete, genuri și programe de somn.

Rezultat: aplicația are suficient conținut pentru ca matching-ul să poată fi demonstrat.

### Pasul 5 — Matching-ul ponderat

Responsabil: Membrul 2

- Exclude profilurile care nu sunt compatibile la preferința de gen.
- Exclude profilurile ale căror intervale de buget nu se intersectează.
- Calculează scorul pentru criteriile rămase.
- Sortează recomandările descrescător după scor.
- Afișează maximum trei explicații pentru scor.
- Testează manual cazurile-limită: bugete care se ating, orașe diferite și preferința „oricare”.

Rezultat: fiecare utilizator vede recomandări ordonate și poate înțelege scorul.

### Pasul 6 — Ecranul Discover și swipe-ul

Responsabil: Membrul 2, cu suportul Membrului 3

- Construiește cardul de profil cu nume, vârstă, oraș, buget, interese, badge și scor.
- Adaugă swipe stânga/dreapta dacă implementarea este stabilă.
- Adaugă obligatoriu butoane vizibile „Ignoră” și „Contactează”, ca alternativă la swipe.
- Ascunde CNP-ul, e-mailul, telefonul și alte date sensibile.
- Adaugă starea „Nu mai există recomandări”.

Rezultat: utilizatorul poate parcurge și selecta colegi de cameră.

### Pasul 7 — Contactarea și chatul

Responsabil: Membrul 3

- Permite inițierea conversației după completarea profilului.
- Creează tabela `messages` și politicile RLS asociate.
- Construiește lista conversațiilor sau o pagină simplă de chat.
- Permite trimiterea și afișarea mesajelor între doi utilizatori.
- Adaugă Realtime doar dacă mesajele funcționează deja fără el.

Rezultat: un utilizator poate contacta direct un alt utilizator și poate primi răspuns.

### Pasul 8 — Siguranță și controlul datelor

Responsabil: Membrul 3

- Adaugă acțiunea „Blochează”.
- Adaugă acțiunea „Raportează”, cu un motiv simplu.
- Exclude utilizatorii blocați din recomandări și chat.
- Adaugă ștergerea contului sau, dacă timpul nu permite, un buton demonstrativ cu confirmare.
- Verifică să nu fie returnate în UI datele sensibile.

Rezultat: aplicația are un minim credibil de siguranță pentru o platformă de conectare între persoane.

### Pasul 9 — Design și experiență

Responsabil: Membrul 3

- Aplică un design coerent pe login, onboarding, Discover și chat.
- Folosește un limbaj centrat pe compatibilitate și co-locuire, nu pe dating.
- Adaugă loading states, mesaje de eroare și empty states.
- Verifică interfața pe desktop și mobil.
- Evidențiază motivele compatibilității, nu doar procentul.

Rezultat: produsul este ușor de înțeles și arată suficient de matur pentru jurizare.

### Pasul 10 — Testarea scenariului de demo

Responsabili: toți membrii

- Creați sau folosiți două conturi reale.
- Completați ambele profiluri.
- Verificați că recomandările respectă genul și bugetul.
- Verificați scorul și explicațiile acestuia.
- Contactați un utilizator și trimiteți mesaje în ambele direcții.
- Testați block/report și verificați că datele sensibile nu apar.
- Pregătiți un fallback cu profiluri demo, în cazul în care autentificarea sau chatul are probleme.

Rezultat: traseul `Sign up → Profil → Recomandări → Scor → Contact → Chat` poate fi prezentat fără intervenții tehnice.

### Pasul 11 — Deploy și prezentare

Responsabil: Membrul 1, cu suportul întregii echipe

- Publicați aplicația pe Vercel.
- Configurați variabilele de mediu în Vercel.
- Verificați Supabase Auth și politicile RLS în producție.
- Testați aplicația de pe două dispozitive sau browsere diferite.
- Pregătiți un pitch de 2–3 minute: problemă, soluție, demo, diferențiere și extensii.

Rezultat: juriul poate accesa aplicația și vede un prototip funcțional.

## Ordinea strictă dacă timpul devine critic

Implementați în această ordine minimă:

1. Next.js + Supabase configurate.
2. Sign up/sign in.
3. Formular de profil.
4. Profiluri în baza de date.
5. Matching după gen și buget.
6. Scor ponderat vizibil.
7. Discover cu carduri și butoane.
8. Chat simplu.
9. Design și deploy.

Swipe-ul real, Realtime, upload-ul fotografiilor, block/report complet și verificarea externă se implementează doar după ce pașii 1–8 sunt stabili.

## 2. Decizii de produs

- Public: studenți și adulți din București, Cluj-Napoca, Iași și alte orașe mari.
- Autentificare: e-mail și parolă prin Supabase Auth.
- Profil obligatoriu înainte de accesul la recomandări și chat.
- Buget: interval minim–maxim lunar.
- Criterii obligatorii pentru afișarea recomandării: preferință de gen compatibilă și intervale de buget care se intersectează.
- Alte criterii: influențează un scor ponderat, fără a bloca recomandarea.
- Contact: utilizatorul poate iniția conversația după completarea profilului; nu este nevoie de accept reciproc.
- Date sensibile: CNP-ul nu este necesar în MVP și nu se stochează. Datele de contact nu sunt afișate public.
- Verificare: badge demonstrativ „Profil verificat”, implementat ca atribut în baza de date; verificarea reală este extensie ulterioară.
- Siguranță: block, report și ștergerea contului, cel puțin la nivel funcțional minimal.

## 3. Fluxul principal pentru demo

1. Utilizatorul creează cont cu e-mail și parolă.
2. Completează profilul: nume afișat, fotografie, oraș, facultate/domeniu, gen și preferință privind genul colegului, interval de buget, program de somn și interese.
3. Aplicația afișează carduri cu potențiali colegi.
4. Fiecare card prezintă numele, vârsta aproximativă, orașul, bugetul, câteva preferințe, badge-ul de verificare și scorul de compatibilitate.
5. Utilizatorul poate face swipe stânga/dreapta sau poate folosi butoane vizibile „Ignoră” și „Contactează”.
6. La contactare se deschide un chat intern.
7. Utilizatorul poate bloca sau raporta profilul.

Scenariul de prezentare: doi utilizatori reali își creează profilurile, văd compatibilitatea, unul inițiază conversația, iar celălalt răspunde.

## 4. Scorul de compatibilitate

Mai întâi filtrăm profilurile care nu respectă criteriile obligatorii. Pentru restul folosim un scor explicabil, de exemplu:

| Criteriu | Pondere |
|---|---:|
| Zona preferată | 25% |
| Compatibilitatea bugetului | 25% |
| Program de somn | 15% |
| Facultate/domeniu | 10% |
| Interese comune | 15% |
| Nivel de organizare / stil de viață | 10% |

Scorul final este media ponderată a criteriilor, exprimată procentual. În interfață afișăm și maximum trei motive, de exemplu: „același oraș”, „buget compatibil”, „program de somn similar”.

Pentru implementarea rapidă, scorul poate fi calculat în frontend sau într-o funcție server-side. Înainte de demo trebuie mutat într-o funcție reutilizabilă, ca aceeași logică să fie folosită la recomandări și la afișarea explicațiilor.

## 5. Arhitectura recomandată

- Framework: Next.js cu TypeScript.
- UI: Tailwind CSS și componente simple, responsive.
- Backend/Bază de date: Supabase.
- Auth: Supabase Auth cu e-mail și parolă.
- Fotografii: Supabase Storage; dacă timpul este critic, folosim avataruri sau URL-uri de imagini pentru demo.
- Chat: tabel `conversations` + tabel `messages`; Realtime Supabase poate fi adăugat dacă rămâne timp.
- Deploy: Vercel pentru aplicație și Supabase pentru backend.

Structura logică:

```text
Next.js UI
   ├── Auth și profil
   ├── Discover/swipe
   ├── Chat
   └── Safety actions
          ↓
Supabase Auth + Database + Storage + Realtime
```

## 6. Schema minimă de date

### `profiles`

- `id` — UUID, legat de utilizatorul din Auth
- `display_name`
- `birth_year` sau `birth_date`
- `city`
- `district` — opțional
- `university`
- `study_field`
- `gender` — masculin/feminin/altă valoare controlată, dacă decideți ulterior
- `preferred_roommate_gender` — masculin/feminin/orice
- `budget_min`
- `budget_max`
- `sleep_schedule`
- `interests` — array de tag-uri
- `organization_level` — opțional
- `bio` — opțional
- `avatar_url` — opțional
- `is_verified`
- `created_at`, `updated_at`

### `messages`

- `id`
- `sender_id`
- `receiver_id`
- `body`
- `created_at`
- `read_at` — opțional

### `blocked_users`

- `blocker_id`
- `blocked_id`
- `created_at`

### `reports`

- `id`
- `reporter_id`
- `reported_id`
- `reason`
- `created_at`

Pentru MVP, conversația poate fi derivată din perechea de utilizatori din `messages`; nu este obligatoriu să existe o tabelă separată `conversations`.

## 7. Plan de lucru pentru 3 membri

### Membrul 1 — infrastructură și date

- Inițializează proiectul Next.js cu TypeScript și Tailwind.
- Creează proiectul Supabase.
- Configurează Auth și schema tabelelor.
- Adaugă politici RLS de bază: utilizatorul își poate modifica profilul și își poate vedea mesajele.
- Pregătește seed data pentru demo, dacă este necesar.

### Membrul 2 — profil și matching

- Construiește formularul de onboarding.
- Construiește editarea profilului.
- Implementează filtrarea obligatorie.
- Implementează calculul scorului ponderat și motivele compatibilității.
- Construiește ecranul Discover cu carduri și swipe/butoane.

### Membrul 3 — UI, chat și siguranță

- Definește designul vizual și componentele comune.
- Construiește chatul intern.
- Adaugă block/report.
- Adaugă stările de loading, empty state și erori.
- Pregătește scenariul de demo și polish-ul vizual.

Toți membrii trebuie să integreze la final într-un singur branch funcțional și să testeze fluxul complet cu două conturi reale.

## 8. Prioritate pentru următoarele ore

### P0 — obligatoriu pentru demo

1. Proiectul pornește local și poate fi publicat.
2. Sign up/sign in cu e-mail și parolă.
3. Onboarding obligatoriu.
4. Salvarea profilului în Supabase.
5. Discover cu minimum 5 profiluri.
6. Filtrarea după gen preferat și buget.
7. Scor de compatibilitate vizibil și explicabil.
8. Inițierea și trimiterea mesajelor.
9. Design coerent pe desktop și mobil.

### P1 — dacă rămâne timp

- Swipe cu gesturi touch reale.
- Realtime pentru chat.
- Upload fotografie în Supabase Storage.
- Block/report complet.
- Badge vizibil de verificare.
- Empty states și onboarding mai elegant.

### P2 — nu implementăm acum

- Persona sau Veriff.
- CNP și stocarea datelor din buletin.
- Marketplace pentru chirii/cămine.
- Notificări push/e-mail.
- Algoritm AI complex.
- Matching reciproc sau sistem de like-uri.

## 9. Criterii de acceptare

MVP-ul este gata pentru jurizare când un utilizator poate parcurge fără intervenție manuală următorul traseu:

```text
Creare cont → Completare profil → Recomandări filtrate
→ Scor explicabil → Contactare → Chat funcțional
```

În timpul prezentării trebuie să fie clar:

- ce problemă rezolvă aplicația;
- de ce compatibilitatea contează mai mult decât o simplă listă de anunțuri;
- cum protejează aplicația datele utilizatorilor;
- cum poate fi extinsă ulterior cu verificare reală, anunțuri de locuințe și recomandări mai inteligente.

## 10. Mesaj pentru jurizare

„Ajutăm oamenii să găsească un coleg de cameră compatibil, nu doar o cameră disponibilă. Utilizatorul vede din start criteriile comune, bugetul compatibil și motivele pentru care merită să înceapă conversația. MVP-ul păstrează datele sensibile private, iar verificarea și funcțiile de siguranță pot crește încrederea pe măsură ce platforma se extinde.”
