-- Prenotazioni eventi dal sito: estende iscrizioni_eventi con lo stato della
-- prenotazione, la quota dovuta e la scadenza del pagamento.
--
-- Prima di questa migrazione la tabella era una lista di iscrizioni "già
-- fatte" (popolata a mano/da n8n): non poteva rappresentare un posto occupato
-- in attesa di pagamento, che è ciò che serve al form eventi del sito
-- (il posto si libera se non si paga in cassa entro 48 ore).
--
-- Tutte le colonne sono aggiunte come NULLable: le righe storiche restano
-- valide e vengono lette come 'confermata' (vedi statoDi in lib/eventi.ts).
-- Uso: incollare in Supabase Studio → SQL Editor, oppure via MCP/psql.

alter table public.iscrizioni_eventi
  -- Identifica l'evento in modo stabile: nome_evento è testo libero, cambia
  -- se il marketing rinomina il titolo in TinaCMS e non può fare da chiave
  -- per contare i posti. Lo slug è il nome file in src/content/eventi/.
  add column if not exists evento_slug text,
  -- 'in_attesa_pagamento' | 'confermata' | 'scaduta' | 'annullata'
  -- Solo le prime due occupano un posto (vedi STATI_CHE_OCCUPANO).
  add column if not exists stato text,
  -- Quota dovuta al momento della prenotazione (25 socio / 35 non socio per
  -- EraZen). Congelata sulla riga: se il marketing cambia la quota in
  -- TinaCMS, chi ha già prenotato paga quella pattuita, non la nuova.
  add column if not exists quota numeric,
  -- Istante oltre il quale la prenotazione non pagata decade e il posto
  -- torna disponibile (created_at + ore di scadenza configurate).
  add column if not exists scadenza_pagamento timestamptz,
  add column if not exists pagamento_confermato_da text,
  add column if not exists pagamento_confermato_il timestamptz,
  add column if not exists annullata_da text,
  add column if not exists annullata_il timestamptz,
  -- Lingua del sito da cui è arrivata la prenotazione: serve a n8n per
  -- mandare l'email nella lingua giusta.
  add column if not exists lingua text,
  add column if not exists note text;

-- Le righe già presenti sono iscrizioni storiche, non prenotazioni in attesa.
update public.iscrizioni_eventi set stato = 'confermata' where stato is null;

alter table public.iscrizioni_eventi
  alter column stato set default 'in_attesa_pagamento';

-- Conteggio posti residui: filtra per evento + stato ad ogni apertura del
-- form e ad ogni prenotazione, quindi vale un indice.
create index if not exists iscrizioni_eventi_slug_stato_idx
  on public.iscrizioni_eventi (evento_slug, stato);

-- Una stessa email non può occupare due posti sullo stesso evento: il doppio
-- invio del form (doppio click, refresh) creerebbe due righe e brucerebbe un
-- posto. Vale solo per le prenotazioni vive: dopo un annullamento o una
-- scadenza la persona deve poter riprenotare.
create unique index if not exists iscrizioni_eventi_slug_email_attive_idx
  on public.iscrizioni_eventi (evento_slug, lower(email))
  where stato in ('in_attesa_pagamento', 'confermata');

-- Il cron /api/cron/eventi-scadute cerca per stato + scadenza.
create index if not exists iscrizioni_eventi_scadenza_idx
  on public.iscrizioni_eventi (stato, scadenza_pagamento);
