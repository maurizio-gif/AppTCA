# CRM TCA — esempio Next.js + Supabase

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

## Aggiornamento — grafica e usabilità

- `app/globals.css` con la palette e i font del sito principale (Barlow
  Condensed per i titoli, Barlow per il corpo), caricati con `next/font/google`.
- Sidebar fissa (`app/dashboard/Sidebar.tsx`, client component per evidenziare
  la voce attiva) al posto della barra di navigazione orizzontale, con
  pulsante di logout (`logout` in `app/login/actions.ts`).
- Stat card, tabelle e filtri per stato ristilizzati con classi CSS invece di
  stili inline.

## Aggiornamento — gestione utenti senza Vercel/Supabase Studio

L'allowlist non è più una variabile d'ambiente (`SEGRETERIA_ALLOWLIST`, ora
inutilizzata — puoi rimuoverla da Vercel quando vuoi) ma la tabella
`staff_users` su Supabase. Da `/dashboard/utenti` chi è già dentro può:

- **Invitare** un nuovo utente inserendo nome, cognome ed email: la Server
  Action chiama `supabase.auth.admin.inviteUserByEmail()` (Admin API,
  service role key) che crea l'account Supabase Auth e manda l'email di
  invito, e in parallelo crea la riga in `staff_users` con
  `puo_invitare: true` e tutte le chiavi di `SEZIONI` (`lib/auth/sezioni.ts`)
  in `sezioni_consentite` — di default chi invitiamo ha accesso completo,
  eventuali restrizioni si impostano dopo dalla tabella qui sotto. Ogni
  nuova sezione aggiunta a `SEZIONI` diventa automaticamente selezionabile
  per ogni utente, senza altre modifiche. Nessun passaggio manuale su
  Supabase Studio o Vercel.
- **Rimuovere** un utente (tranne se stesso) — toglie la riga da
  `staff_users`; l'account Supabase Auth resta ma non passa più il check
  di autorizzazione in `lib/auth/allowlist.ts`.

Migrazione richiesta (una tantum, ha bisogno di conferma manuale perché è
una DDL sul DB): vedi `staff_users.sql` — crea la tabella con RLS e inserisce
il primo utente.

## Aggiornamento — fix link email di invito (puntava a localhost)

Il link nell'email di invito puntava a `localhost:3000` perché mancavano
due cose, ora sistemate:

1. **Codice**: `invitaStaff` ora passa `redirectTo` esplicito verso
   `${NEXT_PUBLIC_SITE_URL}/auth/callback`. Nuove pagine:
   - `app/auth/callback/page.tsx` — riceve il link dall'email (gestisce sia
     il formato con token nell'hash sia quello con `?code=`), stabilisce la
     sessione e manda a `/imposta-password`.
   - `app/imposta-password/page.tsx` — form per scegliere la password
     (richiede una sessione attiva, altrimenti torna a `/login`).
2. **Da fare a mano su Supabase** (nessun tool disponibile per farlo da qui):
   Supabase Studio → **Authentication → URL Configuration**:
   - **Site URL**: `https://app-tca-alpha.vercel.app` (o il dominio reale)
   - **Redirect URLs**: aggiungi `https://app-tca-alpha.vercel.app/auth/callback`
     (o un wildcard `https://app-tca-alpha.vercel.app/**`)

   Su Vercel serve anche la nuova env var `NEXT_PUBLIC_SITE_URL` (stesso
   valore del Site URL, senza slash finale) — vedi `.env.local.example`.

Chi era stato invitato prima di questo fix va invitato di nuovo da
"Gestione utenti" (l'upsert su `staff_users` e il reinvio dell'invito sono
entrambi idempotenti, non creano duplicati).

## Aggiornamento — pipeline "Invita un amico" e agenda condivisa

### Da "gestito + nota" a "assegnato a + stato"

Gli inviti non hanno più il solo booleano `gestito`: hanno una **pipeline**
(`lib/pipeline.ts`, unico posto dove vivono stati, transizioni ed etichette,
così portarla anche sulle Enquiries è questione di riusare quel file).

