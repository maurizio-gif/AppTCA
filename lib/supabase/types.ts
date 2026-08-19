// Generato da Supabase (mcp__Supabase__generate_typescript_types) sullo
// schema reale del progetto. Rigenerare dopo ogni modifica di schema:
// npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accessi: {
        Row: {
          created_at: string
          id: number
          pagina: string | null
          referrer: string | null
          utm: Json | null
          vid: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          pagina?: string | null
          referrer?: string | null
          utm?: Json | null
          vid?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          pagina?: string | null
          referrer?: string | null
          utm?: Json | null
          vid?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          azione: string
          created_at: string
          dettagli: Json | null
          email: string | null
          entita: string | null
          entita_id: string | null
          id: number
        }
        Insert: {
          azione: string
          created_at?: string
          dettagli?: Json | null
          email?: string | null
          entita?: string | null
          entita_id?: string | null
          id?: never
        }
        Update: {
          azione?: string
          created_at?: string
          dettagli?: Json | null
          email?: string | null
          entita?: string | null
          entita_id?: string | null
          id?: never
        }
        Relationships: []
      }
      duplicati_ignorati: {
        Row: {
          id_a: string
          id_b: string
          ignorato_da: string | null
          ignorato_il: string
        }
        Insert: {
          id_a: string
          id_b: string
          ignorato_da?: string | null
          ignorato_il?: string
        }
        Update: {
          id_a?: string
          id_b?: string
          ignorato_da?: string | null
          ignorato_il?: string
        }
        Relationships: []
      }
      form_contatti: {
        Row: {
          appuntamento_completato_il: string | null
          appuntamento_completato_da: string | null
          appuntamento_esito: string | null
          persona_id: string | null
          opportunita_id: string | null
          attivita: Json | null
          cellulare: string | null
          cognome: string | null
          created_at: string
          cta: string | null
          data_richiesta: string | null
          email: string | null
          esito_verifica_pgm: string | null
          fbclid: string | null
          flow: number | null
          gclid: string | null
          gestito: boolean
          gestito_da: string | null
          gestito_il: string | null
          gruppo_attivita: string | null
          id: string
          is_new_user: boolean | null
          marketing: boolean | null
          motivo: string | null
          nome: string | null
          note: string | null
          ora_richiesta: string | null
          pagina: string | null
          pgm_member_id: string | null
          pgm_profile_url: string | null
          privacy: boolean | null
          stato: string | null
          tipo_richiesta: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_email: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          utm_user_id: string | null
          utm_user_number: string | null
          vid: string | null
        }
        Insert: {
          appuntamento_completato_il?: string | null
          appuntamento_completato_da?: string | null
          appuntamento_esito?: string | null
          persona_id?: string | null
          opportunita_id?: string | null
          attivita?: Json | null
          cellulare?: string | null
          cognome?: string | null
          created_at?: string
          cta?: string | null
          data_richiesta?: string | null
          email?: string | null
          esito_verifica_pgm?: string | null
          fbclid?: string | null
          flow?: number | null
          gclid?: string | null
          gestito?: boolean
          gestito_da?: string | null
          gestito_il?: string | null
          gruppo_attivita?: string | null
          id?: string
          is_new_user?: boolean | null
          marketing?: boolean | null
          motivo?: string | null
          nome?: string | null
          note?: string | null
          ora_richiesta?: string | null
          pagina?: string | null
          pgm_member_id?: string | null
          pgm_profile_url?: string | null
          privacy?: boolean | null
          stato?: string | null
          tipo_richiesta?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_email?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utm_user_id?: string | null
          utm_user_number?: string | null
          vid?: string | null
        }
        Update: {
          appuntamento_completato_il?: string | null
          appuntamento_completato_da?: string | null
          appuntamento_esito?: string | null
          persona_id?: string | null
          opportunita_id?: string | null
          attivita?: Json | null
          cellulare?: string | null
          cognome?: string | null
          created_at?: string
          cta?: string | null
          data_richiesta?: string | null
          email?: string | null
          esito_verifica_pgm?: string | null
          fbclid?: string | null
          flow?: number | null
          gclid?: string | null
          gestito?: boolean
          gestito_da?: string | null
          gestito_il?: string | null
          gruppo_attivita?: string | null
          id?: string
          is_new_user?: boolean | null
          marketing?: boolean | null
          motivo?: string | null
          nome?: string | null
          note?: string | null
          ora_richiesta?: string | null
          pagina?: string | null
          pgm_member_id?: string | null
          pgm_profile_url?: string | null
          privacy?: boolean | null
          stato?: string | null
          tipo_richiesta?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_email?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utm_user_id?: string | null
          utm_user_number?: string | null
          vid?: string | null
        }
        Relationships: []
      }
      form_invita_amico: {
        Row: {
          credito_caricato: boolean
          credito_caricato_da: string | null
          credito_caricato_il: string | null
          persona_id: string | null
          persona_socio_id: string | null
          opportunita_id: string | null
          amico_cellulare: string | null
          amico_cognome: string | null
          amico_email: string | null
          amico_nome: string | null
          amico_prefisso: string | null
          assegnato_a: string | null
          assegnato_il: string | null
          chiuso_il: string | null
          created_at: string
          cta: string | null
          email_socio: string | null
          fbclid: string | null
          gclid: string | null
          gestito: boolean
          gestito_da: string | null
          gestito_il: string | null
          id: string
          motivo_perso: string | null
          note: string | null
          pagina: string | null
          stato: string
          stato_da: string | null
          stato_il: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_email: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          utm_user_id: string | null
          utm_user_number: string | null
          vid: string | null
        }
        Insert: {
          credito_caricato?: boolean
          credito_caricato_da?: string | null
          credito_caricato_il?: string | null
          persona_id?: string | null
          persona_socio_id?: string | null
          opportunita_id?: string | null
          amico_cellulare?: string | null
          amico_cognome?: string | null
          amico_email?: string | null
          amico_nome?: string | null
          amico_prefisso?: string | null
          assegnato_a?: string | null
          assegnato_il?: string | null
          chiuso_il?: string | null
          created_at?: string
          cta?: string | null
          email_socio?: string | null
          fbclid?: string | null
          gclid?: string | null
          gestito?: boolean
          gestito_da?: string | null
          gestito_il?: string | null
          id?: string
          motivo_perso?: string | null
          note?: string | null
          pagina?: string | null
          stato?: string
          stato_da?: string | null
          stato_il?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_email?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utm_user_id?: string | null
          utm_user_number?: string | null
          vid?: string | null
        }
        Update: {
          credito_caricato?: boolean
          credito_caricato_da?: string | null
          credito_caricato_il?: string | null
          persona_id?: string | null
          persona_socio_id?: string | null
          opportunita_id?: string | null
          amico_cellulare?: string | null
          amico_cognome?: string | null
          amico_email?: string | null
          amico_nome?: string | null
          amico_prefisso?: string | null
          assegnato_a?: string | null
          assegnato_il?: string | null
          chiuso_il?: string | null
          created_at?: string
          cta?: string | null
          email_socio?: string | null
          fbclid?: string | null
          gclid?: string | null
          gestito?: boolean
          gestito_da?: string | null
          gestito_il?: string | null
          id?: string
          motivo_perso?: string | null
          note?: string | null
          pagina?: string | null
          stato?: string
          stato_da?: string | null
          stato_il?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_email?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utm_user_id?: string | null
          utm_user_number?: string | null
          vid?: string | null
        }
        Relationships: []
      }
      form_scuola_tennis: {
        Row: {
          persona_id: string | null
          persona_minore_id: string | null
          caricato_pgm: boolean
          caricato_pgm_da: string | null
          caricato_pgm_il: string | null
          compagno_preferito: string | null
          consenso_privacy: boolean | null
          consenso_regolamento: boolean | null
          consenso_termini: boolean | null
          created_at: string
          fbclid: string | null
          frequenza: string | null
          gclid: string | null
          genitore_cellulare: string | null
          genitore_cognome: string | null
          genitore_data_nascita: string | null
          genitore_email: string | null
          genitore_nome: string | null
          giorni: Json | null
          id: string
          indirizzo_cap: string | null
          indirizzo_citta: string | null
          indirizzo_provincia: string | null
          indirizzo_via: string | null
          minore_codice_fiscale: string | null
          minore_cognome: string | null
          minore_data_nascita: string | null
          minore_luogo_nascita: string | null
          minore_nome: string | null
          orari_preferiti: Json | null
          orario_preparazione: string | null
          pagina: string | null
          referrer: string | null
          taglia_felpa: string | null
          taglia_maglietta: string | null
          taglia_pantaloncini: string | null
          tipo_corso: string | null
          tipo_richiesta: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_email: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          utm_user_id: string | null
          utm_user_number: string | null
          vid: string | null
        }
        Insert: {
          persona_id?: string | null
          persona_minore_id?: string | null
          caricato_pgm?: boolean
          caricato_pgm_da?: string | null
          caricato_pgm_il?: string | null
          compagno_preferito?: string | null
          consenso_privacy?: boolean | null
          consenso_regolamento?: boolean | null
          consenso_termini?: boolean | null
          created_at?: string
          fbclid?: string | null
          frequenza?: string | null
          gclid?: string | null
          genitore_cellulare?: string | null
          genitore_cognome?: string | null
          genitore_data_nascita?: string | null
          genitore_email?: string | null
          genitore_nome?: string | null
          giorni?: Json | null
          id?: string
          indirizzo_cap?: string | null
          indirizzo_citta?: string | null
          indirizzo_provincia?: string | null
          indirizzo_via?: string | null
          minore_codice_fiscale?: string | null
          minore_cognome?: string | null
          minore_data_nascita?: string | null
          minore_luogo_nascita?: string | null
          minore_nome?: string | null
          orari_preferiti?: Json | null
          orario_preparazione?: string | null
          pagina?: string | null
          referrer?: string | null
          taglia_felpa?: string | null
          taglia_maglietta?: string | null
          taglia_pantaloncini?: string | null
          tipo_corso?: string | null
          tipo_richiesta?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_email?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utm_user_id?: string | null
          utm_user_number?: string | null
          vid?: string | null
        }
        Update: {
          persona_id?: string | null
          persona_minore_id?: string | null
          caricato_pgm?: boolean
          caricato_pgm_da?: string | null
          caricato_pgm_il?: string | null
          compagno_preferito?: string | null
          consenso_privacy?: boolean | null
          consenso_regolamento?: boolean | null
          consenso_termini?: boolean | null
          created_at?: string
          fbclid?: string | null
          frequenza?: string | null
          gclid?: string | null
          genitore_cellulare?: string | null
          genitore_cognome?: string | null
          genitore_data_nascita?: string | null
          genitore_email?: string | null
          genitore_nome?: string | null
          giorni?: Json | null
          id?: string
          indirizzo_cap?: string | null
          indirizzo_citta?: string | null
          indirizzo_provincia?: string | null
          indirizzo_via?: string | null
          minore_codice_fiscale?: string | null
          minore_cognome?: string | null
          minore_data_nascita?: string | null
          minore_luogo_nascita?: string | null
          minore_nome?: string | null
          orari_preferiti?: Json | null
          orario_preparazione?: string | null
          pagina?: string | null
          referrer?: string | null
          taglia_felpa?: string | null
          taglia_maglietta?: string | null
          taglia_pantaloncini?: string | null
          tipo_corso?: string | null
          tipo_richiesta?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_email?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utm_user_id?: string | null
          utm_user_number?: string | null
          vid?: string | null
        }
        Relationships: []
      }
      form_summer_camp: {
        Row: {
          persona_id: string | null
          persona_minore_id: string | null
          caricato_pgm: boolean
          caricato_pgm_da: string | null
          caricato_pgm_il: string | null
          consenso_certificato_medico: boolean | null
          consenso_privacy: boolean | null
          consenso_regolamento: boolean | null
          created_at: string
          fbclid: string | null
          gclid: string | null
          genitore_cellulare: string | null
          genitore_cognome: string | null
          genitore_email: string | null
          genitore_nome: string | null
          id: string
          indirizzo_cap: string | null
          indirizzo_citta: string | null
          indirizzo_via: string | null
          minore_codice_fiscale: string | null
          minore_cognome: string | null
          minore_data_nascita: string | null
          minore_luogo_nascita: string | null
          minore_nome: string | null
          note_mediche: string | null
          pagina: string | null
          partecipato_anno_scorso: boolean | null
          pre_camp_settimane: Json | null
          referrer: string | null
          settimane: Json | null
          socio_club: boolean | null
          tessera_fitp_numero: string | null
          tesserato_fitp: boolean | null
          utm_campaign: string | null
          utm_content: string | null
          utm_email: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          utm_user_id: string | null
          utm_user_number: string | null
          vid: string | null
        }
        Insert: {
          persona_id?: string | null
          persona_minore_id?: string | null
          caricato_pgm?: boolean
          caricato_pgm_da?: string | null
          caricato_pgm_il?: string | null
          consenso_certificato_medico?: boolean | null
          consenso_privacy?: boolean | null
          consenso_regolamento?: boolean | null
          created_at?: string
          fbclid?: string | null
          gclid?: string | null
          genitore_cellulare?: string | null
          genitore_cognome?: string | null
          genitore_email?: string | null
          genitore_nome?: string | null
          id?: string
          indirizzo_cap?: string | null
          indirizzo_citta?: string | null
          indirizzo_via?: string | null
          minore_codice_fiscale?: string | null
          minore_cognome?: string | null
          minore_data_nascita?: string | null
          minore_luogo_nascita?: string | null
          minore_nome?: string | null
          note_mediche?: string | null
          pagina?: string | null
          partecipato_anno_scorso?: boolean | null
          pre_camp_settimane?: Json | null
          referrer?: string | null
          settimane?: Json | null
          socio_club?: boolean | null
          tessera_fitp_numero?: string | null
          tesserato_fitp?: boolean | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_email?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utm_user_id?: string | null
          utm_user_number?: string | null
          vid?: string | null
        }
        Update: {
          persona_id?: string | null
          persona_minore_id?: string | null
          caricato_pgm?: boolean
          caricato_pgm_da?: string | null
          caricato_pgm_il?: string | null
          consenso_certificato_medico?: boolean | null
          consenso_privacy?: boolean | null
          consenso_regolamento?: boolean | null
          created_at?: string
          fbclid?: string | null
          gclid?: string | null
          genitore_cellulare?: string | null
          genitore_cognome?: string | null
          genitore_email?: string | null
          genitore_nome?: string | null
          id?: string
          indirizzo_cap?: string | null
          indirizzo_citta?: string | null
          indirizzo_via?: string | null
          minore_codice_fiscale?: string | null
          minore_cognome?: string | null
          minore_data_nascita?: string | null
          minore_luogo_nascita?: string | null
          minore_nome?: string | null
          note_mediche?: string | null
          pagina?: string | null
          partecipato_anno_scorso?: boolean | null
          pre_camp_settimane?: Json | null
          referrer?: string | null
          settimane?: Json | null
          socio_club?: boolean | null
          tessera_fitp_numero?: string | null
          tesserato_fitp?: boolean | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_email?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          utm_user_id?: string | null
          utm_user_number?: string | null
          vid?: string | null
        }
        Relationships: []
      }
      iscrizioni_eventi: {
        Row: {
          persona_id: string | null
          cellulare: string | null
          cognome: string | null
          created_at: string | null
          data_compilazione_form: string | null
          data_di_nascita: string | null
          email: string | null
          id: number
          importo_pagato: number | null
          link_pgm: string | null
          nome: string | null
          nome_contratto_pgm: string | null
          nome_evento: string | null
          socio: boolean | null
          stato_contratto_pgm: string | null
        }
        Insert: {
          persona_id?: string | null
          cellulare?: string | null
          cognome?: string | null
          created_at?: string | null
          data_compilazione_form?: string | null
          data_di_nascita?: string | null
          email?: string | null
          id?: number
          importo_pagato?: number | null
          link_pgm?: string | null
          nome?: string | null
          nome_contratto_pgm?: string | null
          nome_evento?: string | null
          socio?: boolean | null
          stato_contratto_pgm?: string | null
        }
        Update: {
          persona_id?: string | null
          cellulare?: string | null
          cognome?: string | null
          created_at?: string | null
          data_compilazione_form?: string | null
          data_di_nascita?: string | null
          email?: string | null
          id?: number
          importo_pagato?: number | null
          link_pgm?: string | null
          nome?: string | null
          nome_contratto_pgm?: string | null
          nome_evento?: string | null
          socio?: boolean | null
          stato_contratto_pgm?: string | null
        }
        Relationships: []
      }
      lead_hubspot_storico: {
        Row: {
          campagna_prima_conversione: string | null
          cap: string | null
          cellulare: string | null
          citta: string | null
          cognome: string | null
          contact_status: string | null
          country: string | null
          data_acquisizione: string | null
          email: string
          fbclid: string | null
          fonte_acquisizione: string | null
          fonte_acquisizione_dettaglio_1: string | null
          fonte_acquisizione_dettaglio_2: string | null
          gclid: string | null
          hubspot_record_id_raw: string | null
          id: number
          importato_il: string
          lifecycle_stage: string | null
          modulo_origine: string | null
          nome: string | null
          owner_hubspot: string | null
          telefono: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          campagna_prima_conversione?: string | null
          cap?: string | null
          cellulare?: string | null
          citta?: string | null
          cognome?: string | null
          contact_status?: string | null
          country?: string | null
          data_acquisizione?: string | null
          email: string
          fbclid?: string | null
          fonte_acquisizione?: string | null
          fonte_acquisizione_dettaglio_1?: string | null
          fonte_acquisizione_dettaglio_2?: string | null
          gclid?: string | null
          hubspot_record_id_raw?: string | null
          id?: never
          importato_il?: string
          lifecycle_stage?: string | null
          modulo_origine?: string | null
          nome?: string | null
          owner_hubspot?: string | null
          telefono?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          campagna_prima_conversione?: string | null
          cap?: string | null
          cellulare?: string | null
          citta?: string | null
          cognome?: string | null
          contact_status?: string | null
          country?: string | null
          data_acquisizione?: string | null
          email?: string
          fbclid?: string | null
          fonte_acquisizione?: string | null
          fonte_acquisizione_dettaglio_1?: string | null
          fonte_acquisizione_dettaglio_2?: string | null
          gclid?: string | null
          hubspot_record_id_raw?: string | null
          id?: never
          importato_il?: string
          lifecycle_stage?: string | null
          modulo_origine?: string | null
          nome?: string | null
          owner_hubspot?: string | null
          telefono?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      notifiche: {
        Row: {
          a_email: string
          allegato_dimensione: number | null
          allegato_nome: string | null
          allegato_path: string | null
          allegato_tipo: string | null
          batch_id: string | null
          created_at: string
          da_email: string
          id: number
          letta_il: string | null
          messaggio: string
        }
        Insert: {
          a_email: string
          allegato_dimensione?: number | null
          allegato_nome?: string | null
          allegato_path?: string | null
          allegato_tipo?: string | null
          batch_id?: string | null
          created_at?: string
          da_email: string
          id?: never
          letta_il?: string | null
          messaggio: string
        }
        Update: {
          a_email?: string
          allegato_dimensione?: number | null
          allegato_nome?: string | null
          allegato_path?: string | null
          allegato_tipo?: string | null
          batch_id?: string | null
          created_at?: string
          da_email?: string
          id?: never
          letta_il?: string | null
          messaggio?: string
        }
        Relationships: []
      }
      opportunita: {
        Row: {
          id: string
          persona_id: string
          stato: string
          assegnato_a: string | null
          assegnato_il: string | null
          stato_da: string | null
          stato_il: string | null
          motivo_perso: string | null
          chiuso_il: string | null
          origine_entita: string | null
          origine_id: string | null
          note: string | null
          creato_il: string
        }
        Insert: {
          id?: string
          persona_id: string
          stato?: string
          assegnato_a?: string | null
          assegnato_il?: string | null
          stato_da?: string | null
          stato_il?: string | null
          motivo_perso?: string | null
          chiuso_il?: string | null
          origine_entita?: string | null
          origine_id?: string | null
          note?: string | null
          creato_il?: string
        }
        Update: {
          id?: string
          persona_id?: string
          stato?: string
          assegnato_a?: string | null
          assegnato_il?: string | null
          stato_da?: string | null
          stato_il?: string | null
          motivo_perso?: string | null
          chiuso_il?: string | null
          origine_entita?: string | null
          origine_id?: string | null
          note?: string | null
          creato_il?: string
        }
        Relationships: []
      }
      opportunita_storico: {
        Row: {
          assegnato_a: string | null
          cambiato_da: string | null
          cambiato_il: string
          id: number
          opportunita_id: string
          stato: string
          stato_precedente: string | null
        }
        Insert: {
          assegnato_a?: string | null
          cambiato_da?: string | null
          cambiato_il?: string
          id?: never
          opportunita_id: string
          stato: string
          stato_precedente?: string | null
        }
        Update: {
          assegnato_a?: string | null
          cambiato_da?: string | null
          cambiato_il?: string
          id?: never
          opportunita_id?: string
          stato?: string
          stato_precedente?: string | null
        }
        Relationships: []
      }
      persone: {
        Row: {
          id: string
          tipo: string
          nome: string | null
          cognome: string | null
          email: string | null
          cellulare: string | null
          cellulare_norm: string | null
          codice_fiscale: string | null
          data_nascita: string | null
          pgm_member_id: string | null
          genitore_id: string | null
          fonte: string | null
          storico: boolean
          creato_il: string
          aggiornato_il: string
        }
        Insert: {
          id?: string
          tipo?: string
          nome?: string | null
          cognome?: string | null
          email?: string | null
          cellulare?: string | null
          cellulare_norm?: string | null
          codice_fiscale?: string | null
          data_nascita?: string | null
          pgm_member_id?: string | null
          genitore_id?: string | null
          fonte?: string | null
          storico?: boolean
          creato_il?: string
          aggiornato_il?: string
        }
        Update: {
          id?: string
          tipo?: string
          nome?: string | null
          cognome?: string | null
          email?: string | null
          cellulare?: string | null
          cellulare_norm?: string | null
          codice_fiscale?: string | null
          data_nascita?: string | null
          pgm_member_id?: string | null
          genitore_id?: string | null
          fonte?: string | null
          storico?: boolean
          creato_il?: string
          aggiornato_il?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          email: string
          endpoint: string
          id: number
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          email: string
          endpoint: string
          id?: never
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          email?: string
          endpoint?: string
          id?: never
          p256dh?: string
        }
        Relationships: []
      }
      staff_users: {
        Row: {
          puo_riassegnare: boolean
          cognome: string | null
          created_at: string
          email: string
          nome: string | null
          puo_cancellare: boolean
          puo_invitare: boolean
          sezioni_consentite: string[]
        }
        Insert: {
          puo_riassegnare?: boolean
          cognome?: string | null
          created_at?: string
          email: string
          nome?: string | null
          puo_cancellare?: boolean
          puo_invitare?: boolean
          sezioni_consentite?: string[]
        }
        Update: {
          puo_riassegnare?: boolean
          cognome?: string | null
          created_at?: string
          email?: string
          nome?: string | null
          puo_cancellare?: boolean
          puo_invitare?: boolean
          sezioni_consentite?: string[]
        }
        Relationships: []
      }
      task: {
        Row: {
          persona_id: string | null
          opportunita_id: string | null
          assegnato_a: string
          completato_il: string | null
          created_at: string
          creato_da: string
          data: string
          durata_minuti: number
          entita: string | null
          entita_id: string | null
          esito: string | null
          id: string
          note: string | null
          ora: string | null
          stato: string
          tipo: string
          titolo: string
        }
        Insert: {
          persona_id?: string | null
          opportunita_id?: string | null
          assegnato_a: string
          completato_il?: string | null
          created_at?: string
          creato_da: string
          data: string
          durata_minuti?: number
          entita?: string | null
          entita_id?: string | null
          esito?: string | null
          id?: string
          note?: string | null
          ora?: string | null
          stato?: string
          tipo?: string
          titolo: string
        }
        Update: {
          persona_id?: string | null
          opportunita_id?: string | null
          assegnato_a?: string
          completato_il?: string | null
          created_at?: string
          creato_da?: string
          data?: string
          durata_minuti?: number
          entita?: string | null
          entita_id?: string | null
          esito?: string | null
          id?: string
          note?: string | null
          ora?: string | null
          stato?: string
          tipo?: string
          titolo?: string
        }
        Relationships: []
      }
      timbrature: {
        Row: {
          created_at: string
          distanza_metri: number
          email: string
          id: number
          lat: number
          lng: number
          tipo: string
        }
        Insert: {
          created_at?: string
          distanza_metri: number
          email: string
          id?: never
          lat: number
          lng: number
          tipo: string
        }
        Update: {
          created_at?: string
          distanza_metri?: number
          email?: string
          id?: never
          lat?: number
          lng?: number
          tipo?: string
        }
        Relationships: []
      }
    }
    Views: {
      possibili_duplicati: {
        Row: {
          id_a: string | null
          id_b: string | null
          motivo: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
