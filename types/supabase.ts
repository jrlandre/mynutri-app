export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      experts: {
        Row: {
          id: string
          user_id: string
          subdomain: string
          name: string
          system_prompt: string | null
          plan: 'standard' | 'enterprise'
          active: boolean
          created_at: string
          photo_url: string | null
          specialty: string | null
          city: string | null
          listed: boolean
          contact_links: Json
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          is_admin: boolean
          welcome_email_sent: boolean
        }
        Insert: {
          id?: string
          user_id: string
          subdomain: string
          name: string
          system_prompt?: string | null
          plan?: 'standard' | 'enterprise'
          active?: boolean
          created_at?: string
          photo_url?: string | null
          specialty?: string | null
          city?: string | null
          listed?: boolean
          contact_links?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          is_admin?: boolean
          welcome_email_sent?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          subdomain?: string
          name?: string
          system_prompt?: string | null
          plan?: 'standard' | 'enterprise'
          active?: boolean
          created_at?: string
          photo_url?: string | null
          specialty?: string | null
          city?: string | null
          listed?: boolean
          contact_links?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          is_admin?: boolean
          welcome_email_sent?: boolean
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          user_id: string | null
          expert_id: string
          active: boolean
          magic_link_token: string | null
          invited_at: string
          activated_at: string | null
          email: string | null
          name: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          expert_id: string
          active?: boolean
          magic_link_token?: string | null
          invited_at?: string
          activated_at?: string | null
          email?: string | null
          name?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          expert_id?: string
          active?: boolean
          magic_link_token?: string | null
          invited_at?: string
          activated_at?: string | null
          email?: string | null
          name?: string | null
        }
        Relationships: []
      }
      usage: {
        Row: {
          id: string
          user_id: string | null
          date: string
          analysis_count: number
          ip: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          date?: string
          analysis_count?: number
          ip?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          date?: string
          analysis_count?: number
          ip?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          id: string
          code: string
          discount_pct: number
          valid_until: string | null
          usage_limit: number | null
          used_count: number
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          discount_pct: number
          valid_until?: string | null
          usage_limit?: number | null
          used_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          discount_pct?: number
          valid_until?: string | null
          usage_limit?: number | null
          used_count?: number
          created_at?: string
        }
        Relationships: []
      }
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
