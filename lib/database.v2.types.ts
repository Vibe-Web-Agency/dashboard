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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      agencies: {
        Row: {
          billing_address: string | null
          billing_email: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_internal: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          siren: string | null
          slug: string
          status: string
          stripe_account_id: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          billing_email?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          siren?: string | null
          slug: string
          status?: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          billing_email?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          siren?: string | null
          slug?: string
          status?: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agency_domains: {
        Row: {
          agency_id: string
          business_id: string | null
          created_at: string
          domain: string
          id: string
          is_primary: boolean
          type: string
          verified_at: string | null
        }
        Insert: {
          agency_id: string
          business_id?: string | null
          created_at?: string
          domain: string
          id?: string
          is_primary?: boolean
          type: string
          verified_at?: string | null
        }
        Update: {
          agency_id?: string
          business_id?: string | null
          created_at?: string
          domain?: string
          id?: string
          is_primary?: boolean
          type?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_domains_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_domains_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
        ]
      }
      agency_email_senders: {
        Row: {
          agency_id: string
          business_id: string | null
          created_at: string
          from_email: string
          from_name: string
          id: string
          is_default: boolean
          is_verified: boolean
          provider: string
          reply_to: string | null
        }
        Insert: {
          agency_id: string
          business_id?: string | null
          created_at?: string
          from_email: string
          from_name: string
          id?: string
          is_default?: boolean
          is_verified?: boolean
          provider?: string
          reply_to?: string | null
        }
        Update: {
          agency_id?: string
          business_id?: string | null
          created_at?: string
          from_email?: string
          from_name?: string
          id?: string
          is_default?: boolean
          is_verified?: boolean
          provider?: string
          reply_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_email_senders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_email_senders_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
        ]
      }
      agency_plan_modules: {
        Row: {
          agency_plan_id: string
          module_id: string
        }
        Insert: {
          agency_plan_id: string
          module_id: string
        }
        Update: {
          agency_plan_id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_plan_modules_agency_plan_id_fkey"
            columns: ["agency_plan_id"]
            isOneToOne: false
            referencedRelation: "agency_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_plan_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_plans: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          max_businesses: number | null
          name: string
          price_monthly_cents: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          max_businesses?: number | null
          name: string
          price_monthly_cents?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          max_businesses?: number | null
          name?: string
          price_monthly_cents?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_portfolio_items: {
        Row: {
          agency_id: string
          business_id: string | null
          client_name: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          images: Json
          position: number
          published_at: string | null
          site_url: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          business_id?: string | null
          client_name?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          position?: number
          published_at?: string | null
          site_url?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          business_id?: string | null
          client_name?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          position?: number
          published_at?: string | null
          site_url?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_portfolio_items_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_portfolio_items_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
        ]
      }
      agency_subscriptions: {
        Row: {
          agency_id: string
          agency_plan_id: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          agency_plan_id: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          agency_plan_id?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_subscriptions_agency_plan_id_fkey"
            columns: ["agency_plan_id"]
            isOneToOne: false
            referencedRelation: "agency_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          agency_id: string | null
          business_id: string | null
          changes: Json
          created_at: string
          entity_id: string | null
          entity_table: string
          id: number
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          agency_id?: string | null
          business_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: never
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          agency_id?: string | null
          business_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: never
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          business_id: string
          content: string | null
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          business_id: string
          content?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          business_id?: string
          content?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_addons: {
        Row: {
          agency_id: string
          business_id: string
          cancelled_at: string | null
          created_at: string
          currency: string
          extra_monthly_limit: number | null
          id: string
          meter: string | null
          module_id: string | null
          price_monthly_cents: number
          started_at: string
          status: string
          stripe_item_id: string | null
        }
        Insert: {
          agency_id: string
          business_id: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          extra_monthly_limit?: number | null
          id?: string
          meter?: string | null
          module_id?: string | null
          price_monthly_cents?: number
          started_at?: string
          status?: string
          stripe_item_id?: string | null
        }
        Update: {
          agency_id?: string
          business_id?: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          extra_monthly_limit?: number | null
          id?: string
          meter?: string | null
          module_id?: string | null
          price_monthly_cents?: number
          started_at?: string
          status?: string
          stripe_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_addons_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "business_addons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      business_closures: {
        Row: {
          business_id: string
          close_time: string | null
          created_at: string
          ends_on: string
          id: string
          kind: string
          open_time: string | null
          reason: string | null
          starts_on: string
        }
        Insert: {
          business_id: string
          close_time?: string | null
          created_at?: string
          ends_on: string
          id?: string
          kind?: string
          open_time?: string | null
          reason?: string | null
          starts_on: string
        }
        Update: {
          business_id?: string
          close_time?: string | null
          created_at?: string
          ends_on?: string
          id?: string
          kind?: string
          open_time?: string | null
          reason?: string | null
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          label: string | null
          open_time: string
        }
        Insert: {
          business_id: string
          close_time: string
          created_at?: string
          day_of_week: number
          id?: string
          label?: string | null
          open_time: string
        }
        Update: {
          business_id?: string
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          label?: string | null
          open_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_module_settings: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_enabled: boolean
          module_id: string
          settings: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_id: string
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          module_id?: string
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_module_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_module_settings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_module_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_plans: {
        Row: {
          agency_id: string
          business_id: string
          cancelled_at: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          price_monthly_cents: number | null
          setup_fee_cents: number | null
          status: string
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          business_id: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          price_monthly_cents?: number | null
          setup_fee_cents?: number | null
          status?: string
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          business_id?: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          price_monthly_cents?: number | null
          setup_fee_cents?: number | null
          status?: string
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_plans_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "business_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      business_type_modules: {
        Row: {
          business_type_id: string
          module_id: string
        }
        Insert: {
          business_type_id: string
          module_id: string
        }
        Update: {
          business_type_id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_type_modules_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_type_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      business_types: {
        Row: {
          booking_noun: string
          created_at: string
          icon: string | null
          id: string
          label: string
          slug: string
        }
        Insert: {
          booking_noun?: string
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          slug: string
        }
        Update: {
          booking_noun?: string
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address_line: string | null
          agency_id: string
          billing_address: string | null
          billing_email: string | null
          business_type_id: string
          city: string | null
          country: string
          cover_url: string | null
          created_at: string
          description: string | null
          email: string | null
          google_location_id: string | null
          id: string
          latitude: number | null
          locale: string
          logo_url: string | null
          longitude: number | null
          maps_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          primary_color: string | null
          siren: string | null
          slug: string
          status: string
          stripe_customer_id: string | null
          timezone: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address_line?: string | null
          agency_id: string
          billing_address?: string | null
          billing_email?: string | null
          business_type_id: string
          city?: string | null
          country?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          google_location_id?: string | null
          id?: string
          latitude?: number | null
          locale?: string
          logo_url?: string | null
          longitude?: number | null
          maps_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          primary_color?: string | null
          siren?: string | null
          slug: string
          status?: string
          stripe_customer_id?: string | null
          timezone?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address_line?: string | null
          agency_id?: string
          billing_address?: string | null
          billing_email?: string | null
          business_type_id?: string
          city?: string | null
          country?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          google_location_id?: string | null
          id?: string
          latitude?: number | null
          locale?: string
          logo_url?: string | null
          longitude?: number | null
          maps_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          primary_color?: string | null
          siren?: string | null
          slug?: string
          status?: string
          stripe_customer_id?: string | null
          timezone?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          agency_id: string
          audience: Json
          author_id: string | null
          business_id: string
          channel: string
          content: string
          created_at: string
          id: string
          name: string
          preview_text: string | null
          scheduled_at: string | null
          sender_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          audience?: Json
          author_id?: string | null
          business_id: string
          channel?: string
          content: string
          created_at?: string
          id?: string
          name: string
          preview_text?: string | null
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          audience?: Json
          author_id?: string | null
          business_id?: string
          channel?: string
          content?: string
          created_at?: string
          id?: string
          name?: string
          preview_text?: string | null
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "campaigns_sender_id_agency_id_fkey"
            columns: ["sender_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "agency_email_senders"
            referencedColumns: ["id", "agency_id"]
          },
        ]
      }
      communication_optouts: {
        Row: {
          address: string
          business_id: string | null
          channel: string
          created_at: string
          id: string
          scope: string
          source: string
        }
        Insert: {
          address: string
          business_id?: string | null
          channel: string
          created_at?: string
          id?: string
          scope?: string
          source: string
        }
        Update: {
          address?: string
          business_id?: string | null
          channel?: string
          created_at?: string
          id?: string
          scope?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_optouts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          attachments: Json
          author_id: string | null
          business_id: string
          content: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          error: string | null
          external_id: string | null
          failed_at: string | null
          id: string
          is_ai_generated: boolean
          provider: string | null
          provider_message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          attachments?: Json
          author_id?: string | null
          business_id: string
          content: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          error?: string | null
          external_id?: string | null
          failed_at?: string | null
          id?: string
          is_ai_generated?: boolean
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status: string
        }
        Update: {
          attachments?: Json
          author_id?: string | null
          business_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error?: string | null
          external_id?: string | null
          failed_at?: string | null
          id?: string
          is_ai_generated?: boolean
          provider?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_conversation_id_business_id_fkey"
            columns: ["conversation_id", "business_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          business_id: string
          channel: string
          contact_handle: string
          created_at: string
          customer_id: string | null
          external_thread_id: string | null
          id: string
          last_message_at: string | null
          resolved_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_id: string
          channel: string
          contact_handle: string
          created_at?: string
          customer_id?: string | null
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_id?: string
          channel?: string
          contact_handle?: string
          created_at?: string
          customer_id?: string | null
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["customer_id", "business_id"]
          },
          {
            foreignKeyName: "conversations_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          author_id: string | null
          business_id: string
          content: string
          created_at: string
          customer_id: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          business_id: string
          content: string
          created_at?: string
          customer_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          business_id?: string
          content?: string
          created_at?: string
          customer_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["customer_id", "business_id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      customers: {
        Row: {
          anonymized_at: string | null
          business_id: string
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_blocked: boolean
          last_name: string | null
          marketing_email_opt_in_at: string | null
          marketing_sms_opt_in_at: string | null
          phone: string | null
          profile_id: string | null
          source: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          business_id: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          last_name?: string | null
          marketing_email_opt_in_at?: string | null
          marketing_sms_opt_in_at?: string | null
          phone?: string | null
          profile_id?: string | null
          source?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          business_id?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          last_name?: string | null
          marketing_email_opt_in_at?: string | null
          marketing_sms_opt_in_at?: string | null
          phone?: string | null
          profile_id?: string | null
          source?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          business_id: string
          kind: string
          last_number: number
          year: number
        }
        Insert: {
          business_id: string
          kind: string
          last_number?: number
          year: number
        }
        Update: {
          business_id?: string
          kind?: string
          last_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_absences: {
        Row: {
          business_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          employee_id: string
          ends_on: string
          id: string
          kind: string
          note: string | null
          requested_by: string | null
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          employee_id: string
          ends_on: string
          id?: string
          kind: string
          note?: string | null
          requested_by?: string | null
          starts_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          employee_id?: string
          ends_on?: string
          id?: string
          kind?: string
          note?: string | null
          requested_by?: string | null
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_absences_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absences_employee_id_business_id_fkey"
            columns: ["employee_id", "business_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "employee_absences_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_availabilities: {
        Row: {
          business_id: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          employee_id: string
          ends_time: string
          id: string
          kind: string
          starts_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          business_id: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          employee_id: string
          ends_time: string
          id?: string
          kind?: string
          starts_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          business_id?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          employee_id?: string
          ends_time?: string
          id?: string
          kind?: string
          starts_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_availabilities_employee_id_business_id_fkey"
            columns: ["employee_id", "business_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      employee_hr: {
        Row: {
          business_id: string
          contract_hours_per_week: number | null
          created_at: string
          employee_id: string
          employment_type: string | null
          ended_on: string | null
          hired_on: string | null
          hourly_cost_cents: number | null
          note: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          contract_hours_per_week?: number | null
          created_at?: string
          employee_id: string
          employment_type?: string | null
          ended_on?: string | null
          hired_on?: string | null
          hourly_cost_cents?: number | null
          note?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          contract_hours_per_week?: number | null
          created_at?: string
          employee_id?: string
          employment_type?: string | null
          ended_on?: string | null
          hired_on?: string | null
          hourly_cost_cents?: number | null
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_hr_employee_id_business_id_fkey"
            columns: ["employee_id", "business_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      employee_services: {
        Row: {
          business_id: string
          created_at: string
          employee_id: string
          service_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          employee_id: string
          service_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          employee_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_services_employee_id_business_id_fkey"
            columns: ["employee_id", "business_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "employee_services_service_id_business_id_fkey"
            columns: ["service_id", "business_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      employees: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_id: string
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          planning_color: string | null
          position: number
          profile_id: string | null
          show_on_site: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_id: string
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          planning_color?: string | null
          position?: number
          profile_id?: string | null
          show_on_site?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_id?: string
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          planning_color?: string | null
          position?: number
          profile_id?: string | null
          show_on_site?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          agency_id: string
          amount_cents: number
          business_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          label: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          recurrence: string
          spent_on: string
          supplier: string | null
          tax_cents: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          amount_cents: number
          business_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          label: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recurrence?: string
          spent_on?: string
          supplier?: string | null
          tax_cents?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          amount_cents?: number
          business_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          label?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recurrence?: string
          spent_on?: string
          supplier?: string | null
          tax_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          agency_id: string
          business_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          message: string | null
          role: string
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          agency_id: string
          business_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          message?: string | null
          role: string
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string
          business_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          message?: string | null
          role?: string
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          business_id: string
          created_at: string
          description: string
          id: string
          invoice_id: string
          position: number
          quantity: number
          tax_rate: number
          unit_price_cents: number
        }
        Insert: {
          business_id: string
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          position?: number
          quantity: number
          tax_rate?: number
          unit_price_cents: number
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          tax_rate?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_business_id_fkey"
            columns: ["invoice_id", "business_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid_cents: number
          business_id: string
          buyer: Json | null
          created_at: string
          credits_invoice_id: string | null
          currency: string
          customer_id: string
          discount_cents: number
          due_date: string | null
          id: string
          issued_at: string | null
          kind: string
          notes: string | null
          number: string | null
          order_id: string | null
          paid_at: string | null
          payment_method: string | null
          pdf_url: string | null
          quote_id: string | null
          seller: Json | null
          sent_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          amount_paid_cents?: number
          business_id: string
          buyer?: Json | null
          created_at?: string
          credits_invoice_id?: string | null
          currency?: string
          customer_id: string
          discount_cents?: number
          due_date?: string | null
          id?: string
          issued_at?: string | null
          kind?: string
          notes?: string | null
          number?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          quote_id?: string | null
          seller?: Json | null
          sent_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          amount_paid_cents?: number
          business_id?: string
          buyer?: Json | null
          created_at?: string
          credits_invoice_id?: string | null
          currency?: string
          customer_id?: string
          discount_cents?: number
          due_date?: string | null
          id?: string
          issued_at?: string | null
          kind?: string
          notes?: string | null
          number?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          quote_id?: string | null
          seller?: Json | null
          sent_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_credits_invoice_id_business_id_fkey"
            columns: ["credits_invoice_id", "business_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["customer_id", "business_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "invoices_order_id_business_id_fkey"
            columns: ["order_id", "business_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "invoices_quote_id_business_id_fkey"
            columns: ["quote_id", "business_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      memberships: {
        Row: {
          agency_id: string
          business_id: string | null
          created_at: string
          id: string
          is_active: boolean
          profile_id: string
          role: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          business_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          profile_id: string
          role: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          business_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          profile_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[]
          business_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          menu_section_id: string
          name: string
          position: number
          price_cents: number | null
          tags: string[]
          tax_rate: number
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          business_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          menu_section_id: string
          name: string
          position?: number
          price_cents?: number | null
          tags?: string[]
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          business_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          menu_section_id?: string
          name?: string
          position?: number
          price_cents?: number | null
          tags?: string[]
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_section_id_business_id_fkey"
            columns: ["menu_section_id", "business_id"]
            isOneToOne: false
            referencedRelation: "menu_sections"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      menu_sections: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_sections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_core: boolean
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_core?: boolean
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_core?: boolean
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          business_id: string
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          tax_rate: number
          total_cents: number | null
          unit_price_cents: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sku?: string | null
          tax_rate: number
          total_cents?: number | null
          unit_price_cents: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          tax_rate?: number
          total_cents?: number | null
          unit_price_cents?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_business_id_fkey"
            columns: ["order_id", "business_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "order_items_product_id_business_id_fkey"
            columns: ["product_id", "business_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "order_items_variant_id_business_id_fkey"
            columns: ["variant_id", "business_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          business_id: string
          cancelled_at: string | null
          created_at: string
          currency: string
          customer_id: string
          customer_note: string | null
          discount_cents: number
          id: string
          number: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          refunded_cents: number
          shipped_at: string | null
          shipping_address: Json | null
          shipping_cents: number
          source: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: Json | null
          business_id: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          customer_note?: string | null
          discount_cents?: number
          id?: string
          number: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          refunded_cents?: number
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          source?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents: number
          tax_cents?: number
          total_cents: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: Json | null
          business_id?: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          customer_note?: string | null
          discount_cents?: number
          id?: string
          number?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          refunded_cents?: number
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          source?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["customer_id", "business_id"]
          },
          {
            foreignKeyName: "orders_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      outbound_messages: {
        Row: {
          agency_id: string
          business_id: string | null
          campaign_id: string | null
          channel: string
          clicked_at: string | null
          content: string | null
          created_at: string
          customer_id: string | null
          delivered_at: string | null
          error: string | null
          failed_at: string | null
          id: string
          idempotency_key: string | null
          invoice_id: string | null
          kind: string
          opened_at: string | null
          order_id: string | null
          provider: string
          provider_message_id: string | null
          quote_id: string | null
          reservation_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template: string
          to_address: string
        }
        Insert: {
          agency_id: string
          business_id?: string | null
          campaign_id?: string | null
          channel: string
          clicked_at?: string | null
          content?: string | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          error?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          kind: string
          opened_at?: string | null
          order_id?: string | null
          provider?: string
          provider_message_id?: string | null
          quote_id?: string | null
          reservation_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template: string
          to_address: string
        }
        Update: {
          agency_id?: string
          business_id?: string | null
          campaign_id?: string | null
          channel?: string
          clicked_at?: string | null
          content?: string | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          error?: string | null
          failed_at?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          kind?: string
          opened_at?: string | null
          order_id?: string | null
          provider?: string
          provider_message_id?: string | null
          quote_id?: string | null
          reservation_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template?: string
          to_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_messages_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_messages_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "outbound_messages_campaign_id_business_id_fkey"
            columns: ["campaign_id", "business_id"]
            isOneToOne: false
            referencedRelation: "campaign_stats"
            referencedColumns: ["campaign_id", "business_id"]
          },
          {
            foreignKeyName: "outbound_messages_campaign_id_business_id_fkey"
            columns: ["campaign_id", "business_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "outbound_messages_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["customer_id", "business_id"]
          },
          {
            foreignKeyName: "outbound_messages_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "outbound_messages_invoice_id_business_id_fkey"
            columns: ["invoice_id", "business_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "outbound_messages_order_id_business_id_fkey"
            columns: ["order_id", "business_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "outbound_messages_quote_id_business_id_fkey"
            columns: ["quote_id", "business_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "outbound_messages_reservation_id_business_id_fkey"
            columns: ["reservation_id", "business_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      plan_modules: {
        Row: {
          created_at: string
          id: string
          module_id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_modules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_quotas: {
        Row: {
          meter: string
          monthly_limit: number
          plan_id: string
        }
        Insert: {
          meter: string
          monthly_limit: number
          plan_id: string
        }
        Update: {
          meter?: string
          monthly_limit?: number
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_quotas_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          agency_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          price_monthly_cents: number
          price_yearly_cents: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          price_monthly_cents?: number
          price_yearly_cents?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          price_monthly_cents?: number
          price_yearly_cents?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          position: number
          price_cents: number | null
          product_id: string
          sku: string | null
          stock: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          position?: number
          price_cents?: number | null
          product_id: string
          sku?: string | null
          stock?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          price_cents?: number | null
          product_id?: string
          sku?: string | null
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_business_id_fkey"
            columns: ["product_id", "business_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          compare_price_cents: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          images: Json
          is_active: boolean
          name: string
          position: number
          price_cents: number
          sku: string | null
          slug: string
          stock: number | null
          tax_rate: number
          updated_at: string
        }
        Insert: {
          business_id: string
          compare_price_cents?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          is_active?: boolean
          name: string
          position?: number
          price_cents: number
          sku?: string | null
          slug: string
          stock?: number | null
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          compare_price_cents?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          is_active?: boolean
          name?: string
          position?: number
          price_cents?: number
          sku?: string | null
          slug?: string
          stock?: number | null
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          locale: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_talents: {
        Row: {
          business_id: string
          created_at: string
          id: string
          project_id: string
          role: string | null
          talent_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          project_id: string
          role?: string | null
          talent_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          project_id?: string
          role?: string | null
          talent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_talents_project_id_business_id_fkey"
            columns: ["project_id", "business_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "project_talents_talent_id_business_id_fkey"
            columns: ["talent_id", "business_id"]
            isOneToOne: false
            referencedRelation: "talents"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      projects: {
        Row: {
          business_id: string
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          images: Json
          position: number
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          position?: number
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          position?: number
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_activities: {
        Row: {
          agency_id: string
          author_id: string | null
          content: string | null
          created_at: string
          id: string
          kind: string
          occurred_at: string
          prospect_id: string
        }
        Insert: {
          agency_id: string
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          kind: string
          occurred_at?: string
          prospect_id: string
        }
        Update: {
          agency_id?: string
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          prospect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_activities_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_activities_prospect_id_agency_id_fkey"
            columns: ["prospect_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id", "agency_id"]
          },
        ]
      }
      prospects: {
        Row: {
          agency_id: string
          assigned_to: string | null
          business_name: string
          business_type_id: string | null
          city: string | null
          contact_name: string | null
          converted_at: string | null
          converted_business_id: string | null
          created_at: string
          currency: string
          email: string | null
          estimated_value_cents: number | null
          id: string
          lost_reason: string | null
          next_action_at: string | null
          notes: string | null
          phone: string | null
          preview_sent_at: string | null
          preview_slug: string | null
          source: string
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          agency_id: string
          assigned_to?: string | null
          business_name: string
          business_type_id?: string | null
          city?: string | null
          contact_name?: string | null
          converted_at?: string | null
          converted_business_id?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          estimated_value_cents?: number | null
          id?: string
          lost_reason?: string | null
          next_action_at?: string | null
          notes?: string | null
          phone?: string | null
          preview_sent_at?: string | null
          preview_slug?: string | null
          source?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          agency_id?: string
          assigned_to?: string | null
          business_name?: string
          business_type_id?: string | null
          city?: string | null
          contact_name?: string | null
          converted_at?: string | null
          converted_business_id?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          estimated_value_cents?: number | null
          id?: string
          lost_reason?: string | null
          next_action_at?: string | null
          notes?: string | null
          phone?: string | null
          preview_sent_at?: string | null
          preview_slug?: string | null
          source?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_business_type_id_fkey"
            columns: ["business_type_id"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_converted_business_id_agency_id_fkey"
            columns: ["converted_business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
        ]
      }
      quote_items: {
        Row: {
          business_id: string
          created_at: string
          description: string
          id: string
          position: number
          quantity: number
          quote_id: string
          tax_rate: number
          unit_price_cents: number
        }
        Insert: {
          business_id: string
          created_at?: string
          description: string
          id?: string
          position?: number
          quantity: number
          quote_id: string
          tax_rate?: number
          unit_price_cents: number
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          id?: string
          position?: number
          quantity?: number
          quote_id?: string
          tax_rate?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_business_id_fkey"
            columns: ["quote_id", "business_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          declined_at: string | null
          discount_cents: number
          id: string
          notes: string | null
          number: string | null
          request_details: Json
          request_message: string | null
          sent_at: string | null
          status: string
          subtotal_cents: number
          tax_cents: number
          title: string | null
          total_cents: number
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          declined_at?: string | null
          discount_cents?: number
          id?: string
          notes?: string | null
          number?: string | null
          request_details?: Json
          request_message?: string | null
          sent_at?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          title?: string | null
          total_cents?: number
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          declined_at?: string | null
          discount_cents?: number
          id?: string
          notes?: string | null
          number?: string | null
          request_details?: Json
          request_message?: string | null
          sent_at?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          title?: string | null
          total_cents?: number
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["customer_id", "business_id"]
          },
          {
            foreignKeyName: "quotes_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      reservations: {
        Row: {
          business_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_message: string | null
          employee_id: string | null
          ends_at: string | null
          guest_name: string | null
          id: string
          internal_note: string | null
          party_size: number
          reminder_sent_at: string | null
          service_id: string | null
          source: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_message?: string | null
          employee_id?: string | null
          ends_at?: string | null
          guest_name?: string | null
          id?: string
          internal_note?: string | null
          party_size?: number
          reminder_sent_at?: string | null
          service_id?: string | null
          source?: string
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_message?: string | null
          employee_id?: string | null
          ends_at?: string | null
          guest_name?: string | null
          id?: string
          internal_note?: string | null
          party_size?: number
          reminder_sent_at?: string | null
          service_id?: string | null
          source?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["customer_id", "business_id"]
          },
          {
            foreignKeyName: "reservations_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "reservations_employee_id_business_id_fkey"
            columns: ["employee_id", "business_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "business_id"]
          },
          {
            foreignKeyName: "reservations_service_id_business_id_fkey"
            columns: ["service_id", "business_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_name: string | null
          business_id: string
          content: string | null
          created_at: string
          customer_id: string | null
          external_id: string | null
          id: string
          rating: number
          replied_at: string | null
          reply: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          business_id: string
          content?: string | null
          created_at?: string
          customer_id?: string | null
          external_id?: string | null
          id?: string
          rating: number
          replied_at?: string | null
          reply?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          business_id?: string
          content?: string | null
          created_at?: string
          customer_id?: string | null
          external_id?: string | null
          id?: string
          rating?: number
          replied_at?: string | null
          reply?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["customer_id", "business_id"]
          },
          {
            foreignKeyName: "reviews_customer_id_business_id_fkey"
            columns: ["customer_id", "business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          created_at: string
          currency: string
          description: string | null
          duration_min: number | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          position: number
          price_cents: number | null
          slug: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          position?: number
          price_cents?: number | null
          slug: string
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          position?: number
          price_cents?: number | null
          slug?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          business_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          page_count: number
          pages: string[]
          referrer: string | null
          screen_width: number | null
          session_id: string
          updated_at: string
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          page_count?: number
          pages?: string[]
          referrer?: string | null
          screen_width?: number | null
          session_id: string
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          page_count?: number
          pages?: string[]
          referrer?: string | null
          screen_width?: number | null
          session_id?: string
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number
          business_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          ends_at: string
          id: string
          is_ai_generated: boolean
          note: string | null
          published_at: string | null
          role_label: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          business_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          ends_at: string
          id?: string
          is_ai_generated?: boolean
          note?: string | null
          published_at?: string | null
          role_label?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          ends_at?: string
          id?: string
          is_ai_generated?: boolean
          note?: string | null
          published_at?: string | null
          role_label?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_employee_id_business_id_fkey"
            columns: ["employee_id", "business_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "business_id"]
          },
        ]
      }
      talents: {
        Row: {
          attributes: Json
          avatar_url: string | null
          bio: string | null
          business_id: string
          cover_url: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string
          eye_color: string | null
          first_name: string | null
          gender: string | null
          hair_color: string | null
          height_cm: number | null
          id: string
          is_active: boolean
          languages: string[]
          last_name: string | null
          links: Json
          photos: Json
          portfolio_url: string | null
          position: number
          skills: string[]
          slug: string
          specialties: string[]
          updated_at: string
        }
        Insert: {
          attributes?: Json
          avatar_url?: string | null
          bio?: string | null
          business_id: string
          cover_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name: string
          eye_color?: string | null
          first_name?: string | null
          gender?: string | null
          hair_color?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean
          languages?: string[]
          last_name?: string | null
          links?: Json
          photos?: Json
          portfolio_url?: string | null
          position?: number
          skills?: string[]
          slug: string
          specialties?: string[]
          updated_at?: string
        }
        Update: {
          attributes?: Json
          avatar_url?: string | null
          bio?: string | null
          business_id?: string
          cover_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          eye_color?: string | null
          first_name?: string | null
          gender?: string | null
          hair_color?: string | null
          height_cm?: number | null
          id?: string
          is_active?: boolean
          languages?: string[]
          last_name?: string | null
          links?: Json
          photos?: Json
          portfolio_url?: string | null
          position?: number
          skills?: string[]
          slug?: string
          specialties?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          agency_id: string
          assigned_to: string | null
          business_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          done_at: string | null
          due_at: string | null
          id: string
          labels: string[]
          position: number
          priority: string
          prospect_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          labels?: string[]
          position?: number
          priority?: string
          prospect_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          labels?: string[]
          position?: number
          priority?: string
          prospect_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_prospect_id_agency_id_fkey"
            columns: ["prospect_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id", "agency_id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_ai_generated: boolean
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          attachments?: Json
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          attachments?: Json
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          agency_id: string
          assigned_to: string | null
          business_id: string | null
          category: string | null
          closed_at: string | null
          created_at: string
          id: string
          last_message_at: string | null
          level: string
          opened_by: string | null
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_to?: string | null
          business_id?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          level?: string
          opened_by?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_to?: string | null
          business_id?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          level?: string
          opened_by?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "tickets_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          agency_id: string
          business_id: string
          created_at: string
          event_type: string
          id: string
          idempotency_key: string | null
          meta: Json
          meter: string | null
          module_id: string | null
          profile_id: string | null
          quantity: number
        }
        Insert: {
          agency_id: string
          business_id: string
          created_at?: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          meta?: Json
          meter?: string | null
          module_id?: string | null
          profile_id?: string | null
          quantity?: number
        }
        Update: {
          agency_id?: string
          business_id?: string
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          meta?: Json
          meter?: string | null
          module_id?: string | null
          profile_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_business_id_agency_id_fkey"
            columns: ["business_id", "agency_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id", "agency_id"]
          },
          {
            foreignKeyName: "usage_events_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      campaign_stats: {
        Row: {
          business_id: string | null
          campaign_id: string | null
          clicked: number | null
          delivered: number | null
          failed: number | null
          opened: number | null
          recipients: number | null
        }
        Relationships: []
      }
      customer_stats: {
        Row: {
          business_id: string | null
          customer_id: string | null
          last_visit_at: string | null
          total_spent_cents: number | null
          visit_count: number | null
        }
        Insert: {
          business_id?: string | null
          customer_id?: string | null
          last_visit_at?: never
          total_spent_cents?: never
          visit_count?: never
        }
        Update: {
          business_id?: string | null
          customer_id?: string | null
          last_visit_at?: never
          total_spent_cents?: never
          visit_count?: never
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      accessible_agency_ids: { Args: { min_role?: string }; Returns: string[] }
      accessible_business_ids: {
        Args: { min_role?: string }
        Returns: string[]
      }
      assert_not_last_agency_owner: {
        Args: { m: Database["public"]["Tables"]["memberships"]["Row"] }
        Returns: undefined
      }
      change_member_role: {
        Args: { p_membership: string; p_role: string }
        Returns: undefined
      }
      effective_rank: {
        Args: { p_agency: string; p_business: string }
        Returns: number
      }
      has_feature: {
        Args: { p_business: string; p_module: string }
        Returns: boolean
      }
      invite_member: {
        Args: {
          p_agency: string
          p_business: string
          p_email: string
          p_message?: string
          p_role: string
        }
        Returns: string
      }
      is_platform_admin: { Args: never; Returns: boolean }
      next_document_number: {
        Args: { p_business: string; p_kind: string }
        Returns: string
      }
      remove_member: { Args: { p_membership: string }; Returns: undefined }
      role_rank: { Args: { r: string }; Returns: number }
      visible_agency_ids: { Args: never; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