```
nuovo → in_gestione → vinto   (finale)
                    → perso   (finale)
```

- Il **primo che preme «Prendi in gestione» diventa il titolare**
  (`assegnato_a`, `assegnato_il`, letti dall'header `x-tca-user-email` del
  middleware, mai da un valore passato dal client). Da lì in avanti solo lui
  — o un amministratore — può far avanzare il lead.
- Prendere in gestione è **un click**, e lo sono anche vinto e perso: nessuna
  nota obbligatoria da nessuna parte (il campo nota sul lead è stato rimosso).
  Su `perso` resta il solo `motivo_perso`, che serve alle analisi.
- `vinto` e `perso` sono gli stati finali e valorizzano `chiuso_il` (utile per
  i tempi di ciclo in Analytics).
- Il **credito da riconoscere al socio non è uno stato**: riguarda solo i
  referral, quindi è un toggle sulla riga dell'invito
  (`form_invita_amico.credito_caricato`, stesso componente del «Caricato su
  PerfectGym» di Scuola Tennis). Finché è spento, un referral vinto resta **in
  evidenza** nell'elenco ed è l'unico modo per farlo sparire: così un credito
  non si perde per strada. Una pipeline generale non deve portarsi dietro
  l'adempimento di una sola sezione.
- **Amministratore** = chi ha `puo_invitare` (`lib/auth/permessi.ts`): può
  riassegnare un invito e riaprire una gestione chiusa. Se un giorno i due
  ruoli andranno distinti basta una colonna in più su `staff_users` e una
  modifica a quella funzione.
- `gestito/gestito_da/gestito_il` restano scritte, allineate allo stato, solo
  per compatibilità con ciò che le leggeva prima (n8n compreso): lo stato è
  l'unica fonte di verità.

Migrazioni applicate su Supabase: `form_invita_amico_pipeline` (colonne
nuove, vincolo sugli stati, indici e backfill: le righe già "gestite"
entrano come `in_gestione` assegnate a chi le aveva gestite) e
`crea_task_agenda`.

### Agenda condivisa

Nuova tabella `task` e nuova sezione `/dashboard/agenda`. Il **componente**
calendario è uno solo, condiviso con il tab «Appuntamenti richiesti» delle
Enquiries Adulti — ma il **contenuto** delle due viste è diverso di proposito
(vedi l'aggiornamento in fondo). L'Agenda mostra insieme

- gli **appuntamenti prenotati dal sito** (`form_contatti`, in sede o
  telefonici — li classifica `classificaContatto`), e
- gli **appuntamenti e task che le consulenti si fissano** (`task`).

Le tre categorie sono le stesse per entrambe le sorgenti: appuntamento in
sede, appuntamento telefonico, task generico.

File chiave:

```
lib/agenda.ts                          → modello comune delle "voci" (nessun import server-only)
components/CalendarioAgenda.tsx        → il calendario, usato da Agenda e da Enquiries Adulti
app/dashboard/agenda/actions.ts        → crea/completa/annulla/riapri/elimina task
app/dashboard/agenda/VociTask.tsx      → riga task → voce di calendario + pannello di gestione
app/dashboard/contatti/VociAppuntamenti.tsx → riga form_contatti → voce di calendario
```

- `task.entita`/`task.entita_id` sono volutamente generici (`entita_id` in
  `text`, non `uuid`): le tabelle del CRM hanno chiavi di tipo diverso, così
  lo stesso task serve qualsiasi sezione senza altre migrazioni. Entrambe
  nulle = task libero. Oggi la tendina "collega a" propone gli inviti
  ancora aperti.
- L'agenda è **condivisa in lettura**: si vede tutto (nei limiti dei permessi
  di sezione), ma completare/annullare/cancellare un task può farlo chi ce
  l'ha assegnato, chi l'ha creato o un amministratore.
- Gli appuntamenti dal sito compaiono in agenda solo a chi ha accesso alla
  relativa sezione Enquiries (Adulti/Junior), e si gestiscono da lì con lo
  stesso pannello (nota, «Gestito», cancellazione con permesso).
