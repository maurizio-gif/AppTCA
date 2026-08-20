// Integrazione PerfectGym: stessa API e stesse credenziali già usate dal
// workflow n8n "2. CONTATTACI: FORM COMPILATO" (nodo "Get Member+Contracts" +
// "ADD LEAD") per i lead arrivati dal sito. Qui si replica la stessa logica
// per i lead inseriti a mano dalla segreteria (vedi creaContattoManuale in
// app/dashboard/contatti/actions.ts), così anche questi risultano su
// PerfectGym come un vero lead, non solo nel CRM interno.
//
// Le credenziali vivono SOLO in variabili d'ambiente (PERFECTGYM_CLIENT_ID/
// SECRET), mai nel codice, mai NEXT_PUBLIC_*: stesso trattamento della
// service role key di Supabase. Import consentito solo da file server-only
// (Server Action), come lib/supabase/serviceClient.ts.

const PGM_BASE = process.env.PERFECTGYM_API_URL ?? 'https://tcambrosiano.perfectgym.com'

// 8s: una chiamata a un'API esterna non deve poter bloccare a lungo il
// salvataggio di un contatto solo perché PerfectGym è lento o giù.
const TIMEOUT_MS = 8000

function headersPgm(): HeadersInit {
  return {
    'X-Client-Id': process.env.PERFECTGYM_CLIENT_ID ?? '',
    'X-Client-Secret': process.env.PERFECTGYM_CLIENT_SECRET ?? '',
  }
}

async function fetchConTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// Stessi 5 esiti del workflow n8n (Switch/Switch1), più "NUOVO" per chi non
// esiste ancora su PerfectGym: le condizioni sono le stesse, nello stesso
// ordine (vedi il nodo Switch: prima "nessun contratto" = mai avuto
// contratto, poi Ended/Freezed/NotStarted, poi qualunque status che
// contenga "C" = Current — condizione larga ma è quella già in uso in
// produzione, non la si "corregge" qui).
export type EsitoPgm = 'NUOVO' | 'MAI AVUTO CONTRATTO' | 'ENDED' | 'SOSPESO' | 'NOT STARTED' | 'CURRENT'

export type RisultatoPgm = {
  pgmMemberId: string | null
  pgmProfileUrl: string | null
  esitoVerificaPgm: EsitoPgm | null
  // Se il match è su un membro/lead già esistente, PerfectGym è la fonte di
  // verità per nome/cognome/cellulare (stessa scelta del workflow n8n): un
  // contatto già in anagrafica lì non deve risultare con un nome diverso
  // solo perché al telefono è stato scritto in un altro modo.
  nomePgm: string | null
  cognomePgm: string | null
  cellularePgm: string | null
  // true se è stato chiamato AddLead ora (nuovo lead appena creato).
  leadCreato: boolean
  // Solo se la chiamata a PerfectGym è fallita del tutto (rete, credenziali,
  // timeout...): chi chiama decide se salvare comunque il contatto nel CRM
  // interno senza il collegamento a PGM, invece di perdere la richiesta.
  errore: string | null
}

function classificaContrattoPgm(status: string | null): EsitoPgm {
  if (!status) return 'MAI AVUTO CONTRATTO'
  if (status.includes('Ended')) return 'ENDED'
  if (status.includes('Freezed')) return 'SOSPESO'
  if (status.includes('NotStarted')) return 'NOT STARTED'
  if (status.includes('C')) return 'CURRENT'
  return 'MAI AVUTO CONTRATTO'
}

type MembroPgm = {
  id: string
  firstName: string | null
  lastName: string | null
  phoneNumber: string | null
  contractStatus: string | null
}

// GET .../odata/Members?$filter=email eq '...' — stessa query, stessi
// parametri di $expand del nodo "Get Member+Contracts" in n8n. Un membro
// senza lastName è trattato come "non esiste" (stesso criterio del nodo
// Switch: la condizione che smista su NUOVO è lastName notExists).
async function cercaMemberPgm(email: string): Promise<MembroPgm | null> {
  const filtro = `email eq '${email.replace(/'/g, "''")}' and isDeleted eq false`
  const expand = `contracts($filter=isAdditionalContract eq false;$orderby=id desc)`
  const url = `${PGM_BASE}/Api/v2.2/odata/Members?$filter=${encodeURIComponent(filtro)}&$expand=${encodeURIComponent(expand)}`

  const risposta = await fetchConTimeout(url, { headers: headersPgm() })
  if (!risposta.ok) throw new Error(`PerfectGym Members: HTTP ${risposta.status}`)

  const dati = await risposta.json()
  const membro = dati?.value?.[0]
  if (!membro || !membro.lastName) return null

  return {
    id: String(membro.id),
    firstName: membro.firstName ?? null,
    lastName: membro.lastName ?? null,
    phoneNumber: membro.phoneNumber ?? null,
    contractStatus: membro.contracts?.[0]?.status ?? null,
  }
}

