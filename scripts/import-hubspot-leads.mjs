// Import una tantum dello storico lead HubSpot in lead_hubspot_storico.
// Uso: node --env-file=.env.local scripts/import-hubspot-leads.mjs <percorso-csv>
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Uso: node --env-file=.env.local scripts/import-hubspot-leads.mjs <percorso-csv>')
  process.exit(1)
}

// Parser RFC4180 minimale: gestisce campi quotati con virgole/virgolette/newline interni.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\r') {
      // ignora, il \n che segue chiude la riga
    } else if (c === '\n') {
      row.push(field); field = ''
      rows.push(row); row = []
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

// Converte "M/D/YYYY H:mm" (ora locale Europe/Rome, come esportato da HubSpot) in ISO UTC.
function romeDateToIso(value) {
  if (!value) return null
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const [, mo, d, y, h, mi] = m.map(Number)
  const guessUtcMs = Date.UTC(y, mo - 1, d, h, mi)
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(dtf.formatToParts(new Date(guessUtcMs)).map((p) => [p.type, p.value]))
  const renderedUtcMs = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second)
  return new Date(guessUtcMs + (guessUtcMs - renderedUtcMs)).toISOString()
}

const clean = (v) => (v && v.trim() ? v.trim() : null)

function mapRow(cols, header) {
  const get = (name) => clean(cols[header.indexOf(name)])
  const email = get('Email')
  if (!email) return null
  return {
    email: email.toLowerCase(),
    nome: get('First Name'),
    cognome: get('Last Name'),
    cellulare: get('Mobile Phone Number'),
    telefono: get('Phone Number'),
    citta: get('City'),
    cap: get('Postal Code'),
    country: get('Country/Region'),
    data_acquisizione: romeDateToIso(get('Create Date')),
    fonte_acquisizione: get('Original Traffic Source'),
    fonte_acquisizione_dettaglio_1: get('Original Traffic Source Drill-Down 1'),
    fonte_acquisizione_dettaglio_2: get('Original Traffic Source Drill-Down 2'),
    modulo_origine: get('Record source detail 1'),
    campagna_prima_conversione: get('First Conversion'),
    utm_source: get('utm_source'),
    utm_medium: get('utm_medium'),
    utm_campaign: get('utm_campaign'),
    utm_content: get('utm_content'),
    utm_term: get('utm_term'),
    gclid: get('Google ad click id'),
    fbclid: get('Facebook click id'),
    lifecycle_stage: get('Lifecycle Stage'),
    contact_status: get('Contact status'),
    owner_hubspot: get('Owner'),
    hubspot_record_id_raw: get('Record ID'),
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('Mancano NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Esegui con: node --env-file=.env.local scripts/import-hubspot-leads.mjs <csv>')
    process.exit(1)
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const text = readFileSync(csvPath, 'utf8').replace(/^﻿/, '')
  const table = parseCsv(text)
  const header = table[0]
  const dataRows = table.slice(1).filter((r) => r.length > 1)

  const mapped = []
  let senzaEmail = 0
  for (const cols of dataRows) {
    const row = mapRow(cols, header)
    if (row) mapped.push(row)
    else senzaEmail++
  }

  console.log(`Righe CSV: ${dataRows.length}, mappate: ${mapped.length}, senza email: ${senzaEmail}`)

  const batchSize = 200
  let importate = 0
  for (let i = 0; i < mapped.length; i += batchSize) {
    const batch = mapped.slice(i, i + batchSize)
    const { error } = await supabase
      .from('lead_hubspot_storico')
      .upsert(batch, { onConflict: 'email' })
    if (error) {
      console.error(`Errore batch ${i}-${i + batch.length}:`, error.message)
      process.exit(1)
    }
    importate += batch.length
    console.log(`Importate ${importate}/${mapped.length}`)
  }

  console.log('Import completato.')
}

main()