- La sezione `agenda` è stata aggiunta a `SEZIONI` e attivata per tutti gli
  operatori già esistenti (`sezioni_consentite`), altrimenti la voce non
  sarebbe comparsa a nessuno finché un amministratore non la spuntava.

### Durate (per la disponibilità futura)

Ogni voce d'agenda ha una durata in minuti (`task.durata_minuti`), con
default per tipo in `DURATA_PREDEFINITA` (`lib/agenda.ts`):

| tipo | durata |
| :--- | :--- |
| appuntamento in sede | 30 min |
| appuntamento telefonico | 10 min |
| task | 10 min |

Il form propone il default del tipo scelto e lo lascia modificare. Gli
appuntamenti arrivati dal sito non hanno una colonna durata (il form non la
chiede): si assume quella del loro tipo. Serve per il passo successivo —
calcolare la disponibilità da offrire a chi prenota dal sito — quindi una
voce senza durata non è ammessa. In calendario si legge `09:30 - 10:00`.

### Task creati dalla riga di un record

`app/dashboard/agenda/TaskEntita.tsx` è il blocco «In agenda» da mettere
dentro la riga espansa di qualsiasi record: elenca le voci collegate e ne
crea di nuove già agganciate (`entita`/`entita_id`). Oggi è nella sezione
Invita un amico; per usarlo altrove basta passare `entita` ed etichetta
diverse. Il form di creazione è condiviso (`FormTask.tsx`) fra questo blocco
e il pulsante «+ Aggiungi in agenda» del calendario.

Non incluso di proposito (fase successiva): promemoria push/notifica interna
per i task in scadenza — servirebbe un cron esterno (n8n o Vercel Cron) che
chiami una route dedicata.

## Aggiornamento — anagrafica persone, opportunità e agenda collegata

### Il problema

Ogni modulo compilato era un lead a sé. Misurato sui dati reali: **21 persone
avevano già più di una richiesta** (28 righe duplicate su 192 form), quindi la
stessa persona veniva lavorata due volte da due consulenti diverse.

### `persone`: una riga per persona, non per richiesta

Deduplicazione a cascata, fatta dal **database** e non dall'applicazione
(trigger `before insert` su ogni tabella modulo, che chiamano
`trova_o_crea_persona`): così vale per chiunque scriva — n8n, il CRM, un
inserimento a mano da Studio — e non ci si può dimenticare di collegare una
riga.

1. **`pgm_member_id`** — l'identità vera, sopravvive al cambio di email; su
   `form_contatti` è presente sul 97% delle righe.
2. **email normalizzata**.
3. Il **cellulare non unisce** (in famiglia si condivide): finisce fra i
   possibili duplicati da valutare a mano.

I dati mancanti vengono riempiti, quelli già presenti mai sovrascritti:
l'ultimo form non è più attendibile del primo.

**Minori**: esistono in anagrafica come persone collegate al genitore
(`genitore_id`), dedotte da codice fiscale o da genitore + nome + data di
nascita — serviranno per creare le anagrafiche connesse su PerfectGym. Non
entrano nell'indice unico sull'email, perché userebbero quella del genitore.

**Storico HubSpot**: importato in anagrafica con `storico = true`, così la
ricerca trova chi conosciamo già e una nuova richiesta si riconosce come
ritorno. Torna `false` appena la persona si fa viva.

Risultato del backfill: 220 persone attive, 55 minori collegati, 3.979
storiche.

### `opportunita`: la pipeline è della persona

`persona_id`, `stato` (gli stessi di `lib/pipeline.ts`), assegnatario, note,
chiusura. **Una sola opportunità aperta per persona**, garantita da un indice
unico parziale (`where chiuso_il is null`): una nuova richiesta di chi ne ha
già una aperta si aggancia a quella. Solo le sezioni che si lavorano come
pipeline (enquiries e inviti) creano opportunità: Scuola Tennis, Summer Camp
ed eventi sono iscrizioni, hanno il flusso di caricamento su PerfectGym.

