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
      business_types: {
        Row: {
          id: string
          slug: string
          label: string
          catalog: string
          catalog_label: string
          features: string[]
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          label: string
          catalog: string
          catalog_label: string
          features?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          label?: string
          catalog?: string
          catalog_label?: string
          features?: string[]
          created_at?: string
        }
        Relationships: []
      }
      businesses: {
        Row: {
          id: string
          name: string | null
          business_type_id: string | null
          owner_id: string | null
          address: string | null
          email: string | null
          phone: string | null
          contact_email: string | null
          contact_phone: string | null
          maps_url: string | null
          hours: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          business_type_id?: string | null
          owner_id?: string | null
          address?: string | null
          email?: string | null
          phone?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          maps_url?: string | null
          hours?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          business_type_id?: string | null
          owner_id?: string | null
          address?: string | null
          email?: string | null
          phone?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          maps_url?: string | null
          hours?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_business_type_id_fkey"
            columns: ["business_type_id"]
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          phone: string | null
          dashboard_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          phone?: string | null
          dashboard_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          phone?: string | null
          dashboard_user_id?: string
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
          business_id: string | null
          customer_name: string | null
          date: string | null
          customer_mail: string | null
          created_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          business_id?: string | null
          customer_name?: string | null
          date?: string | null
          customer_mail?: string | null
          created_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          business_id?: string | null
          customer_name?: string | null
          date?: string | null
          customer_mail?: string | null
          created_at?: string
          [key: string]: any
        }
        Relationships: [
          {
            foreignKeyName: "reservations_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      }
      quotes: {
        Row: {
          id: string
          business_id: string | null
          customer_name: string | null
          customer_email: string | null
          status: string | null
          created_at: string
          [key: string]: any
        }
        Insert: {
          id?: string
          business_id?: string | null
          customer_name?: string | null
          customer_email?: string | null
          status?: string | null
          created_at?: string
          [key: string]: any
        }
        Update: {
          id?: string
          business_id?: string | null
          customer_name?: string | null
          customer_email?: string | null
          status?: string | null
          created_at?: string
          [key: string]: any
        }
        Relationships: [
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      }
      services: {
        Row: {
          id: string
          business_id: string
          name: string
          description: string | null
          duration: number | null
          price: number | null
          category: string | null
          active: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          description?: string | null
          duration?: number | null
          price?: number | null
          category?: string | null
          active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          description?: string | null
          duration?: number | null
          price?: number | null
          category?: string | null
          active?: boolean
          display_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      }
      employees: {
        Row: {
          id: string
          business_id: string
          name: string
          role: string | null
          bio: string | null
          email: string | null
          phone: string | null
          photo_url: string | null
          active: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          role?: string | null
          bio?: string | null
          email?: string | null
          phone?: string | null
          photo_url?: string | null
          active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          role?: string | null
          bio?: string | null
          email?: string | null
          phone?: string | null
          photo_url?: string | null
          active?: boolean
          display_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      }
      people: {
        Row: {
          id: string
          business_id: string
          name: string
          specialty: string | null
          description: string | null
          age: number | null
          portfolio_url: string | null
          photo_url: string | null
          active: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          specialty?: string | null
          description?: string | null
          age?: number | null
          portfolio_url?: string | null
          photo_url?: string | null
          active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          specialty?: string | null
          description?: string | null
          age?: number | null
          portfolio_url?: string | null
          photo_url?: string | null
          active?: boolean
          display_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          business_id: string
          name: string
          description: string | null
          price: number | null
          stock: number | null
          sku: string | null
          category: string | null
          active: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          description?: string | null
          price?: number | null
          stock?: number | null
          sku?: string | null
          category?: string | null
          active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          description?: string | null
          price?: number | null
          stock?: number | null
          sku?: string | null
          category?: string | null
          active?: boolean
          display_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          }
        ]
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
