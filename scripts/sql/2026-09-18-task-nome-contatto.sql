-- Nome del contatto per i task d'agenda non collegati a una persona in
-- anagrafica (walk-in, club tour, chiamate di chi non e' ancora a sistema).
--
-- Senza una persona_id il task non ha alcun nome strutturato: in agenda si
-- vedeva solo il titolo del task, che spesso e' la categoria della visita
-- ("Club Tour", "Walkin") e non un nome, mentre chi e' davvero il contatto
-- restava sepolto nella nota, quando c'era.
--
-- Colonna facoltativa: le righe gia' presenti restano valide, e in agenda si
-- continua a mostrare il titolo del task quando manca (vedi
-- voceCalendarioDaTask in app/dashboard/agenda/VociTask.tsx).
-- Uso: incollare in Supabase Studio -> SQL Editor, oppure via MCP/psql.

alter table public.task
  add column if not exists nome_contatto text;