Le colonne di stato su `form_invita_amico` restano allineate da un trigger
(`specchia_stato_opportunita`), non dall'applicazione. Su `form_contatti`
invece **no**, di proposito: là `gestito` vuol dire «a questo messaggio ho
risposto», che non è «il lead è in lavorazione» — allinearlo marcherebbe come
gestita una seconda enquiry a cui nessuno ha ancora risposto. Il collegamento
è a senso unico: segnare gestita un'enquiry prende in carico il lead.

### La UX: l'operatore non collega niente

- **Chip identità** su ogni riga (`components/ChipPersona.tsx`): nome, «3
  richieste», e il link alla scheda.
- **Scheda persona** (`/dashboard/persone/[id]`): anagrafica, famiglia, lead
  con la pipeline, agenda, tutte le richieste in ordine di arrivo, visite al
  sito.
- **Task**: creato dalla riga di una richiesta, persona e lead li ricava il
  server da quella richiesta. Creato dall'Agenda, il form segue l'ordine in cui
  si ragiona al telefono: prima **con chi** (`PersonaPicker`, cerca per
  nome/email/cellulare), poi **su cosa** — appena la persona è scelta compaiono
  tutte le sue richieste, **dalla più recente**, con data, modulo e tipo
  (`richiestePersona`); scegliendone una il task si aggancia anche al lead di
  quella richiesta. Solo dopo vengono quando e cosa fare. Il campo persona si
  può lasciare vuoto per un task interno.
- **Possibili duplicati** (`/dashboard/persone/duplicati`): solo le coppie che
  il sistema non unisce da sé, affiancate. Unire (amministratori) sposta
  richieste, lead, task e figli sulla scheda che resta; «Sono persone diverse»
  la fa sparire per sempre (`duplicati_ignorati`).

### Nota sui dati: telefoni dello storico HubSpot

L'import dello storico ha portato dentro telefoni in **notazione scientifica
di Excel** (`3,93E+16`): togliendo i non-cifre restano 5 cifre, e 2.654
persone risultavano avere «lo stesso numero» — 3,8 milioni di finti duplicati.
Ora `norm_cellulare` accetta solo lunghezze plausibili (9-13 cifre) e i valori
inutilizzabili sono stati azzerati sulle schede (il dato originale resta in
`lead_hubspot_storico`). **Restano circa 3.800 persone storiche senza telefono
utilizzabile**: per recuperarli va rifatto l'import dal CSV con la colonna
telefono formattata come testo.

Migrazioni applicate: `crea_persone`, `funzioni_dedup_persone`,
`collega_moduli_a_persone`, `backfill_persone_dai_moduli`, `crea_opportunita`,
`opportunita_trigger_e_specchio`, `enquiries_gestito_muove_opportunita`,
`backfill_opportunita`, `task_persona_e_opportunita`,
`possibili_duplicati_persone`, `pulizia_cellulari_non_validi`,
`specchio_non_tocca_enquiries`.

## Aggiornamento — gestione in evidenza, e gli eventi elencati su richiesta e persona

### La riga espansa ha una gerarchia

Aprire una riga serve a **fare** qualcosa, non a leggere venti campi. L'ordine
del pannello espanso (`components/ExpandableRow.tsx`) ora è:

1. **Contesto** (`evidenza`): cosa ha chiesto la persona, due righe.
2. **Pannello di gestione** (`.pannello-gestione`): tutto ciò su cui si agisce —
   stato del lead, toggle, note, *e l'agenda* — in un contenitore staccato, con
   bordo di accento e sfondo proprio. L'agenda è gestione, non consultazione,
   quindi le `sections` finiscono qui dentro insieme a `extra`.
3. **Consultazione** (`consultazione`): le visite al sito e simili, che si
   guardano e non si usano.
4. **Dati della richiesta**: **chiusi per default**, dietro un «Mostra i dati
   della richiesta (N)», con i parametri tecnici annidati come prima.

