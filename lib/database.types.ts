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
      businesses: {
        Row: {
          id: string
          name: string | null
          business_type: string | null
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          business_type?: string | null
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          business_type?: string | null
          address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          business_id: string | null
          user_id: string | null
          role: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id?: string | null
          user_id?: string | null
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string | null
          user_id?: string | null
          role?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      reservations: {
        Row: {
          id: string
          customer_name: string | null
          date: string | null
          customer_mail: string | null
          created_at: string
          user_id: string | null
          [key: string]: any // Allow other columns
        }
        Insert: {
          id?: string
          customer_name?: string | null
          date?: string | null
          customer_mail?: string | null
          created_at?: string
          user_id?: string | null
          [key: string]: any
        }
        Update: {
          id?: string
          customer_name?: string | null
          date?: string | null
          customer_mail?: string | null
          created_at?: string
          user_id?: string | null
          [key: string]: any
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          customer_name: string | null
          customer_email: string | null
          status: string | null
          created_at: string
          user_id: string | null
          [key: string]: any
        }
        Insert: {
          id?: string
          customer_name?: string | null
          customer_email?: string | null
          status?: string | null
          created_at?: string
          user_id?: string | null
          [key: string]: any
        }
        Update: {
          id?: string
          customer_name?: string | null
          customer_email?: string | null
          status?: string | null
          created_at?: string
          user_id?: string | null
          [key: string]: any
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          business_name: string | null
          business_type: string | null
          phone: string | null
          address: string | null
          dashboard_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          business_name?: string | null
          business_type?: string | null
          phone?: string | null
          address?: string | null
          dashboard_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          business_name?: string | null
          business_type?: string | null
          phone?: string | null
          address?: string | null
          dashboard_user_id?: string
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
