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
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content_type: 'text' | 'image' | 'audio'
          content: string
          mime_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant'
          content_type: 'text' | 'image' | 'audio'
          content: string
          mime_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant'
          content_type?: 'text' | 'image' | 'audio'
          content?: string
          mime_type?: string | null
          created_at?: string
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
      experts: {
        Row: {
          active: boolean
          city: string | null
          contact_links: Json
          created_at: string
          id: string
          is_admin: boolean
          is_promoter: boolean
          lifetime: boolean
          listed: boolean
          name: string
          photo_url: string | null
          plan: string
          referral_code: string | null
          specialty: string | null
          stripe_coupon_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subdomain: string
          subscription_period: string | null
          system_prompt: string | null
          user_id: string | null
          welcome_email_sent: boolean
        }
        Insert: {
          active?: boolean
          city?: string | null
          contact_links?: Json
          created_at?: string
          id?: string
          is_admin?: boolean
          is_promoter?: boolean
          lifetime?: boolean
          listed?: boolean
          name: string
          photo_url?: string | null
          plan?: string
          referral_code?: string | null
          specialty?: string | null
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain: string
          subscription_period?: string | null
          system_prompt?: string | null
          user_id?: string | null
          welcome_email_sent?: boolean
        }
        Update: {
          active?: boolean
          city?: string | null
          contact_links?: Json
          created_at?: string
          id?: string
          is_admin?: boolean
          is_promoter?: boolean
          lifetime?: boolean
          listed?: boolean
          name?: string
          photo_url?: string | null
          plan?: string
          referral_code?: string | null
          specialty?: string | null
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subdomain?: string
          subscription_period?: string | null
          system_prompt?: string | null
          user_id?: string | null
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
      get_user_auth_data_by_email: {
        Args: { p_email: string }
        Returns: {
          id: string
          providers: string[]
          confirmed: boolean
          has_password: boolean
        } | null
      }
      check_user_has_password: {
        Args: { p_email: string }
        Returns: boolean | null
      }
      get_user_id_by_email: {
        Args: { p_email: string }
        Returns: string | null
      }
      check_and_increment_usage: {
        Args: {
          p_user_id: string | null
          p_ip: string | null
          p_date: string
          p_limit: number
        }
        Returns: {
          allowed: boolean
          count: number
        }
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