La scheda persona segue la stessa gerarchia: lead e agenda in cima nel pannello
in evidenza, anagrafica, famiglia, richieste e visite sotto.

### Più eventi per la stessa richiesta

Una richiesta può generare più eventi nel tempo (una chiamata, poi la visita in
sede), quindi ovunque c'è un **elenco** e non un singolo appuntamento:

- **Sull'enquiry** — blocco «In agenda» dentro la riga, sia nella lista
  Messaggi sia nel calendario Appuntamenti, con gli eventi di *quella* richiesta
  e il pulsante per crearne un altro già collegato.
- **Sull'invito** — lo stesso blocco, come già c'era.
- **Sulla persona** — tutti i suoi eventi, da qualunque richiesta arrivino, con
  l'indicazione di quale (`etichetteCollegamento`).

## Aggiornamento — pipeline anche sulle Enquiries, e riassegnazione con permesso

- **Enquiries (Adulti e Junior)**: la riga espansa ha lo stesso pannello di
  «Invita un amico» — il **lead** con la pipeline in evidenza, poi «Questa
  richiesta» (il vecchio «Gestito» con nota e cancellazione) e «In agenda».
  Nessun credito: quello resta ai referral.
- Perché entrambe le sezioni: il lead è della **persona**, e la stessa persona
  può avere un'enquiry Adulti e una richiesta Junior — sono lo stesso lead.
  Mostrare la pipeline solo su una delle due sembrerebbe un errore.
- **`gestito` resta**, e non è lo stato del lead: su un'enquiry significa «a
  questo messaggio ho risposto». La stessa persona può avere la trattativa in
  gestione e un messaggio nuovo senza risposta, quindi i filtri sono
  «Da rispondere» (il default, il lavoro quotidiano) più gli stati del lead, e
  la riga senza risposta resta evidenziata negli altri filtri. Questo tiene in
  piedi anche il tempo di presa in carico di Analytics, che legge `gestito_il`.
- **Riassegnazione**: in fondo al pannello e chiusa, si apre con un click. La
  vede chi ha il lead in mano (il proprio si passa sempre) e chi ha il nuovo
  permesso **«Può riassegnare i lead»** (`staff_users.puo_riassegnare`,
  assegnabile da Gestione utenti; chi poteva invitare lo ha già).
- Ogni azione della pipeline mostra «Un momento…» mentre gira: una Server
  Action che rinfresca la pagina può metterci un secondo, e senza segnale il
  pulsante sembrava non aver fatto nulla.

Migrazione applicata: `permesso_puo_riassegnare`.

## Aggiornamento — «Opportunità» al posto di «Lead», storico dei passaggi, niente più flag sulla richiesta

### Nomenclatura

Una richiesta dal sito è un'**enquiry**; la trattativa che ne nasce è
un'**opportunità**, ed è della persona. «Lead» è sparito dall'interfaccia.

Gli stati non usano più la parola «nuovo», che si scontrava con
`form_contatti.stato` — il dato verificato su PerfectGym, che vale NUOVO,
NUOVO ADULTO, MAI AVUTO CONTRATTO, ENDED, CURRENT:

| stato (database) | etichetta |
| :--- | :--- |
| `nuovo` | Da prendere in carico |
| `in_gestione` | In gestione |
| `vinto` | Vinta |
| `perso` | Persa |

I valori sul database restano quelli: cambiare le etichette non richiede una
migrazione, e cambiare i valori sì. In tabella «Stato contatto» e
«Opportunità» sono due colonne distinte, di proposito.

### Un solo posto dove si dice se è lavorata

Il flag `gestito` sulle enquiries **non si usa più**: era la stessa cosa detta
due volte («gestito» accanto a «in gestione») e l'operatore doveva ricordarsi
di aggiornare entrambi. Della singola richiesta restano la **nota** di cosa è
stato fatto e la **cancellazione**; lo stato di lavorazione è quello
dell'opportunità.

Conseguenze gestite:

