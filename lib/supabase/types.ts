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
        Relationships: [
          {
            foreignKeyName: "duplicati_ignorati_id_a_fkey"
            columns: ["id_a"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicati_ignorati_id_a_fkey"
            columns: ["id_a"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "duplicati_ignorati_id_a_fkey"
            columns: ["id_a"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
          {
            foreignKeyName: "duplicati_ignorati_id_b_fkey"
            columns: ["id_b"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicati_ignorati_id_b_fkey"
            columns: ["id_b"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "duplicati_ignorati_id_b_fkey"
            columns: ["id_b"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
        ]
      }
      form_contatti: {
        Row: {
          appuntamento_completato_da: string | null
          appuntamento_completato_il: string | null
          appuntamento_esito: string | null
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
          opportunita_id: string | null
          ora_richiesta: string | null
          origine: string | null
          pagina: string | null
          persona_id: string | null
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
          appuntamento_completato_da?: string | null
          appuntamento_completato_il?: string | null
          appuntamento_esito?: string | null
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
          opportunita_id?: string | null
          ora_richiesta?: string | null
          origine?: string | null
          pagina?: string | null
          persona_id?: string | null
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
          appuntamento_completato_da?: string | null
          appuntamento_completato_il?: string | null
          appuntamento_esito?: string | null
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
          opportunita_id?: string | null
          ora_richiesta?: string | null
          origine?: string | null
          pagina?: string | null
          persona_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "form_contatti_opportunita_id_fkey"
            columns: ["opportunita_id"]
            isOneToOne: false
            referencedRelation: "opportunita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_contatti_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_contatti_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "form_contatti_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
        ]
      }
      form_invita_amico: {
        Row: {
          amico_cellulare: string | null
          amico_cognome: string | null
          amico_email: string | null
          amico_nome: string | null
          amico_prefisso: string | null
          assegnato_a: string | null
          assegnato_il: string | null
          chiuso_il: string | null
          created_at: string
          credito_caricato: boolean
          credito_caricato_da: string | null
          credito_caricato_il: string | null
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
          opportunita_id: string | null
          pagina: string | null
          persona_id: string | null
          persona_socio_id: string | null
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
          amico_cellulare?: string | null
          amico_cognome?: string | null
          amico_email?: string | null
          amico_nome?: string | null
          amico_prefisso?: string | null
          assegnato_a?: string | null
          assegnato_il?: string | null
          chiuso_il?: string | null
          created_at?: string
          credito_caricato?: boolean
          credito_caricato_da?: string | null
          credito_caricato_il?: string | null
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
          opportunita_id?: string | null
          pagina?: string | null
          persona_id?: string | null
          persona_socio_id?: string | null
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
          amico_cellulare?: string | null
          amico_cognome?: string | null
          amico_email?: string | null
          amico_nome?: string | null
          amico_prefisso?: string | null
          assegnato_a?: string | null
          assegnato_il?: string | null
          chiuso_il?: string | null
          created_at?: string
          credito_caricato?: boolean
          credito_caricato_da?: string | null
          credito_caricato_il?: string | null
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
          opportunita_id?: string | null
          pagina?: string | null
          persona_id?: string | null
          persona_socio_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "form_invita_amico_opportunita_id_fkey"
            columns: ["opportunita_id"]
            isOneToOne: false
            referencedRelation: "opportunita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_invita_amico_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_invita_amico_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "form_invita_amico_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
          {
            foreignKeyName: "form_invita_amico_persona_socio_id_fkey"
            columns: ["persona_socio_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_invita_amico_persona_socio_id_fkey"
            columns: ["persona_socio_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "form_invita_amico_persona_socio_id_fkey"
            columns: ["persona_socio_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
        ]
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
          contratto_firmato_il: string | null
          contratto_pdf_path: string | null
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
          persona_id: string | null
          persona_minore_id: string | null
          quota_totale: number | null
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
          caricato_pgm?: boolean
          caricato_pgm_da?: string | null
          caricato_pgm_il?: string | null
          compagno_preferito?: string | null
          consenso_privacy?: boolean | null
          consenso_regolamento?: boolean | null
          consenso_termini?: boolean | null
          contratto_firmato_il?: string | null
          contratto_pdf_path?: string | null
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
          persona_id?: string | null
          persona_minore_id?: string | null
          quota_totale?: number | null
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
          caricato_pgm?: boolean
          caricato_pgm_da?: string | null
          caricato_pgm_il?: string | null
          compagno_preferito?: string | null
          consenso_privacy?: boolean | null
          consenso_regolamento?: boolean | null
          consenso_termini?: boolean | null
          contratto_firmato_il?: string | null
          contratto_pdf_path?: string | null
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
          persona_id?: string | null
          persona_minore_id?: string | null
          quota_totale?: number | null
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
        Relationships: [
          {
            foreignKeyName: "form_scuola_tennis_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_scuola_tennis_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "form_scuola_tennis_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
          {
            foreignKeyName: "form_scuola_tennis_persona_minore_id_fkey"
            columns: ["persona_minore_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_scuola_tennis_persona_minore_id_fkey"
            columns: ["persona_minore_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "form_scuola_tennis_persona_minore_id_fkey"
            columns: ["persona_minore_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
        ]
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
          persona_id: string | null
          persona_minore_id: string | null
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
          persona_id?: string | null
          persona_minore_id?: string | null
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
          persona_id?: string | null
          persona_minore_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "form_summer_camp_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_summer_camp_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "form_summer_camp_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
          {
            foreignKeyName: "form_summer_camp_persona_minore_id_fkey"
            columns: ["persona_minore_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_summer_camp_persona_minore_id_fkey"
            columns: ["persona_minore_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "form_summer_camp_persona_minore_id_fkey"
            columns: ["persona_minore_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
        ]
      }
      iscrizioni_eventi: {
        Row: {
          annullata_da: string | null
          annullata_il: string | null
          cellulare: string | null
          cognome: string | null
          created_at: string | null
          data_compilazione_form: string | null
          data_di_nascita: string | null
          email: string | null
          evento_slug: string | null
          id: number
          importo_pagato: number | null
          lingua: string | null
          link_pgm: string | null
          nome: string | null
          nome_contratto_pgm: string | null
          nome_evento: string | null
          note: string | null
          pagamento_confermato_da: string | null
          pagamento_confermato_il: string | null
          persona_id: string | null
          quota: number | null
          scadenza_pagamento: string | null
          socio: boolean | null
          stato: string | null
          stato_contratto_pgm: string | null
        }
        Insert: {
          annullata_da?: string | null
          annullata_il?: string | null
          cellulare?: string | null
          cognome?: string | null
          created_at?: string | null
          data_compilazione_form?: string | null
          data_di_nascita?: string | null
          email?: string | null
          evento_slug?: string | null
          id?: number
          importo_pagato?: number | null
          lingua?: string | null
          link_pgm?: string | null
          nome?: string | null
          nome_contratto_pgm?: string | null
          nome_evento?: string | null
          note?: string | null
          pagamento_confermato_da?: string | null
          pagamento_confermato_il?: string | null
          persona_id?: string | null
          quota?: number | null
          scadenza_pagamento?: string | null
          socio?: boolean | null
          stato?: string | null
          stato_contratto_pgm?: string | null
        }
        Update: {
          annullata_da?: string | null
          annullata_il?: string | null
          cellulare?: string | null
          cognome?: string | null
          created_at?: string | null
          data_compilazione_form?: string | null
          data_di_nascita?: string | null
          email?: string | null
          evento_slug?: string | null
          id?: number
          importo_pagato?: number | null
          lingua?: string | null
          link_pgm?: string | null
          nome?: string | null
          nome_contratto_pgm?: string | null
          nome_evento?: string | null
          note?: string | null
          pagamento_confermato_da?: string | null
          pagamento_confermato_il?: string | null
          persona_id?: string | null
          quota?: number | null
          scadenza_pagamento?: string | null
          socio?: boolean | null
          stato?: string | null
          stato_contratto_pgm?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iscrizioni_eventi_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iscrizioni_eventi_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "iscrizioni_eventi_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
        ]
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
          assegnato_a: string | null
          assegnato_il: string | null
          chiuso_il: string | null
          creato_il: string
          id: string
          motivo_perso: string | null
          note: string | null
          origine_entita: string | null
          origine_id: string | null
          persona_id: string
          stato: string
          stato_da: string | null
          stato_il: string | null
        }
        Insert: {
          assegnato_a?: string | null
          assegnato_il?: string | null
          chiuso_il?: string | null
          creato_il?: string
          id?: string
          motivo_perso?: string | null
          note?: string | null
          origine_entita?: string | null
          origine_id?: string | null
          persona_id: string
          stato?: string
          stato_da?: string | null
          stato_il?: string | null
        }
        Update: {
          assegnato_a?: string | null
          assegnato_il?: string | null
          chiuso_il?: string | null
          creato_il?: string
          id?: string
          motivo_perso?: string | null
          note?: string | null
          origine_entita?: string | null
          origine_id?: string | null
          persona_id?: string
          stato?: string
          stato_da?: string | null
          stato_il?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunita_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunita_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "opportunita_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "opportunita_storico_opportunita_id_fkey"
            columns: ["opportunita_id"]
            isOneToOne: false
            referencedRelation: "opportunita"
            referencedColumns: ["id"]
          },
        ]
      }
      persone: {
        Row: {
          aggiornato_il: string
          cellulare: string | null
          cellulare_norm: string | null
          codice_fiscale: string | null
          cognome: string | null
          creato_il: string
          data_nascita: string | null
          email: string | null
          fonte: string | null
          genitore_id: string | null
          id: string
          nome: string | null
          pgm_member_id: string | null
          storico: boolean
          tipo: string
        }
        Insert: {
          aggiornato_il?: string
          cellulare?: string | null
          cellulare_norm?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          creato_il?: string
          data_nascita?: string | null
          email?: string | null
          fonte?: string | null
          genitore_id?: string | null
          id?: string
          nome?: string | null
          pgm_member_id?: string | null
          storico?: boolean
          tipo?: string
        }
        Update: {
          aggiornato_il?: string
          cellulare?: string | null
          cellulare_norm?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          creato_il?: string
          data_nascita?: string | null
          email?: string | null
          fonte?: string | null
          genitore_id?: string | null
          id?: string
          nome?: string | null
          pgm_member_id?: string | null
          storico?: boolean
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "persone_genitore_id_fkey"
            columns: ["genitore_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persone_genitore_id_fkey"
            columns: ["genitore_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "persone_genitore_id_fkey"
            columns: ["genitore_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
        ]
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
          cognome: string | null
          created_at: string
          email: string
          nome: string | null
          puo_cancellare: boolean
          puo_invitare: boolean
          puo_riassegnare: boolean
          sezioni_consentite: string[]
        }
        Insert: {
          cognome?: string | null
          created_at?: string
          email: string
          nome?: string | null
          puo_cancellare?: boolean
          puo_invitare?: boolean
          puo_riassegnare?: boolean
          sezioni_consentite?: string[]
        }
        Update: {
          cognome?: string | null
          created_at?: string
          email?: string
          nome?: string | null
          puo_cancellare?: boolean
          puo_invitare?: boolean
          puo_riassegnare?: boolean
          sezioni_consentite?: string[]
        }
        Relationships: []
      }
      task: {
        Row: {
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
          opportunita_id: string | null
          ora: string | null
          persona_id: string | null
          stato: string
          tipo: string
          titolo: string
        }
        Insert: {
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
          opportunita_id?: string | null
          ora?: string | null
          persona_id?: string | null
          stato?: string
          tipo?: string
          titolo: string
        }
        Update: {
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
          opportunita_id?: string | null
          ora?: string | null
          persona_id?: string | null
          stato?: string
          tipo?: string
          titolo?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_opportunita_id_fkey"
            columns: ["opportunita_id"]
            isOneToOne: false
            referencedRelation: "opportunita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_a"]
          },
          {
            foreignKeyName: "task_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "possibili_duplicati"
            referencedColumns: ["id_b"]
          },
        ]
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
      norm_cellulare: { Args: { v: string }; Returns: string }
      norm_email: { Args: { v: string }; Returns: string }
      trova_o_crea_minore: {
        Args: {
          p_codice_fiscale: string
          p_cognome: string
          p_data_nascita: string
          p_fonte?: string
          p_genitore_id: string
          p_nome: string
        }
        Returns: string
      }
      trova_o_crea_opportunita: {
        Args: { p_entita: string; p_id: string; p_persona_id: string }
        Returns: string
      }
      trova_o_crea_persona: {
        Args: {
          p_cellulare: string
          p_cognome: string
          p_email: string
          p_fonte?: string
          p_nome: string
          p_pgm_member_id: string
          p_storico?: boolean
        }
        Returns: string
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
