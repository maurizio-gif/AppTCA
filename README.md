# TCA Segreteria — esempio Next.js + Supabase

App di esempio, **separata dal sito** (che resta statico su Astro/Netlify).
Serve solo a mostrare la meccanica: login riservato + lettura/aggiornamento
delle tabelle Supabase già popolate da n8n.

## Perché un'app separata

Il sito TCA (`WebSite-TCA`) è build statica (`astro build`, nessun adapter
SSR). Un pannello di back-office ha bisogno di route protette da login e di
leggere dati "live" dal DB: questo richiede un runtime server (Next.js su
Vercel), quindi va tenuto in un repo/progetto Vercel a parte, non dentro
`WebSite-TCA`.

## Come funziona (in breve)

1. **Login** (`/login`): la segreteria si autentica con Supabase Auth
   (email + password). Gli account si creano a mano da Supabase Studio
   (Authentication → Users → Invite), non c'è self-signup.
2. **`middleware.ts`**: ad ogni richiesta rinfresca la sessione Supabase nei
   cookie e, se manca, reindirizza a `/login`. Netlify/Astro non c'entra:
   questo gira nel runtime Next.js su Vercel.
3. **Allowlist** (`lib/auth/allowlist.ts`): oltre ad essere autenticato,
   l'utente deve avere l'email nell'elenco segreteria (o un ruolo custom).
   Così anche se qualcuno crea un utente Supabase Auth per sbaglio, non
   vede i dati.
4. **Lettura/scrittura dati**: **mai** dal browser. Le pagine sono Server
   Components che usano `lib/supabase/serviceClient.ts`, un client Supabase
   creato con la **service role key** — l'unica chiave che può leggere le
   tabelle `form_contatti`, `form_scuola_tennis`, `form_invita_amico`,
   dato che oggi hanno RLS attivo ma **nessuna policy** (quindi bloccate per
   `anon`/`authenticated`). La service role key vive SOLO in variabili
   d'ambiente lato server (Vercel → Environment Variables), mai in
   `NEXT_PUBLIC_*`, mai nel bundle client.
5. **Aggiornare uno stato lead** (es. "contattato"): Server Action
   (`app/dashboard/contatti/actions.ts`) — form HTML che invia una POST
   gestita interamente sul server, nessuna API key esposta al client.

## File chiave

```
middleware.ts                          → protegge /dashboard/*, rinfresca sessione
lib/supabase/browserClient.ts          → client "anon", usato SOLO per il login
lib/supabase/serviceClient.ts          → client "service role", usato SOLO nei Server Component/Action
lib/auth/allowlist.ts                  → elenco email segreteria autorizzate
app/login/page.tsx                     → form di login
app/login/actions.ts                   → server action che chiama supabase.auth.signInWithPassword
app/dashboard/layout.tsx               → guardia: sessione valida + email in allowlist
app/dashboard/page.tsx                 → contatori riepilogo per tabella
app/dashboard/contatti/page.tsx        → tabella form_contatti con filtro per stato
app/dashboard/contatti/actions.ts      → server action per cambiare "stato"
```

## Setup locale

```bash
npx create-next-app@latest tca-segreteria --typescript --app --no-tailwind --no-eslint
cd tca-segreteria
npm install @supabase/supabase-js @supabase/ssr
cp .env.local.example .env.local   # poi compila i valori
npm run dev
```

## Variabili d'ambiente

Vedi `.env.local.example`. Su Vercel vanno impostate in
Project Settings → Environment Variables (Production + Preview).
`SUPABASE_SERVICE_ROLE_KEY` **non** deve mai avere il prefisso `NEXT_PUBLIC_`.

## Aggiornamento — RLS sistemato

`iscrizioni_eventi` aveva RLS disabilitato (esposta a chiunque avesse la
anon key): ora RLS è attivo, con una sola policy `FOR ALL TO service_role`
(che di fatto è già l'unico ruolo che bypassa RLS — la policy serve solo a
documentare l'intento). Nessun accesso per `anon`/`authenticated`, stesso
pattern delle altre 3 tabelle. La pagina `/dashboard/iscrizioni-eventi` è
stata aggiunta all'esempio, incluso il link diretto al contratto PerfectGym
(`link_pgm`). `lib/supabase/types.ts` contiene i tipi TypeScript generati
dallo schema reale (`Database`), usati da `serviceClient.ts`.

## Prossimi passi reali (non fatti qui)

- Decidere policy RLS "vere" (alternativa più pulita al service role key:
  policy `FOR SELECT TO authenticated USING (...)` + JWT con custom claim
  "ruolo=segreteria"), così anche eventuali altre app potrebbero leggere
  in modo sicuro senza girare con la service role key.
- Repository e progetto Vercel dedicati (non dentro `WebSite-TCA`) — vedi
  sotto per i passi per crearlo.

## Come procedere per portarlo online (da fare voi, richiede i vostri account)

1. Create un repo GitHub nuovo (es. `tca-segreteria`), separato da
   `WebSite-TCA`, e caricateci il contenuto di questa cartella.
2. Su vercel.com → "Add New Project" → importate quel repo.
3. In Project Settings → Environment Variables impostate le 3 chiavi di
   `.env.local.example` (URL e anon key le trovate in Supabase Studio →
   Project Settings → API; la service role key è nella stessa pagina,
   sezione "service_role" — tenetela segreta).
4. In Supabase Studio → Authentication → Users → "Invite user" create gli
   account della segreteria, e aggiungete le loro email alla variabile
   d'ambiente `SEGRETERIA_ALLOWLIST` (separate da virgola) sia su Vercel
   sia in `.env.local` per lo sviluppo locale.
5. Deploy. Da lì Vercel builda e aggiorna automaticamente ad ogni push.