- **Analytics** leggeva `gestito`/`gestito_il` per la presa in carico: ora
  quelle informazioni arrivano dall'opportunità (`conPresaInCarico` in
  `lib/opportunita-server.ts`), scritte sugli stessi campi che la pagina legge
  da sempre — nessuna modifica a `lib/analytics.ts`.
- **Dashboard**: i contatori Enquiries sono «Da prendere in carico» e «In
  gestione», calcolati sulle opportunità.
- Il trigger `gestito_muove_opportunita` è stato rimosso: non aveva più niente
  da intercettare. Le colonne `gestito*` restano con i valori storici.

### Storico dei passaggi

Nuova tabella **`opportunita_storico`**, scritta da un trigger su `opportunita`
(quindi registra anche una modifica fatta da Studio o da n8n): stato
precedente, stato nuovo, titolare in quel momento e chi ha fatto il cambio.
Nel pannello c'è «+ Storico dei passaggi (N)», chiuso per default. Il registro
operatori resta il controllo generale del CRM; questa è la timeline della
singola trattativa.

Le opportunità già esistenti hanno una riga iniziale con lo stato attuale e la
data che conoscevamo: prima di oggi la storia non è ricostruibile, e inventarla
sarebbe peggio che non averla.

### Altro

- **Niente motivo obbligatorio** per segnare persa: è un click, come gli altri
  passaggi. Un motivo già scritto in passato resta visibile.
- **Invita un amico**: l'opportunità è dell'**amico invitato** — è lui il
  soggetto da gestire — e il titolo del pannello lo dice («Opportunità ·
  Mario Rossi»). Il socio resta collegato all'invito e ne conta il credito.
- **Scheda del socio**: nuovo blocco «Amici invitati» con quanti sono, quanti
  si sono iscritti (opportunità vinta) e quanti hanno il credito caricato, con
  il link alla scheda di ciascun amico.

Migrazioni applicate: `storico_opportunita`, `rimuovi_trigger_gestito_enquiry`.

## Aggiornamento — due porte, due mestieri: «Appuntamenti richiesti» e Agenda

Il tab degli appuntamenti nelle Enquiries e l'Agenda mostravano quasi la stessa
cosa (gli stessi task, e gli appuntamenti dal sito con la sola differenza dei
Junior): due porte che sembrano la stessa stanza, dove ogni divergenza diventa
un bug e chi guarda non sa quale sia la vista «vera».

Ora:

- **Enquiries → «Appuntamenti richiesti»**: solo gli appuntamenti che i
  **clienti hanno prenotato dal sito** per quella sezione, nel giorno fissato.
  È una vista dei dati della sezione, come la lista dei Messaggi, e ha la
  ricerca della sezione. Niente form di creazione.
- **Agenda**: il diario condiviso — quegli stessi appuntamenti *più* i task e
  gli appuntamenti interni, di tutte le sezioni, con vista lista e arretrati.

Il guadagno della fusione resta dov'era utile: il componente calendario e il
modello dati (`lib/agenda.ts`) sono uno solo, quindi una correzione vale per
entrambe. Da una richiesta si continua a fissare un evento dal blocco «In
agenda» della sua riga: finisce in Agenda, dove si guarda la giornata.

## Aggiornamento — import una tantum degli eventi futuri dal vecchio CRM (PerfectGym)

Il CRM di PerfectGym non verrà più usato per fissare chiamate e appuntamenti:
gli eventi già in calendario (`Crm2Events`, da oggi in avanti) sono stati
portati in agenda una volta sola. Non c'è nessuna sincronizzazione ricorrente
da mantenere.

**Cosa è arrivato**: 353 eventi, 346 persone, dal 20/08/2026 al 05/07/2027.

**Gli operatori.** In PerfectGym le due consulenti hanno due login ciascuna,
uno disattivato: entrambi vanno sulla stessa persona del CRM.

| login PerfectGym | eventi | operatore |
| --- | --- | --- |
| `briccobono@` (334) + `briccobono2@` (300, disattivo) | 267 | Beatrice Riccobono |
| `fcappelleri@` (331) + `fcappelleri2@` (46, disattivo) | 86 | Francesca Cappelleri |