// inquiredViaId/campaignId "Walk-in" (79/203): un lead inserito dalla
// segreteria per una chiamata non arriva da nessuna campagna tracciata via
// UTM (paid_social/cpc/organico/referral/signage, gli altri codici già
// mappati dal workflow n8n in base a quello): "Walk-in" è la scelta fatta
// per questi contatti, pur non essendo semanticamente perfetta (qui è una
// chiamata, non una persona che si presenta di persona).
const INQUIRED_VIA_MANUALE = 79
const CAMPAIGN_MANUALE = 203
// ClubId e consultantId: stessi valori fissi usati da OGNI lead creato dal
// sito (vedi jsonBody del nodo ADD LEAD in n8n) — non c'è una mappatura
// staff AppTCA -> consulente PerfectGym da poter usare al loro posto.
const CLUB_ID = 1
const CONSULTANT_ID = 165

// POST .../Crm2/AddLead — stesso payload del nodo ADD LEAD in n8n.
async function aggiungiLeadPgm(dati: {
  nome: string
  cognome: string | null
  email: string
  cellulare: string | null
  privacy: boolean
  marketing: boolean
}): Promise<string> {
  const risposta = await fetchConTimeout(`${PGM_BASE}/Api/v2.2/Crm2/AddLead`, {
    method: 'POST',
    headers: { ...headersPgm(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: dati.nome,
      lastName: dati.cognome ?? '',
      email: dati.email,
      phone: (dati.cellulare ?? '').replace(/\s+/g, ''),
      ClubId: CLUB_ID,
      consultantId: CONSULTANT_ID,
      inquiredViaId: INQUIRED_VIA_MANUALE,
      campaignId: CAMPAIGN_MANUALE,
      agreements: [
        { id: 9, hasAgreed: dati.privacy },
        { id: 8, hasAgreed: dati.marketing },
      ],
    }),
  })

  if (!risposta.ok) throw new Error(`PerfectGym AddLead: HTTP ${risposta.status}`)

  const corpo = await risposta.json()
  if (!corpo?.leadId) throw new Error('PerfectGym AddLead: risposta senza leadId')
  return String(corpo.leadId)
}

function urlProfiloPgm(id: string): string {
  return `${PGM_BASE}/pgm/#/Users/${id}/UserProfile`
}

// Punto d'ingresso usato da creaContattoManuale: cerca il contatto su
// PerfectGym e, solo se non esiste ancora, lo crea come nuovo lead — stessa
// logica (cerca poi, solo se manca, crea) del workflow n8n "2. CONTATTACI:
// FORM COMPILATO". Non lancia mai: un fallimento (rete, timeout,
// credenziali) torna come "errore", il chiamante decide se salvare comunque
// il contatto nel CRM interno senza il collegamento a PGM.
export async function sincronizzaPgm(dati: {
  nome: string
  cognome: string | null
  email: string
  cellulare: string | null
  privacy: boolean
  marketing: boolean
}): Promise<RisultatoPgm> {
  const vuoto: RisultatoPgm = {
    pgmMemberId: null,
    pgmProfileUrl: null,
    esitoVerificaPgm: null,
    nomePgm: null,
    cognomePgm: null,
    cellularePgm: null,
    leadCreato: false,
    errore: null,
  }

  try {
    const esistente = await cercaMemberPgm(dati.email)

    if (!esistente) {
      const leadId = await aggiungiLeadPgm(dati)
      return { ...vuoto, pgmMemberId: leadId, pgmProfileUrl: urlProfiloPgm(leadId), esitoVerificaPgm: 'NUOVO', leadCreato: true }
    }

    return {
      ...vuoto,
      pgmMemberId: esistente.id,
      pgmProfileUrl: urlProfiloPgm(esistente.id),
      esitoVerificaPgm: classificaContrattoPgm(esistente.contractStatus),
      nomePgm: esistente.firstName,
      cognomePgm: esistente.lastName,
      cellularePgm: esistente.phoneNumber,
    }
  } catch (e) {
    return { ...vuoto, errore: e instanceof Error ? e.message : 'Errore PerfectGym' }
  }
}
