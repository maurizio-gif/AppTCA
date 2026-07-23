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
      form_contatti: {
        Row: {
          attivita: Json | null
          cellulare: string | null
          cognome: string | null
          created_at: string
          cta: string | null
          data_richiesta: string | null
          email: string | null
          gruppo_attivita: string | null
          id: string
          marketing: boolean | null
          motivo: string | null
          nome: string | null
          ora_richiesta: string | null
          pagina: string | null
          prefisso: string | null
          privacy: boolean | null
          stato: string | null
          tipo_richiesta: string | null
          utm: Json | null
          vid: string | null
        }
        Insert: Partial<Database["public"]["Tables"]["form_contatti"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["form_contatti"]["Row"]>
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
          id: string
          pagina: string | null
          utm: Json | null
          vid: string | null
        }
        Insert: Partial<Database["public"]["Tables"]["form_invita_amico"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["form_invita_amico"]["Row"]>
        Relationships: []
      }
      form_scuola_tennis: {
        Row: {
          compagno_preferito: string | null
          consenso_privacy: boolean | null
          consenso_regolamento: boolean | null
          consenso_termini: boolean | null
          created_at: string
          frequenza: string | null
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
          utm: Json | null
          vid: string | null
        }
        Insert: Partial<Database["public"]["Tables"]["form_scuola_tennis"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["form_scuola_tennis"]["Row"]>
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
        Insert: Partial<Database["public"]["Tables"]["iscrizioni_eventi"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["iscrizioni_eventi"]["Row"]>
        Relationships: []
      }
      staff_users: {
        Row: {
          email: string
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["staff_users"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["staff_users"]["Row"]>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