**Il tipo di voce.** Gli 8 `Meeting` (30 minuti) sono incontri veri in sede →
`appuntamento in sede`. Le 345 `Phone` (5 minuti) **non** erano appuntamenti
telefonici presi col cliente ma la lista delle chiamate del giorno: 270 stanno
nello stesso slot delle 12:00, in un caso 33 nello stesso minuto. Sono quindi
entrate come **task**, per non riempire l'agenda di appuntamenti telefonici
inventati — che sono la base con cui si calcolerà la disponibilità da offrire a
chi prenota dal sito. Durate lasciate come in PerfectGym (5 e 30 minuti). Due
`Meeting` erano a mezzanotte, cioè senza un'ora decisa («DA DEFINIRE»): restano
senza ora, il calendario li mostra come «Tutto il giorno». I 5 eventi senza
oggetto hanno un titolo di ripiego.

**Le persone.** Ogni evento è agganciato a una persona dell'anagrafica, con la
solita deduplicazione (`trova_o_crea_persona`): 49 riconosciute dall'id
PerfectGym, 138 dall'email — quasi tutte erano nello storico HubSpot e ora sono
persone attive, perché hanno una chiamata fissata — e 159 create adesso (fonte
`CRM PerfectGym`). Una non ha email in PerfectGym: esiste comunque, tenuta
insieme dal solo id PerfectGym.

**Le opportunità.** Solo per chi in PerfectGym è `Lead` o `Guest` e non aveva
già un'opportunità aperta: 92 aperte in stato **In gestione**, assegnate alla
consulente dell'evento. Per i 205 `Member` no: una chiamata di scadenza o
rinnovo è retention, non una trattativa, e 205 opportunità finte avrebbero
solo sporcato la pipeline. Il loro task resta agganciato alla persona, dove si
vede dalla sua scheda. In tutto 147 eventi sono finiti sotto un'opportunità.

**Ripetibile senza duplicati.** Ogni task porta la sua provenienza
(`entita = 'pgm_crm2event'`, `entita_id` = id dell'evento, e la nota con
evento/tipo/sottotipo/consulente PerfectGym) e un indice unico parziale
impedisce di inserire due volte lo stesso evento.

## Aggiornamento — un calendario solo, e un impegno si chiude scrivendo com'è andata

Tre cose che si tenevano insieme.

**Un appuntamento prenotato dal sito è una richiesta come le altre.** Le
Enquiries Adulti erano divise in due tab, «Messaggi» e «Appuntamenti
richiesti», e gli appuntamenti si vedevano solo in un calendario. Ma un
appuntamento che il cliente si è fissato da solo è, prima di tutto, una
richiesta da prendere in carico: adesso la sezione è **una lista sola**, in
ordine di arrivo, con la ricerca e i filtri della pipeline per tutti. Il tab e
il calendario di sezione non ci sono più.

**Il calendario è uno solo: l'Agenda.** Due calendari, uno dei quali mostrava
solo un pezzo del lavoro, si contraddicevano appena divergevano — e nel
calendario «da gestire» finivano appuntamenti già avvenuti. Ora il diario
condiviso è uno: `/dashboard/agenda`, con dentro gli appuntamenti dal sito, i
task e gli appuntamenti interni di tutte le sezioni.

**Un impegno si chiude scrivendo com'è andata.** I task lo facevano già
(«Completa» + esito). Ora lo fa anche un appuntamento prenotato dal sito: nuove
colonne `appuntamento_completato_il`, `appuntamento_completato_da`,
`appuntamento_esito` su `form_contatti`, e un pulsante «Segna come fatto» con la
nota. Da quel momento la voce è **verde** e non conta più fra le cose da fare.

Il punto è che *fatto* e *vinto* sono cose diverse: la visita è avvenuta, la
trattativa può restare aperta per settimane. Prima il pallino dell'agenda
seguiva lo stato dell'opportunità, quindi una visita fatta a un cliente ancora
in trattativa restava rossa per sempre. Ora `voceDaContatto` guarda la
chiusura dell'appuntamento, non la pipeline; l'assegnatario continua a venire
dall'opportunità, perché è la trattativa a dire di chi è.

