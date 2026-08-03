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
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
          id?: number
        }
        Update: {
          azione?: string
          created_at?: string
          dettagli?: Json | null
          email?: string | null
          entita?: string | null
          entita_id?: string | null
          id?: number
        }
        Relationships: []
      }
      form_contatti: {
        Row: {
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
          amico_cellulare: string | null
          amico_cognome: string | null
          amico_email: string | null
          amico_nome: string | null
          amico_prefisso: string | null
          created_at: string
          cta: string | null
          email_socio: string | null
          fbclid: string | null
          gclid: string | null
          id: string
          pagina: string | null
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
          amico_cellulare?: string | null
          amico_cognome?: string | null
          amico_email?: string | null
          amico_nome?: string | null
          amico_prefisso?: string | null
          created_at?: string
          cta?: string | null
          email_socio?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          pagina?: string | null
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
          amico_cellulare?: string | null
          amico_cognome?: string | null
          amico_email?: string | null
          amico_nome?: string | null
          amico_prefisso?: string | null
          created_at?: string
          cta?: string | null
          email_socio?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          pagina?: string | null
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
      notifiche: {
        Row: {
          a_email: string
          created_at: string
          da_email: string
          id: number
          letta_il: string | null
          messaggio: string
        }
        Insert: {
          a_email: string
          created_at?: string
          da_email: string
          id?: number
          letta_il?: string | null
          messaggio: string
        }
        Update: {
          a_email?: string
          created_at?: string
          da_email?: string
          id?: number
          letta_il?: string | null
          messaggio?: string
        }
        Relationships: []
      }
      staff_users: {
        Row: {
          cognome: string | null
          created_at: string
          email: string
          nome: string | null
          puo_cancellare: boolean
          puo_invitare: boolean
          sezioni_consentite: string[]
        }
        Insert: {
          cognome?: string | null
          created_at?: string
          email: string
          nome?: string | null
          puo_cancellare?: boolean
          puo_invitare?: boolean
          sezioni_consentite?: string[]
        }
        Update: {
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
          id?: number
          lat: number
          lng: number
          tipo: string
        }
        Update: {
          created_at?: string
          distanza_metri?: number
          email?: string
          id?: number
          lat?: number
          lng?: number
          tipo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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

type DefaultSchema = Database["public"]

export type Tables<
  DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]),
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
  Row: infer R
}
  ? R
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
  ? I
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
  ? U
  : never
