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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          content_type: string
          created_at: string
          id: string
          mime_type: string | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string
          id?: string
          mime_type?: string | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          id?: string
          mime_type?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          activated_at: string | null
          active: boolean
          email: string | null
          expert_id: string | null
          id: string
          invited_at: string
          magic_link_token: string | null
          token_expires_at: string | null
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          active?: boolean
          email?: string | null
          expert_id?: string | null
          id?: string
          invited_at?: string
          magic_link_token?: string | null
          token_expires_at?: string | null
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          active?: boolean
          email?: string | null
          expert_id?: string | null
          id?: string
          invited_at?: string
          magic_link_token?: string | null
          token_expires_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          created_at: string
          id: string
          percentage: number
          promoter_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          percentage?: number
          promoter_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          percentage?: number
          promoter_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_prompt_generations: {
        Row: {
          created_at: string
          expert_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          expert_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          expert_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_prompt_generations_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_prompt_jobs: {
        Row: {
          created_at: string
          expert_id: string
          gemini_files: Json
          generation_id: string | null
          id: string
          status: string
          supabase_paths: string[]
        }
        Insert: {
          created_at?: string
          expert_id: string
          gemini_files?: Json
          generation_id?: string | null
          id?: string
          status?: string
          supabase_paths?: string[]
        }
        Update: {
          created_at?: string
          expert_id?: string
          gemini_files?: Json
          generation_id?: string | null
          id?: string
          status?: string
          supabase_paths?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "expert_prompt_jobs_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_prompt_jobs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "expert_prompt_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      experts: {
        Row: {
          active: boolean
          app_name: string | null
          app_subtitle: string | null
          city: string | null
          contact_links: Json
          created_at: string
          id: string
          invite_fallback_used: boolean | null
          invite_sent_at: string | null
          is_admin: boolean
          is_promoter: boolean
          last_subdomain_change_at: string | null
          lifetime: boolean
          listed: boolean
          locale: string
          name: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          photo_url: string | null
          plan: string
          previous_subdomain: string | null
          referral_code: string | null
          specialty: string | null
          stripe_coupon_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subdomain: string
          subscription_period: string | null
          system_prompt: string | null
          trial_end: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          welcome_email_sent: boolean
        }
        Insert: {
          active?: boolean
          app_name?: string | null
          app_subtitle?: string | null
          city?: string | null
          contact_links?: Json
          created_at?: string
          id?: string
          invite_fallback_used?: boolean | null
          invite_sent_at?: string | null
          is_admin?: boolean
          is_promoter?: boolean
          last_subdomain_change_at?: string | null
          lifetime?: boolean
          listed?: boolean
          locale?: string
          name: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          photo_url?: string | null
          plan?: string
          previous_subdomain?: string | null
          referral_code?: string | null
          specialty?: string | null
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain: string
          subscription_period?: string | null
          system_prompt?: string | null
          trial_end?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          welcome_email_sent?: boolean
        }
        Update: {
          active?: boolean
          app_name?: string | null
          app_subtitle?: string | null
          city?: string | null
          contact_links?: Json
          created_at?: string
          id?: string
          invite_fallback_used?: boolean | null
          invite_sent_at?: string | null
          is_admin?: boolean
          is_promoter?: boolean
          last_subdomain_change_at?: string | null
          lifetime?: boolean
          listed?: boolean
          locale?: string
          name?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          photo_url?: string | null
          plan?: string
          previous_subdomain?: string | null
          referral_code?: string | null
          specialty?: string | null
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain?: string
          subscription_period?: string | null
          system_prompt?: string | null
          trial_end?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          welcome_email_sent?: boolean
        }
        Relationships: []
      }
      referrals: {
        Row: {
          amount_gross_cents: number
          attribution: string
          clears_at: string
          commission_cents: number
          commission_pct: number
          created_at: string
          id: string
          paid_at: string | null
          promoter_id: string
          referred_expert_id: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          amount_gross_cents: number
          attribution: string
          clears_at: string
          commission_cents: number
          commission_pct: number
          created_at?: string
          id?: string
          paid_at?: string | null
          promoter_id: string
          referred_expert_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          amount_gross_cents?: number
          attribution?: string
          clears_at?: string
          commission_cents?: number
          commission_pct?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          promoter_id?: string
          referred_expert_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_expert_id_fkey"
            columns: ["referred_expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      usage: {
        Row: {
          analysis_count: number
          date: string
          id: string
          ip: string | null
          user_id: string | null
        }
        Insert: {
          analysis_count?: number
          date?: string
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_count?: number
          date?: string
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_gemini_file: {
        Args: { p_file: Json; p_job_id: string }
        Returns: undefined
      }
      check_and_increment_usage: {
        Args: {
          p_date: string
          p_ip: string | null
          p_limit: number
          p_user_id: string | null
        }
        Returns: Json
      }
      check_user_has_password: { Args: { p_email: string }; Returns: boolean }
      finalize_prompt_job: {
        Args: { p_expert_id: string; p_job_id: string; p_success: boolean }
        Returns: undefined
      }
      get_user_auth_data_by_email: { Args: { p_email: string }; Returns: Json }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      remove_failed_gemini_files: {
        Args: { p_failed_names: string[]; p_job_id: string }
        Returns: undefined
      }
      try_start_prompt_job: {
        Args: { p_expert_id: string; p_paths: string[] }
        Returns: Json
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