**Chiudere una voce d'agenda lo può fare chiunque**, task e appuntamenti,
anche se sono di una collega: chi risponde al telefono o è in sede al posto di
un'altra deve poter scrivere subito com'è andata, altrimenti l'esito non lo
scrive nessuno e l'agenda si riempie di roba passata. Chi ha chiuso cosa resta
scritto nella voce e nel registro operatori. Resta riservata la sola
*eliminazione* di un task — a chi ce l'ha in mano, a chi l'ha creato o a un
amministratore — perché è irreversibile e non c'è nessuna fretta che la
giustifichi al posto di un collega. Anche nell'elenco compatto dentro la riga
di una richiesta «Completa» chiede prima com'è andata: una nota chiesta dopo è
una nota che non esiste.

**Dati esistenti**: i 26 appuntamenti già passati sono stati segnati come
fatti, con la nota scritta allora come esito (`gestito_il` come data di
chiusura, `gestito_da` come autore). È stata una sistemata una volta sola sui
dati esistenti, non una regola: un appuntamento futuro lo chiude chi lo fa,
altrimenti «passato» diventerebbe sinonimo di «andato bene».

### Nella riga di una richiesta: prima la mossa, poi l'elenco

Il campo «Note su questa richiesta» non c'è più. Era il posto dove si scriveva
cosa si era fatto, ma senza una data e senza un responsabile: quello che resta
da fare adesso si scrive come voce d'agenda, che ha entrambi. Le 130 note già
scritte non sono perse — si leggono fra i dati della richiesta, e per gli
appuntamenti passati sono diventate l'esito.

Al loro posto, **subito sotto i pulsanti dell'opportunità**, ci sono la
chiusura dell'appuntamento e il blocco «In agenda» — con il pulsante per
fissare qualcosa **prima** dell'elenco di quello che è già fissato, perché si
apre la riga per decidere la prossima mossa, non per rileggere lo storico. Il
pannello dell'opportunità li ospita con la stessa prop `dopoAzioni` che in
«Invita un amico» tiene il toggle del credito: la pipeline non sa cosa siano.
Nella riga resta fuori solo «Cancella record», per chi ha il permesso.

## Aggiornamento — Email e WhatsApp in agenda, etichette più corte, chiusura automatica del passato

**Due tipi nuovi.** Oltre ad appuntamento in sede, telefonata e task, ora un
task può essere anche **Email** o **WhatsApp** — solo per quello che le
consulenti si fissano da sole: un contatto dal sito non arriva mai per email
o whatsapp, quindi non tocca `form_contatti`. Colori distinti (ciano e
ambra) e durata di default 5 minuti, il tempo di scrivere un messaggio — non
prenotano un vero slot, quindi non contano per la disponibilità del sito.

**Etichette più corte.** «Appuntamento in sede» → **In sede**, «Appuntamento
telefonico» → **Telefonata**: erano le più lunghe della tabella e si
leggevano peggio delle altre. Il filtro «Solo appuntamenti» dell'Agenda resta
sui due che prenotano davvero uno slot; email e whatsapp finiscono sotto
«Solo task», che è cosa sono davvero.

**Un evento passato o imminente nasce già completato.** Registrare in agenda
qualcosa per un momento già trascorso, o per i prossimi 30 minuti, è quasi
sempre loggare un evento già avvenuto — una telefonata appena fatta, un'email
appena scritta — non fissare del lavoro futuro. Ora `creaTask` lo riconosce
(`eEventoDaCompletareInAutomatico` in `lib/agenda.ts`, che confronta con
l'ora vera di Roma, non quella del server) e la voce nasce già **completata**,
senza dover fare due click (crea, poi completa). Il form segnala quando è
successo, così non sembra un comportamento silenzioso. Vale anche senza
un'ora indicata: allora conta il giorno intero, passato solo se è già finito.
