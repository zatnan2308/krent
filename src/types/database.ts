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
      about_milestones: {
        Row: {
          body: string
          created_at: string
          id: string
          organization_id: string
          sort_order: number
          title: string
          year: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          organization_id: string
          sort_order?: number
          title?: string
          year?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          sort_order?: number
          title?: string
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "about_milestones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      about_page: {
        Row: {
          hero_title: string | null
          organization_id: string
          quote_1: string | null
          quote_2: string | null
          story_body: string | null
          story_heading: string | null
          updated_at: string
        }
        Insert: {
          hero_title?: string | null
          organization_id: string
          quote_1?: string | null
          quote_2?: string | null
          story_body?: string | null
          story_heading?: string | null
          updated_at?: string
        }
        Update: {
          hero_title?: string | null
          organization_id?: string
          quote_1?: string | null
          quote_2?: string | null
          story_body?: string | null
          story_heading?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "about_page_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_translations: {
        Row: {
          entity_key: string
          entity_type: string
          fields: Json
          locale: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          entity_key?: string
          entity_type: string
          fields?: Json
          locale: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          entity_key?: string
          entity_type?: string
          fields?: Json
          locale?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_translations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaign_reports: {
        Row: {
          clicks: number
          conversions: number
          created_at: string
          currency: string
          date: string
          external_campaign_id: string
          id: string
          impressions: number
          leads: number
          level: string
          name: string
          organization_id: string
          parent_id: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          spend: number
        }
        Insert: {
          clicks?: number
          conversions?: number
          created_at?: string
          currency?: string
          date: string
          external_campaign_id: string
          id?: string
          impressions?: number
          leads?: number
          level?: string
          name: string
          organization_id: string
          parent_id?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          spend?: number
        }
        Update: {
          clicks?: number
          conversions?: number
          created_at?: string
          currency?: string
          date?: string
          external_campaign_id?: string
          id?: string
          impressions?: number
          leads?: number
          level?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaign_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_feed_settings: {
        Row: {
          agent_website_connection_id: string
          created_at: string
          default_currency: string
          default_locale: string
          include_fields: Json
          organization_id: string
          updated_at: string
        }
        Insert: {
          agent_website_connection_id: string
          created_at?: string
          default_currency?: string
          default_locale?: string
          include_fields?: Json
          organization_id: string
          updated_at?: string
        }
        Update: {
          agent_website_connection_id?: string
          created_at?: string
          default_currency?: string
          default_locale?: string
          include_fields?: Json
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_feed_settings_agent_website_connection_id_fkey"
            columns: ["agent_website_connection_id"]
            isOneToOne: true
            referencedRelation: "agent_website_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feed_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_profiles: {
        Row: {
          bio: string | null
          created_at: string
          organization_id: string
          phone: string | null
          photo_url: string | null
          rera_number: string | null
          specialization: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          organization_id: string
          phone?: string | null
          photo_url?: string | null
          rera_number?: string | null
          specialization?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          organization_id?: string
          phone?: string | null
          photo_url?: string | null
          rera_number?: string | null
          specialization?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_website_connections: {
        Row: {
          agent_id: string
          brand_settings: Json
          canonical_owner: Database["public"]["Enums"]["agent_canonical_owner"]
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          primary_domain: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          brand_settings?: Json
          canonical_owner?: Database["public"]["Enums"]["agent_canonical_owner"]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          primary_domain?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          brand_settings?: Json
          canonical_owner?: Database["public"]["Enums"]["agent_canonical_owner"]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          primary_domain?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_website_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      amenities: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          key: string
          name: string
          organization_id: string | null
          sort_order: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          key: string
          name: string
          organization_id?: string | null
          sort_order?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          key?: string
          name?: string
          organization_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "amenities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "amenity_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amenities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      amenity_categories: {
        Row: {
          created_at: string
          id: string
          key: string
          name: string
          organization_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          name: string
          organization_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          name?: string
          organization_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "amenity_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          occurred_at: string
          organization_id: string
          path: string | null
          payload: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          organization_id: string
          path?: string | null
          payload?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          organization_id?: string
          path?: string | null
          payload?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device: string | null
          first_landing_page: string | null
          first_seen_at: string
          id: string
          last_landing_page: string | null
          last_seen_at: string
          organization_id: string
          page_view_count: number
          referrer: string | null
          session_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          first_landing_page?: string | null
          first_seen_at?: string
          id?: string
          last_landing_page?: string | null
          last_seen_at?: string
          organization_id: string
          page_view_count?: number
          referrer?: string | null
          session_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          first_landing_page?: string | null
          first_seen_at?: string
          id?: string
          last_landing_page?: string | null
          last_seen_at?: string
          organization_id?: string
          page_view_count?: number
          referrer?: string | null
          session_id?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          agent_id: string | null
          allowed_domains: string[]
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          organization_id: string
          rate_limit_per_minute: number
          revoked_at: string | null
          scopes: string[]
          status: Database["public"]["Enums"]["api_key_status"]
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          allowed_domains?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          organization_id: string
          rate_limit_per_minute?: number
          revoked_at?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["api_key_status"]
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          allowed_domains?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          rate_limit_per_minute?: number
          revoked_at?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["api_key_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          api_key_id: string
          created_at: string
          id: string
          organization_id: string
          request_count: number
          window_start: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          id?: string
          organization_id: string
          request_count?: number
          window_start: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_rate_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_scopes: {
        Row: {
          created_at: string
          description: string
          key: string
        }
        Insert: {
          created_at?: string
          description: string
          key: string
        }
        Update: {
          created_at?: string
          description?: string
          key?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          id: string
          ip: string | null
          method: string
          occurred_at: string
          organization_id: string
          path: string
          status: number
        }
        Insert: {
          api_key_id?: string | null
          id?: string
          ip?: string | null
          method: string
          occurred_at?: string
          organization_id: string
          path: string
          status: number
        }
        Update: {
          api_key_id?: string | null
          id?: string
          ip?: string | null
          method?: string
          occurred_at?: string
          organization_id?: string
          path?: string
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          trigger_event: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          trigger_event?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          trigger_event?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          automation_flow_id: string
          contact_id: string | null
          context: Json
          created_at: string
          id: string
          last_error: string | null
          next_run_at: string
          organization_id: string
          status: string
          step_index: number
          subject_id: string | null
          subject_type: string | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          automation_flow_id: string
          contact_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          last_error?: string | null
          next_run_at?: string
          organization_id: string
          status?: string
          step_index?: number
          subject_id?: string | null
          subject_type?: string | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          automation_flow_id?: string
          contact_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          last_error?: string | null
          next_run_at?: string
          organization_id?: string
          status?: string
          step_index?: number
          subject_id?: string | null
          subject_type?: string | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_flow_id_fkey"
            columns: ["automation_flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_steps: {
        Row: {
          automation_flow_id: string
          config: Json
          created_at: string
          id: string
          organization_id: string
          sort_order: number
          step_type: string
        }
        Insert: {
          automation_flow_id: string
          config?: Json
          created_at?: string
          id?: string
          organization_id: string
          sort_order?: number
          step_type: string
        }
        Update: {
          automation_flow_id?: string
          config?: Json
          created_at?: string
          id?: string
          organization_id?: string
          sort_order?: number
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_steps_automation_flow_id_fkey"
            columns: ["automation_flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_settings: {
        Row: {
          accent_color: string | null
          acq_agency_pct: number
          acq_registration_pct: number
          acq_transfer_pct: number
          contact_address: string | null
          contact_email: string | null
          contact_messenger: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          custom_css: string | null
          favicon_url: string | null
          font_family: string | null
          footer_tagline: string | null
          header_tagline: string | null
          logo_url: string | null
          newsletter_blurb: string | null
          newsletter_title: string | null
          office_hours: string | null
          organization_id: string
          primary_color: string | null
          response_time: string | null
          secondary_color: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_x: string | null
          social_youtube: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          acq_agency_pct?: number
          acq_registration_pct?: number
          acq_transfer_pct?: number
          contact_address?: string | null
          contact_email?: string | null
          contact_messenger?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          font_family?: string | null
          footer_tagline?: string | null
          header_tagline?: string | null
          logo_url?: string | null
          newsletter_blurb?: string | null
          newsletter_title?: string | null
          office_hours?: string | null
          organization_id: string
          primary_color?: string | null
          response_time?: string | null
          secondary_color?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_x?: string | null
          social_youtube?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          acq_agency_pct?: number
          acq_registration_pct?: number
          acq_transfer_pct?: number
          contact_address?: string | null
          contact_email?: string | null
          contact_messenger?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          font_family?: string | null
          footer_tagline?: string | null
          header_tagline?: string | null
          logo_url?: string | null
          newsletter_blurb?: string | null
          newsletter_title?: string | null
          office_hours?: string | null
          organization_id?: string
          primary_color?: string | null
          response_time?: string | null
          secondary_color?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_x?: string | null
          social_youtube?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_blocks: {
        Row: {
          block_type: string
          campaign_id: string
          content: Json
          created_at: string
          id: string
          organization_id: string
          sort_order: number
        }
        Insert: {
          block_type: string
          campaign_id: string
          content?: Json
          created_at?: string
          id?: string
          organization_id: string
          sort_order?: number
        }
        Update: {
          block_type?: string
          campaign_id?: string
          content?: Json
          created_at?: string
          id?: string
          organization_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_blocks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          email: string
          email_send_id: string | null
          id: string
          opened_at: string | null
          organization_id: string
          reason: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_recipient_status"]
          unsubscribe_token: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email: string
          email_send_id?: string | null
          id?: string
          opened_at?: string | null
          organization_id: string
          reason?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_recipient_status"]
          unsubscribe_token: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email?: string
          email_send_id?: string | null
          id?: string
          opened_at?: string | null
          organization_id?: string
          reason?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_recipient_status"]
          unsubscribe_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_reports: {
        Row: {
          campaign_id: string
          clicked_count: number
          created_at: string
          delivered_count: number
          failed_count: number
          id: string
          opened_count: number
          organization_id: string
          sent_count: number
          skipped_count: number
          total_recipients: number
          unsubscribed_count: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          clicked_count?: number
          created_at?: string
          delivered_count?: number
          failed_count?: number
          id?: string
          opened_count?: number
          organization_id: string
          sent_count?: number
          skipped_count?: number
          total_recipients?: number
          unsubscribed_count?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          clicked_count?: number
          created_at?: string
          delivered_count?: number
          failed_count?: number
          id?: string
          opened_count?: number
          organization_id?: string
          sent_count?: number
          skipped_count?: number
          total_recipients?: number
          unsubscribed_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_reports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          blocks: Json
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          language: string
          name: string
          organization_id: string
          preview_text: string
          scheduled_at: string | null
          segment_id: string | null
          sender_name: string
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          name: string
          organization_id: string
          preview_text?: string
          scheduled_at?: string | null
          segment_id?: string | null
          sender_name?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          name?: string
          organization_id?: string
          preview_text?: string
          scheduled_at?: string | null
          segment_id?: string | null
          sender_name?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "contact_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_attachments: {
        Row: {
          conversation_id: string
          created_at: string
          file_name: string
          file_size: number
          file_type: Database["public"]["Enums"]["attachment_type"]
          file_url: string
          id: string
          message_id: string
          mime_type: string
          organization_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          file_name: string
          file_size: number
          file_type: Database["public"]["Enums"]["attachment_type"]
          file_url: string
          id?: string
          message_id: string
          mime_type: string
          organization_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: Database["public"]["Enums"]["attachment_type"]
          file_url?: string
          id?: string
          message_id?: string
          mime_type?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string | null
          lead_id: string | null
          organization_id: string
          property_id: string | null
          seller_report_id: string | null
          title: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          organization_id: string
          property_id?: string | null
          seller_report_id?: string | null
          title?: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          organization_id?: string
          property_id?: string | null
          seller_report_id?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          message_type: Database["public"]["Enums"]["message_type"]
          organization_id: string
          sender_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          organization_id: string
          sender_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          organization_id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          organization_id: string
          portal_account_id: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          organization_id: string
          portal_account_id?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          portal_account_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_consents: {
        Row: {
          consent_type: string
          contact_id: string
          created_at: string
          granted_at: string | null
          id: string
          organization_id: string
          source: string | null
          status: Database["public"]["Enums"]["consent_status"]
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          consent_type?: string
          contact_id: string
          created_at?: string
          granted_at?: string | null
          id?: string
          organization_id: string
          source?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          consent_type?: string
          contact_id?: string
          created_at?: string
          granted_at?: string | null
          id?: string
          organization_id?: string
          source?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_consents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_segment_members: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          organization_id: string
          segment_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          organization_id: string
          segment_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_segment_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_segment_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "contact_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_segments: {
        Row: {
          created_at: string
          definition: Json
          description: string | null
          id: string
          is_system: boolean
          last_refreshed_at: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          definition?: Json
          description?: string | null
          id?: string
          is_system?: boolean
          last_refreshed_at?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          definition?: Json
          description?: string | null
          id?: string
          is_system?: boolean
          last_refreshed_at?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_buyer_profiles: {
        Row: {
          contact_id: string
          created_at: string
          currency: string | null
          current_housing: string | null
          down_payment: number | null
          id: string
          lender_name: string | null
          needs_to_sell_first: boolean
          organization_id: string
          area_max: number | null
          area_min: number | null
          baths_min: number | null
          beds_min: number | null
          budget_max: number | null
          budget_min: number | null
          deal_type: string | null
          locations: string[]
          must_have: string | null
          payment_method: string | null
          preapproval_amount: number | null
          preapproval_status: string | null
          property_type: string | null
          search_notes: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          currency?: string | null
          current_housing?: string | null
          down_payment?: number | null
          id?: string
          lender_name?: string | null
          needs_to_sell_first?: boolean
          organization_id: string
          area_max?: number | null
          area_min?: number | null
          baths_min?: number | null
          beds_min?: number | null
          budget_max?: number | null
          budget_min?: number | null
          deal_type?: string | null
          locations?: string[]
          must_have?: string | null
          payment_method?: string | null
          preapproval_amount?: number | null
          preapproval_status?: string | null
          property_type?: string | null
          search_notes?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          currency?: string | null
          current_housing?: string | null
          down_payment?: number | null
          id?: string
          lender_name?: string | null
          needs_to_sell_first?: boolean
          organization_id?: string
          area_max?: number | null
          area_min?: number | null
          baths_min?: number | null
          beds_min?: number | null
          budget_max?: number | null
          budget_min?: number | null
          deal_type?: string | null
          locations?: string[]
          must_have?: string | null
          payment_method?: string | null
          preapproval_amount?: number | null
          preapproval_status?: string | null
          property_type?: string | null
          search_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_buyer_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_buyer_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_relationships: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          organization_id: string
          related_contact_id: string | null
          related_name: string | null
          relationship_type: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          organization_id: string
          related_contact_id?: string | null
          related_name?: string | null
          relationship_type?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          related_contact_id?: string | null
          related_name?: string | null
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_relationships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_relationships_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address_line: string | null
          assigned_agent_id: string | null
          best_time_to_contact: string | null
          city: string | null
          company_name: string | null
          contact_kind: string
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          job_title: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          preferred_channel: string | null
          preferred_currency: string | null
          preferred_language: string | null
          lead_score: number | null
          lifecycle_stage: string
          priority: string | null
          referral_note: string | null
          referred_by_contact_id: string | null
          role: string | null
          secondary_email: string | null
          secondary_phone: string | null
          tags: string[]
          temperature: string | null
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          assigned_agent_id?: string | null
          best_time_to_contact?: string | null
          city?: string | null
          company_name?: string | null
          contact_kind?: string
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          job_title?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          preferred_channel?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          lead_score?: number | null
          lifecycle_stage?: string
          priority?: string | null
          referral_note?: string | null
          referred_by_contact_id?: string | null
          role?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          tags?: string[]
          temperature?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          assigned_agent_id?: string | null
          best_time_to_contact?: string | null
          city?: string | null
          company_name?: string | null
          contact_kind?: string
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          preferred_channel?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          lead_score?: number | null
          lifecycle_stage?: string
          priority?: string | null
          referral_note?: string | null
          referred_by_contact_id?: string | null
          role?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          tags?: string[]
          temperature?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_referred_by_contact_id_fkey"
            columns: ["referred_by_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_payment_proofs: {
        Row: {
          amount: number | null
          currency: string | null
          id: string
          network: string | null
          notes: string | null
          organization_id: string
          proof_url: string | null
          rental_payment_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["crypto_proof_status"]
          submitted_at: string
          tx_hash: string | null
        }
        Insert: {
          amount?: number | null
          currency?: string | null
          id?: string
          network?: string | null
          notes?: string | null
          organization_id: string
          proof_url?: string | null
          rental_payment_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["crypto_proof_status"]
          submitted_at?: string
          tx_hash?: string | null
        }
        Update: {
          amount?: number | null
          currency?: string | null
          id?: string
          network?: string | null
          notes?: string | null
          organization_id?: string
          proof_url?: string | null
          rental_payment_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["crypto_proof_status"]
          submitted_at?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crypto_payment_proofs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_payment_proofs_rental_payment_id_fkey"
            columns: ["rental_payment_id"]
            isOneToOne: false
            referencedRelation: "rental_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stages: {
        Row: {
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          key: string
          name: string
          organization_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          key: string
          name: string
          organization_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          key?: string
          name?: string
          organization_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          amount: number | null
          assigned_agent_id: string | null
          contact_id: string
          created_at: string
          currency: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          organization_id: string
          property_id: string | null
          stage_id: string | null
          status: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          assigned_agent_id?: string | null
          contact_id: string
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          organization_id: string
          property_id?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          assigned_agent_id?: string | null
          contact_id?: string
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string
          property_id?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["domain_status"]
          type: Database["public"]["Enums"]["domain_type"]
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          organization_id: string
          status?: Database["public"]["Enums"]["domain_status"]
          type?: Database["public"]["Enums"]["domain_type"]
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["domain_status"]
          type?: Database["public"]["Enums"]["domain_type"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_bounces: {
        Row: {
          bounce_type: string | null
          email: string
          email_send_id: string | null
          id: string
          organization_id: string | null
          payload: Json
          provider_message_id: string | null
          received_at: string
        }
        Insert: {
          bounce_type?: string | null
          email: string
          email_send_id?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json
          provider_message_id?: string | null
          received_at?: string
        }
        Update: {
          bounce_type?: string | null
          email?: string
          email_send_id?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json
          provider_message_id?: string | null
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_bounces_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_bounces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_complaints: {
        Row: {
          email: string
          email_send_id: string | null
          id: string
          organization_id: string | null
          payload: Json
          provider_message_id: string | null
          received_at: string
        }
        Insert: {
          email: string
          email_send_id?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json
          provider_message_id?: string | null
          received_at?: string
        }
        Update: {
          email?: string
          email_send_id?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json
          provider_message_id?: string | null
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_complaints_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_complaints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          created_at: string
          error: string | null
          id: string
          notification_event_id: string | null
          organization_id: string
          provider: string
          provider_message_id: string | null
          provider_response: Json
          sent_at: string | null
          status: Database["public"]["Enums"]["email_send_status"]
          subject: string
          template_key: string | null
          to_email: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          notification_event_id?: string | null
          organization_id: string
          provider?: string
          provider_message_id?: string | null
          provider_response?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_send_status"]
          subject: string
          template_key?: string | null
          to_email: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          notification_event_id?: string | null
          organization_id?: string
          provider?: string
          provider_message_id?: string | null
          provider_response?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_send_status"]
          subject?: string
          template_key?: string | null
          to_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_notification_event_id_fkey"
            columns: ["notification_event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          name: string
          organization_id: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          body_text?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          organization_id?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          body_text?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          organization_id?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribes: {
        Row: {
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          email: string
          id: string
          organization_id: string
          source: string | null
        }
        Insert: {
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          email: string
          id?: string
          organization_id: string
          source?: string | null
        }
        Update: {
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string
          id?: string
          organization_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_unsubscribes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_unsubscribes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_unsubscribes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_domains: {
        Row: {
          agent_website_connection_id: string | null
          created_at: string
          domain: string
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["external_domain_status"]
        }
        Insert: {
          agent_website_connection_id?: string | null
          created_at?: string
          domain: string
          id?: string
          organization_id: string
          status?: Database["public"]["Enums"]["external_domain_status"]
        }
        Update: {
          agent_website_connection_id?: string | null
          created_at?: string
          domain?: string
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["external_domain_status"]
        }
        Relationships: [
          {
            foreignKeyName: "external_domains_agent_website_connection_id_fkey"
            columns: ["agent_website_connection_id"]
            isOneToOne: false
            referencedRelation: "agent_website_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_properties: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          organization_id: string
          property_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          property_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_properties_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_connections: {
        Row: {
          created_at: string
          currency: string | null
          customer_id: string
          id: string
          integration_connection_id: string
          manager_customer_id: string | null
          organization_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customer_id: string
          id?: string
          integration_connection_id: string
          manager_customer_id?: string | null
          organization_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          customer_id?: string
          id?: string
          integration_connection_id?: string
          manager_customer_id?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_connections_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_ads_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_search_console_connections: {
        Row: {
          created_at: string
          id: string
          integration_connection_id: string
          organization_id: string
          site_url: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          integration_connection_id: string
          organization_id: string
          site_url: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          integration_connection_id?: string
          organization_id?: string
          site_url?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "google_search_console_connection_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_search_console_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_about: {
        Row: {
          body: string
          body_2: string | null
          cta_href: string
          cta_label: string
          eyebrow_text: string
          headline: string
          headline_accent: string | null
          headline_suffix: string | null
          metric_1_label: string | null
          metric_1_value: string | null
          metric_2_label: string | null
          metric_2_value: string | null
          metric_3_label: string | null
          metric_3_value: string | null
          metric_4_label: string | null
          metric_4_value: string | null
          organization_id: string
          portrait_url: string | null
          updated_at: string
        }
        Insert: {
          body?: string
          body_2?: string | null
          cta_href?: string
          cta_label?: string
          eyebrow_text?: string
          headline?: string
          headline_accent?: string | null
          headline_suffix?: string | null
          metric_1_label?: string | null
          metric_1_value?: string | null
          metric_2_label?: string | null
          metric_2_value?: string | null
          metric_3_label?: string | null
          metric_3_value?: string | null
          metric_4_label?: string | null
          metric_4_value?: string | null
          organization_id: string
          portrait_url?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          body_2?: string | null
          cta_href?: string
          cta_label?: string
          eyebrow_text?: string
          headline?: string
          headline_accent?: string | null
          headline_suffix?: string | null
          metric_1_label?: string | null
          metric_1_value?: string | null
          metric_2_label?: string | null
          metric_2_value?: string | null
          metric_3_label?: string | null
          metric_3_value?: string | null
          metric_4_label?: string | null
          metric_4_value?: string | null
          organization_id?: string
          portrait_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_about_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_cta: {
        Row: {
          eyebrow_text: string
          headline_italic: string
          headline_left: string
          headline_right: string
          organization_id: string
          primary_cta_href: string
          primary_cta_label: string
          secondary_cta_href: string
          secondary_cta_label: string
          subtitle: string
          updated_at: string
        }
        Insert: {
          eyebrow_text?: string
          headline_italic?: string
          headline_left?: string
          headline_right?: string
          organization_id: string
          primary_cta_href?: string
          primary_cta_label?: string
          secondary_cta_href?: string
          secondary_cta_label?: string
          subtitle?: string
          updated_at?: string
        }
        Update: {
          eyebrow_text?: string
          headline_italic?: string
          headline_left?: string
          headline_right?: string
          organization_id?: string
          primary_cta_href?: string
          primary_cta_label?: string
          secondary_cta_href?: string
          secondary_cta_label?: string
          subtitle?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_cta_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_hero: {
        Row: {
          background_image_url: string | null
          eyebrow_chips: string[]
          eyebrow_text: string
          headline_bottom_italic: string
          headline_top: string
          organization_id: string
          primary_cta_href: string
          primary_cta_label: string
          secondary_cta_href: string
          secondary_cta_label: string
          subtitle: string
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          eyebrow_chips?: string[]
          eyebrow_text?: string
          headline_bottom_italic?: string
          headline_top?: string
          organization_id: string
          primary_cta_href?: string
          primary_cta_label?: string
          secondary_cta_href?: string
          secondary_cta_label?: string
          subtitle?: string
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          eyebrow_chips?: string[]
          eyebrow_text?: string
          headline_bottom_italic?: string
          headline_top?: string
          organization_id?: string
          primary_cta_href?: string
          primary_cta_label?: string
          secondary_cta_href?: string
          secondary_cta_label?: string
          subtitle?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_hero_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_intent_options: {
        Row: {
          created_at: string
          description: string | null
          href: string | null
          id: string
          organization_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          href?: string | null
          id?: string
          organization_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          href?: string | null
          id?: string
          organization_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_intent_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_markets: {
        Row: {
          badge: string | null
          blurb: string | null
          created_at: string
          href: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          name: string
          organization_id: string
          region: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge?: string | null
          blurb?: string | null
          created_at?: string
          href?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name: string
          organization_id: string
          region?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge?: string | null
          blurb?: string | null
          created_at?: string
          href?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name?: string
          organization_id?: string
          region?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_markets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_press_logos: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_press_logos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_process_steps: {
        Row: {
          body: string | null
          created_at: string
          id: string
          organization_id: string
          sort_order: number
          step_number: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          organization_id: string
          sort_order?: number
          step_number: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          sort_order?: number
          step_number?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_process_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_reasons: {
        Row: {
          body: string | null
          created_at: string
          id: string
          organization_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          organization_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_reasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_sections: {
        Row: {
          accent: string | null
          body: string | null
          eyebrow: string | null
          image_url: string | null
          lead: string | null
          organization_id: string
          section_key: string
          subtitle: string | null
          updated_at: string
        }
        Insert: {
          accent?: string | null
          body?: string | null
          eyebrow?: string | null
          image_url?: string | null
          lead?: string | null
          organization_id: string
          section_key: string
          subtitle?: string | null
          updated_at?: string
        }
        Update: {
          accent?: string | null
          body?: string | null
          eyebrow?: string | null
          image_url?: string | null
          lead?: string | null
          organization_id?: string
          section_key?: string
          subtitle?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_stats: {
        Row: {
          created_at: string
          id: string
          label: string
          organization_id: string
          sort_order: number
          suffix: string | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          organization_id: string
          sort_order?: number
          suffix?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          organization_id?: string
          sort_order?: number
          suffix?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_testimonials: {
        Row: {
          author_name: string | null
          created_at: string
          deal_label: string | null
          id: string
          organization_id: string
          quote: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          created_at?: string
          deal_label?: string | null
          id?: string
          organization_id: string
          quote: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          created_at?: string
          deal_label?: string | null
          id?: string
          organization_id?: string
          quote?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_testimonials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      home_trust_badges: {
        Row: {
          created_at: string
          id: string
          label: string
          organization_id: string
          sort_order: number
          sub: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          organization_id: string
          sort_order?: number
          sub?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          organization_id?: string
          sort_order?: number
          sub?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_trust_badges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_export_tokens: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          is_active: boolean
          last_accessed_at: string | null
          organization_id: string
          token: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          organization_id: string
          token: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          organization_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_export_tokens_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "rental_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ical_export_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_import_sources: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          name: string
          organization_id: string
          provider: Database["public"]["Enums"]["ical_provider"]
          updated_at: string
          url: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          name: string
          organization_id: string
          provider?: Database["public"]["Enums"]["ical_provider"]
          updated_at?: string
          url: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          name?: string
          organization_id?: string
          provider?: Database["public"]["Enums"]["ical_provider"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_import_sources_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "rental_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ical_import_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_sync_logs: {
        Row: {
          created_at: string
          events_imported: number
          id: string
          import_source_id: string
          message: string | null
          organization_id: string
          status: Database["public"]["Enums"]["ical_sync_status"]
        }
        Insert: {
          created_at?: string
          events_imported?: number
          id?: string
          import_source_id: string
          message?: string | null
          organization_id: string
          status: Database["public"]["Enums"]["ical_sync_status"]
        }
        Update: {
          created_at?: string
          events_imported?: number
          id?: string
          import_source_id?: string
          message?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["ical_sync_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ical_sync_logs_import_source_id_fkey"
            columns: ["import_source_id"]
            isOneToOne: false
            referencedRelation: "ical_import_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ical_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          error_message: string | null
          id: string
          last_synced_at: string | null
          organization_id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          scopes: string[]
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          scopes?: string[]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          scopes?: string[]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_tokens: {
        Row: {
          created_at: string
          encrypted_value: string
          expires_at: string | null
          id: string
          integration_connection_id: string
          organization_id: string
          token_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_value: string
          expires_at?: string | null
          id?: string
          integration_connection_id: string
          organization_id: string
          token_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_value?: string
          expires_at?: string | null
          id?: string
          integration_connection_id?: string
          organization_id?: string
          token_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_tokens_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_attribution: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device: Database["public"]["Enums"]["device_type"]
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          first_page: string | null
          gbraid: string | null
          gclid: string | null
          id: string
          landing_page: string | null
          last_page: string | null
          lead_id: string
          organization_id: string
          referrer: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          wbraid: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device?: Database["public"]["Enums"]["device_type"]
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          first_page?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          landing_page?: string | null
          last_page?: string | null
          lead_id: string
          organization_id: string
          referrer?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          wbraid?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device?: Database["public"]["Enums"]["device_type"]
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          first_page?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          landing_page?: string | null
          last_page?: string | null
          lead_id?: string
          organization_id?: string
          referrer?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          wbraid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_attribution_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_attribution_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string
          id: string
          key: string
          name: string
          organization_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          name: string
          organization_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          name?: string
          organization_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          contact_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          organization_id: string
          portal_visible: boolean
          property_id: string | null
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          organization_id: string
          portal_visible?: boolean
          property_id?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          portal_visible?: boolean
          property_id?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_agent_id: string | null
          budget_max: number | null
          budget_min: number | null
          contact_id: string
          created_at: string
          currency: string | null
          id: string
          language: string | null
          location_interest: string | null
          message: string | null
          organization_id: string
          property_id: string | null
          scheduled_at: string | null
          source: string | null
          source_domain: string | null
          status: Database["public"]["Enums"]["lead_status"]
          type: Database["public"]["Enums"]["lead_type"]
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          contact_id: string
          created_at?: string
          currency?: string | null
          id?: string
          language?: string | null
          location_interest?: string | null
          message?: string | null
          organization_id: string
          property_id?: string | null
          scheduled_at?: string | null
          source?: string | null
          source_domain?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          type?: Database["public"]["Enums"]["lead_type"]
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          contact_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          language?: string | null
          location_interest?: string | null
          message?: string | null
          organization_id?: string
          property_id?: string | null
          scheduled_at?: string | null
          source?: string | null
          source_domain?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          type?: Database["public"]["Enums"]["lead_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          body: string | null
          doc_key: string
          organization_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          doc_key: string
          organization_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          doc_key?: string
          organization_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          client_email: string | null
          client_name: string | null
          domain: string | null
          expires_at: string | null
          id: string
          installation_type: Database["public"]["Enums"]["license_installation_type"]
          issued_at: string
          license_key: string
          notes: string | null
          organization_id: string
          product_version: string | null
          status: Database["public"]["Enums"]["license_status"]
          support_until: string | null
          updates_until: string | null
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          domain?: string | null
          expires_at?: string | null
          id?: string
          installation_type?: Database["public"]["Enums"]["license_installation_type"]
          issued_at?: string
          license_key: string
          notes?: string | null
          organization_id: string
          product_version?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          support_until?: string | null
          updates_until?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          domain?: string | null
          expires_at?: string | null
          id?: string
          installation_type?: Database["public"]["Enums"]["license_installation_type"]
          issued_at?: string
          license_key?: string
          notes?: string | null
          organization_id?: string
          product_version?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          support_until?: string | null
          updates_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_attachments: {
        Row: {
          conversation_id: string
          created_at: string
          external_media_id: string | null
          file_name: string
          file_size: number
          file_type: Database["public"]["Enums"]["attachment_type"]
          file_url: string
          id: string
          message_id: string
          mime_type: string
          organization_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          external_media_id?: string | null
          file_name: string
          file_size?: number
          file_type: Database["public"]["Enums"]["attachment_type"]
          file_url: string
          id?: string
          message_id: string
          mime_type: string
          organization_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          external_media_id?: string | null
          file_name?: string
          file_size?: number
          file_type?: Database["public"]["Enums"]["attachment_type"]
          file_url?: string
          id?: string
          message_id?: string
          mime_type?: string
          organization_id?: string
        }
        Relationships: []
      }
      messaging_connections: {
        Row: {
          bot_username: string | null
          channel: Database["public"]["Enums"]["messaging_channel"]
          created_at: string
          created_by: string | null
          display_name: string | null
          encrypted_token: string | null
          error_message: string | null
          id: string
          organization_id: string
          page_id: string | null
          page_name: string | null
          phone_display: string | null
          phone_number_id: string | null
          status: Database["public"]["Enums"]["messaging_connection_status"]
          updated_at: string
          waba_id: string | null
          webhook_token: string | null
        }
        Insert: {
          bot_username?: string | null
          channel: Database["public"]["Enums"]["messaging_channel"]
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          encrypted_token?: string | null
          error_message?: string | null
          id?: string
          organization_id: string
          page_id?: string | null
          page_name?: string | null
          phone_display?: string | null
          phone_number_id?: string | null
          status?: Database["public"]["Enums"]["messaging_connection_status"]
          updated_at?: string
          waba_id?: string | null
          webhook_token?: string | null
        }
        Update: {
          bot_username?: string | null
          channel?: Database["public"]["Enums"]["messaging_channel"]
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          encrypted_token?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string
          page_id?: string | null
          page_name?: string | null
          phone_display?: string | null
          phone_number_id?: string | null
          status?: Database["public"]["Enums"]["messaging_connection_status"]
          updated_at?: string
          waba_id?: string | null
          webhook_token?: string | null
        }
        Relationships: []
      }
      messaging_conversations: {
        Row: {
          assigned_agent_id: string | null
          channel: Database["public"]["Enums"]["messaging_channel"]
          channel_identity_id: string | null
          connection_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          last_inbound_at: string | null
          last_message_at: string | null
          lead_id: string | null
          organization_id: string
          property_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          channel: Database["public"]["Enums"]["messaging_channel"]
          channel_identity_id?: string | null
          connection_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          organization_id: string
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          channel?: Database["public"]["Enums"]["messaging_channel"]
          channel_identity_id?: string | null
          connection_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          organization_id?: string
          property_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messaging_messages: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["messaging_channel"]
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["messaging_direction"]
          error_message: string | null
          external_message_id: string | null
          id: string
          organization_id: string
          sender_user_id: string | null
          status: Database["public"]["Enums"]["messaging_message_status"]
        }
        Insert: {
          body?: string
          channel: Database["public"]["Enums"]["messaging_channel"]
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["messaging_direction"]
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          organization_id: string
          sender_user_id?: string | null
          status?: Database["public"]["Enums"]["messaging_message_status"]
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["messaging_channel"]
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["messaging_direction"]
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          organization_id?: string
          sender_user_id?: string | null
          status?: Database["public"]["Enums"]["messaging_message_status"]
        }
        Relationships: []
      }
      messaging_read_state: {
        Row: {
          conversation_id: string
          last_read_at: string
          organization_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          organization_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_channel_identities: {
        Row: {
          channel: Database["public"]["Enums"]["messaging_channel"]
          contact_id: string
          created_at: string
          external_id: string
          handle: string | null
          id: string
          organization_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["messaging_channel"]
          contact_id: string
          created_at?: string
          external_id: string
          handle?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["messaging_channel"]
          contact_id?: string
          created_at?: string
          external_id?: string
          handle?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads_connections: {
        Row: {
          ad_account_id: string
          business_id: string | null
          created_at: string
          currency: string | null
          id: string
          integration_connection_id: string
          organization_id: string
        }
        Insert: {
          ad_account_id: string
          business_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          integration_connection_id: string
          organization_id: string
        }
        Update: {
          ad_account_id?: string
          business_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          integration_connection_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_connections_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_ads_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      navigation_items: {
        Row: {
          created_at: string
          id: string
          label: string
          menu_id: string
          organization_id: string
          page_id: string | null
          parent_id: string | null
          position: number
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          menu_id: string
          organization_id: string
          page_id?: string | null
          parent_id?: string | null
          position?: number
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          menu_id?: string
          organization_id?: string
          page_id?: string | null
          parent_id?: string | null
          position?: number
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "navigation_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_items_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_menus: {
        Row: {
          created_at: string
          id: string
          key: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_menus_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nearby_places: {
        Row: {
          category: string | null
          created_at: string
          distance: number | null
          distance_unit: string | null
          id: string
          name: string
          organization_id: string
          property_id: string
          sort_order: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          distance?: number | null
          distance_unit?: string | null
          id?: string
          name: string
          organization_id: string
          property_id: string
          sort_order?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          distance?: number | null
          distance_unit?: string | null
          id?: string
          name?: string
          organization_id?: string
          property_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "nearby_places_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nearby_places_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string | null
          body: string
          contact_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          lead_id: string | null
          organization_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          organization_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error: string | null
          event_type: string
          id: string
          organization_id: string
          payload: Json
          processed_at: string | null
          status: Database["public"]["Enums"]["notification_event_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error?: string | null
          event_type: string
          id?: string
          organization_id: string
          payload?: Json
          processed_at?: string | null
          status?: Database["public"]["Enums"]["notification_event_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error?: string | null
          event_type?: string
          id?: string
          organization_id?: string
          payload?: Json
          processed_at?: string | null
          status?: Database["public"]["Enums"]["notification_event_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          created_at: string
          email_send_id: string | null
          event_type: string
          id: string
          notification_event_id: string | null
          organization_id: string
          reason: string | null
          recipient_email: string
          recipient_user_id: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Insert: {
          created_at?: string
          email_send_id?: string | null
          event_type: string
          id?: string
          notification_event_id?: string | null
          organization_id: string
          reason?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Update: {
          created_at?: string
          email_send_id?: string | null
          event_type?: string
          id?: string
          notification_event_id?: string | null
          organization_id?: string
          reason?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_notification_event_id_fkey"
            columns: ["notification_event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          last_seen_at: string
          organization_id: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          organization_id: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          event_type: string
          id: string
          organization_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_type: string
          id?: string
          organization_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_type?: string
          id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          audience: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_transactional: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_transactional?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_transactional?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      offline_conversions: {
        Row: {
          click_id: string | null
          click_source: string | null
          contact_id: string | null
          conversion_type: string
          created_at: string
          currency: string | null
          deal_id: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          occurred_at: string
          organization_id: string
          status: string
          updated_at: string
          value: number | null
        }
        Insert: {
          click_id?: string | null
          click_source?: string | null
          contact_id?: string | null
          conversion_type: string
          created_at?: string
          currency?: string | null
          deal_id?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          occurred_at?: string
          organization_id: string
          status?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          click_id?: string | null
          click_source?: string | null
          contact_id?: string | null
          conversion_type?: string
          created_at?: string
          currency?: string | null
          deal_id?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          occurred_at?: string
          organization_id?: string
          status?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_conversions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role_id: string
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role_id: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role_id?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_modules: {
        Row: {
          enabled: boolean
          module_id: string
          organization_id: string
        }
        Insert: {
          enabled?: boolean
          module_id: string
          organization_id: string
        }
        Update: {
          enabled?: boolean
          module_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          default_currency: string
          default_language: string
          enabled_currencies: string[]
          enabled_languages: string[]
          id: string
          measurement_system: Database["public"]["Enums"]["measurement_system"]
          name: string
          slug: string
          status: Database["public"]["Enums"]["organization_status"]
          timezone: string
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          default_language?: string
          enabled_currencies?: string[]
          enabled_languages?: string[]
          id?: string
          measurement_system?: Database["public"]["Enums"]["measurement_system"]
          name: string
          slug: string
          status?: Database["public"]["Enums"]["organization_status"]
          timezone?: string
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          default_language?: string
          enabled_currencies?: string[]
          enabled_languages?: string[]
          id?: string
          measurement_system?: Database["public"]["Enums"]["measurement_system"]
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["organization_status"]
          timezone?: string
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Relationships: []
      }
      page_intros: {
        Row: {
          eyebrow: string | null
          heading: string | null
          organization_id: string
          page_key: string
          subheading: string | null
          updated_at: string
        }
        Insert: {
          eyebrow?: string | null
          heading?: string | null
          organization_id: string
          page_key: string
          subheading?: string | null
          updated_at?: string
        }
        Update: {
          eyebrow?: string | null
          heading?: string | null
          organization_id?: string
          page_key?: string
          subheading?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_intros_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      page_translations: {
        Row: {
          content: Json
          created_at: string
          locale: string
          og_image_url: string | null
          organization_id: string
          page_id: string
          seo_description: string | null
          seo_title: string | null
          slug_localized: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          locale: string
          og_image_url?: string | null
          organization_id: string
          page_id: string
          seo_description?: string | null
          seo_title?: string | null
          slug_localized?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          locale?: string
          og_image_url?: string | null
          organization_id?: string
          page_id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug_localized?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_translations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_translations_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["page_status"]
          template: string
          type: Database["public"]["Enums"]["page_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["page_status"]
          template?: string
          type?: Database["public"]["Enums"]["page_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["page_status"]
          template?: string
          type?: Database["public"]["Enums"]["page_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          created_at: string
          crypto_network: string | null
          crypto_wallet_address: string | null
          external_account_id: string | null
          id: string
          is_active: boolean
          label: string
          metadata: Json
          organization_id: string
          payment_provider_id: string
          publishable_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crypto_network?: string | null
          crypto_wallet_address?: string | null
          external_account_id?: string | null
          id?: string
          is_active?: boolean
          label: string
          metadata?: Json
          organization_id: string
          payment_provider_id: string
          publishable_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crypto_network?: string | null
          crypto_wallet_address?: string | null
          external_account_id?: string | null
          id?: string
          is_active?: boolean
          label?: string
          metadata?: Json
          organization_id?: string
          payment_provider_id?: string
          publishable_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_accounts_payment_provider_id_fkey"
            columns: ["payment_provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          created_at: string
          display_name: string
          id: string
          instructions: string | null
          is_default: boolean
          is_enabled: boolean
          mode: Database["public"]["Enums"]["payment_provider_mode"]
          organization_id: string
          provider: Database["public"]["Enums"]["payment_provider_type"]
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          is_enabled?: boolean
          mode?: Database["public"]["Enums"]["payment_provider_mode"]
          organization_id: string
          provider: Database["public"]["Enums"]["payment_provider_type"]
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          is_enabled?: boolean
          mode?: Database["public"]["Enums"]["payment_provider_mode"]
          organization_id?: string
          provider?: Database["public"]["Enums"]["payment_provider_type"]
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_providers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          error_message: string | null
          id: string
          kind: Database["public"]["Enums"]["payment_transaction_kind"]
          organization_id: string
          provider: Database["public"]["Enums"]["payment_provider_type"]
          provider_payload: Json
          provider_transaction_id: string | null
          rental_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency: string
          error_message?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["payment_transaction_kind"]
          organization_id: string
          provider: Database["public"]["Enums"]["payment_provider_type"]
          provider_payload?: Json
          provider_transaction_id?: string | null
          rental_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["payment_transaction_kind"]
          organization_id?: string
          provider?: Database["public"]["Enums"]["payment_provider_type"]
          provider_payload?: Json
          provider_transaction_id?: string | null
          rental_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "rental_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_rental_payment_id_fkey"
            columns: ["rental_payment_id"]
            isOneToOne: false
            referencedRelation: "rental_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhooks: {
        Row: {
          event_type: string | null
          external_event_id: string | null
          id: string
          organization_id: string | null
          payload: Json
          processed: boolean
          processing_error: string | null
          provider: Database["public"]["Enums"]["payment_provider_type"]
          received_at: string
          signature_verified: boolean
        }
        Insert: {
          event_type?: string | null
          external_event_id?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json
          processed?: boolean
          processing_error?: string | null
          provider: Database["public"]["Enums"]["payment_provider_type"]
          received_at?: string
          signature_verified?: boolean
        }
        Update: {
          event_type?: string | null
          external_event_id?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json
          processed?: boolean
          processing_error?: string | null
          provider?: Database["public"]["Enums"]["payment_provider_type"]
          received_at?: string
          signature_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string | null
          id: string
          key: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portal_accounts: {
        Row: {
          accepted_at: string | null
          contact_id: string
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invite_token: string | null
          invited_at: string
          invited_by: string | null
          organization_id: string
          portal_type: Database["public"]["Enums"]["portal_type"]
          status: Database["public"]["Enums"]["portal_account_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          contact_id: string
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invited_at?: string
          invited_by?: string | null
          organization_id: string
          portal_type: Database["public"]["Enums"]["portal_type"]
          status?: Database["public"]["Enums"]["portal_account_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          contact_id?: string
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invited_at?: string
          invited_by?: string | null
          organization_id?: string
          portal_type?: Database["public"]["Enums"]["portal_type"]
          status?: Database["public"]["Enums"]["portal_account_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_accounts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          assigned_agent_id: string | null
          badge: string | null
          completion: string | null
          furnishing: string | null
          lifestyle_tags: string[]
          listing_view: string | null
          ownership: string | null
          rental_yield: number | null
          bathrooms: number | null
          bedrooms: number | null
          beds: number | null
          co_agent_ids: string[]
          created_at: string
          floor: number | null
          garage: boolean
          guest_capacity: number | null
          id: string
          lot_size: number | null
          organization_id: string
          parking: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          purpose: Database["public"]["Enums"]["property_purpose"]
          seller_contact_id: string | null
          size: number | null
          size_unit: Database["public"]["Enums"]["size_unit"]
          slug: string
          status: Database["public"]["Enums"]["property_status"]
          title: string
          total_floors: number | null
          updated_at: string
          visibility: Database["public"]["Enums"]["property_visibility"]
          year_built: number | null
        }
        Insert: {
          assigned_agent_id?: string | null
          badge?: string | null
          completion?: string | null
          furnishing?: string | null
          lifestyle_tags?: string[]
          listing_view?: string | null
          ownership?: string | null
          rental_yield?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          co_agent_ids?: string[]
          created_at?: string
          floor?: number | null
          garage?: boolean
          guest_capacity?: number | null
          id?: string
          lot_size?: number | null
          organization_id: string
          parking?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          purpose?: Database["public"]["Enums"]["property_purpose"]
          seller_contact_id?: string | null
          size?: number | null
          size_unit?: Database["public"]["Enums"]["size_unit"]
          slug: string
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          total_floors?: number | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["property_visibility"]
          year_built?: number | null
        }
        Update: {
          assigned_agent_id?: string | null
          badge?: string | null
          completion?: string | null
          furnishing?: string | null
          lifestyle_tags?: string[]
          listing_view?: string | null
          ownership?: string | null
          rental_yield?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          co_agent_ids?: string[]
          created_at?: string
          floor?: number | null
          garage?: boolean
          guest_capacity?: number | null
          id?: string
          lot_size?: number | null
          organization_id?: string
          parking?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          purpose?: Database["public"]["Enums"]["property_purpose"]
          seller_contact_id?: string | null
          size?: number | null
          size_unit?: Database["public"]["Enums"]["size_unit"]
          slug?: string
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          total_floors?: number | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["property_visibility"]
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_seller_contact_id_fkey"
            columns: ["seller_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      property_amenities: {
        Row: {
          amenity_id: string
          organization_id: string
          property_id: string
        }
        Insert: {
          amenity_id: string
          organization_id: string
          property_id: string
        }
        Update: {
          amenity_id?: string
          organization_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_amenities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          property_id: string
          sort_order: number
          storage_path: string | null
          type: Database["public"]["Enums"]["document_type"]
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          property_id: string
          sort_order?: number
          storage_path?: string | null
          type?: Database["public"]["Enums"]["document_type"]
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          property_id?: string
          sort_order?: number
          storage_path?: string | null
          type?: Database["public"]["Enums"]["document_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_external_visibility: {
        Row: {
          agent_website_connection_id: string
          created_at: string
          id: string
          organization_id: string
          property_id: string
          visible: boolean
        }
        Insert: {
          agent_website_connection_id: string
          created_at?: string
          id?: string
          organization_id: string
          property_id: string
          visible?: boolean
        }
        Update: {
          agent_website_connection_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          property_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "property_external_visibility_agent_website_connection_id_fkey"
            columns: ["agent_website_connection_id"]
            isOneToOne: false
            referencedRelation: "agent_website_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_external_visibility_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_external_visibility_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_locations: {
        Row: {
          address: string | null
          area: string | null
          city: string | null
          country: string | null
          created_at: string
          exact_address_visibility: Database["public"]["Enums"]["address_visibility"]
          latitude: number | null
          longitude: number | null
          organization_id: string
          property_id: string
          public_address: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          exact_address_visibility?: Database["public"]["Enums"]["address_visibility"]
          latitude?: number | null
          longitude?: number | null
          organization_id: string
          property_id: string
          public_address?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          exact_address_visibility?: Database["public"]["Enums"]["address_visibility"]
          latitude?: number | null
          longitude?: number | null
          organization_id?: string
          property_id?: string
          public_address?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_locations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media: {
        Row: {
          alt: string | null
          caption: string | null
          category: Database["public"]["Enums"]["media_category"]
          created_at: string
          id: string
          organization_id: string
          property_id: string
          sort_order: number
          storage_path: string | null
          url: string
        }
        Insert: {
          alt?: string | null
          caption?: string | null
          category?: Database["public"]["Enums"]["media_category"]
          created_at?: string
          id?: string
          organization_id: string
          property_id: string
          sort_order?: number
          storage_path?: string | null
          url: string
        }
        Update: {
          alt?: string | null
          caption?: string | null
          category?: Database["public"]["Enums"]["media_category"]
          created_at?: string
          id?: string
          organization_id?: string
          property_id?: string
          sort_order?: number
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_media_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_prices: {
        Row: {
          amount: number
          cleaning_fee: number | null
          created_at: string
          currency: string
          display_type: Database["public"]["Enums"]["price_display_type"]
          id: string
          old_amount: number | null
          organization_id: string
          price_period: Database["public"]["Enums"]["price_period"]
          property_id: string
          security_deposit: number | null
          taxes: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          cleaning_fee?: number | null
          created_at?: string
          currency: string
          display_type?: Database["public"]["Enums"]["price_display_type"]
          id?: string
          old_amount?: number | null
          organization_id: string
          price_period?: Database["public"]["Enums"]["price_period"]
          property_id: string
          security_deposit?: number | null
          taxes?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          cleaning_fee?: number | null
          created_at?: string
          currency?: string
          display_type?: Database["public"]["Enums"]["price_display_type"]
          id?: string
          old_amount?: number | null
          organization_id?: string
          price_period?: Database["public"]["Enums"]["price_period"]
          property_id?: string
          security_deposit?: number | null
          taxes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_prices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_prices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_sync_settings: {
        Row: {
          created_at: string
          default_canonical_owner: Database["public"]["Enums"]["agent_canonical_owner"]
          hide_commission: boolean
          hide_internal_notes: boolean
          hide_owner_contacts: boolean
          hide_private_documents: boolean
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_canonical_owner?: Database["public"]["Enums"]["agent_canonical_owner"]
          hide_commission?: boolean
          hide_internal_notes?: boolean
          hide_owner_contacts?: boolean
          hide_private_documents?: boolean
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_canonical_owner?: Database["public"]["Enums"]["agent_canonical_owner"]
          hide_commission?: boolean
          hide_internal_notes?: boolean
          hide_owner_contacts?: boolean
          hide_private_documents?: boolean
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_sync_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_translations: {
        Row: {
          created_at: string
          description: string | null
          locale: string
          organization_id: string
          property_id: string
          seo_description: string | null
          seo_title: string | null
          slug_localized: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          locale: string
          organization_id: string
          property_id: string
          seo_description?: string | null
          seo_title?: string | null
          slug_localized?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          locale?: string
          organization_id?: string
          property_id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug_localized?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_translations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_translations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_videos: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          property_id: string
          sort_order: number
          title: string | null
          type: Database["public"]["Enums"]["video_type"]
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          property_id: string
          sort_order?: number
          title?: string | null
          type?: Database["public"]["Enums"]["video_type"]
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          property_id?: string
          sort_order?: number
          title?: string | null
          type?: Database["public"]["Enums"]["video_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_videos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_videos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      redirects: {
        Row: {
          created_at: string
          destination_path: string
          id: string
          organization_id: string
          source_path: string
          status_code: number
        }
        Insert: {
          created_at?: string
          destination_path: string
          id?: string
          organization_id: string
          source_path: string
          status_code?: number
        }
        Update: {
          created_at?: string
          destination_path?: string
          id?: string
          organization_id?: string
          source_path?: string
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "redirects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          organization_id: string
          payment_transaction_id: string | null
          provider: Database["public"]["Enums"]["payment_provider_type"]
          provider_refund_id: string | null
          reason: string | null
          rental_payment_id: string | null
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          id?: string
          organization_id: string
          payment_transaction_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider_type"]
          provider_refund_id?: string | null
          reason?: string | null
          rental_payment_id?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          organization_id?: string
          payment_transaction_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider_type"]
          provider_refund_id?: string | null
          reason?: string | null
          rental_payment_id?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "rental_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_rental_payment_id_fkey"
            columns: ["rental_payment_id"]
            isOneToOne: false
            referencedRelation: "rental_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_availability_rules: {
        Row: {
          buffer_days: number
          calendar_id: string
          check_in_days: number[]
          check_out_days: number[]
          created_at: string
          currency: string | null
          default_price: number | null
          id: string
          max_stay: number | null
          min_stay: number
          organization_id: string
          updated_at: string
          weekend_price: number | null
        }
        Insert: {
          buffer_days?: number
          calendar_id: string
          check_in_days?: number[]
          check_out_days?: number[]
          created_at?: string
          currency?: string | null
          default_price?: number | null
          id?: string
          max_stay?: number | null
          min_stay?: number
          organization_id: string
          updated_at?: string
          weekend_price?: number | null
        }
        Update: {
          buffer_days?: number
          calendar_id?: string
          check_in_days?: number[]
          check_out_days?: number[]
          created_at?: string
          currency?: string | null
          default_price?: number | null
          id?: string
          max_stay?: number | null
          min_stay?: number
          organization_id?: string
          updated_at?: string
          weekend_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_availability_rules_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "rental_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_availability_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_bookings: {
        Row: {
          adults: number
          calendar_event_id: string | null
          calendar_id: string | null
          cancelled_at: string | null
          check_in: string
          check_out: string
          children: number
          cleaning_fee: number
          confirmed_at: string | null
          created_at: string
          currency: string
          discount: number
          guest_contact_id: string | null
          guest_email: string | null
          guest_message: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          lead_id: string | null
          nights: number
          organization_id: string
          payment_status: Database["public"]["Enums"]["booking_payment_status"]
          pets: number
          promo_code: string | null
          property_id: string
          reference: string
          security_deposit: number
          source: Database["public"]["Enums"]["booking_source"]
          status: Database["public"]["Enums"]["booking_status"]
          subtotal: number
          taxes: number
          total: number
          updated_at: string
        }
        Insert: {
          adults?: number
          calendar_event_id?: string | null
          calendar_id?: string | null
          cancelled_at?: string | null
          check_in: string
          check_out: string
          children?: number
          cleaning_fee?: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          discount?: number
          guest_contact_id?: string | null
          guest_email?: string | null
          guest_message?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          lead_id?: string | null
          nights: number
          organization_id: string
          payment_status?: Database["public"]["Enums"]["booking_payment_status"]
          pets?: number
          promo_code?: string | null
          property_id: string
          reference: string
          security_deposit?: number
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal?: number
          taxes?: number
          total?: number
          updated_at?: string
        }
        Update: {
          adults?: number
          calendar_event_id?: string | null
          calendar_id?: string | null
          cancelled_at?: string | null
          check_in?: string
          check_out?: string
          children?: number
          cleaning_fee?: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          discount?: number
          guest_contact_id?: string | null
          guest_email?: string | null
          guest_message?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          lead_id?: string | null
          nights?: number
          organization_id?: string
          payment_status?: Database["public"]["Enums"]["booking_payment_status"]
          pets?: number
          promo_code?: string | null
          property_id?: string
          reference?: string
          security_deposit?: number
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal?: number
          taxes?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_bookings_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "rental_calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "rental_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_bookings_guest_contact_id_fkey"
            columns: ["guest_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_calendar_events: {
        Row: {
          calendar_id: string
          created_at: string
          end_date: string
          external_uid: string | null
          id: string
          import_source_id: string | null
          metadata: Json
          organization_id: string
          property_id: string
          source: Database["public"]["Enums"]["calendar_event_source"]
          start_date: string
          status: Database["public"]["Enums"]["calendar_event_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          end_date: string
          external_uid?: string | null
          id?: string
          import_source_id?: string | null
          metadata?: Json
          organization_id: string
          property_id: string
          source?: Database["public"]["Enums"]["calendar_event_source"]
          start_date: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          end_date?: string
          external_uid?: string | null
          id?: string
          import_source_id?: string | null
          metadata?: Json
          organization_id?: string
          property_id?: string
          source?: Database["public"]["Enums"]["calendar_event_source"]
          start_date?: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "rental_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_calendar_events_import_source_fkey"
            columns: ["import_source_id"]
            isOneToOne: false
            referencedRelation: "ical_import_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_calendar_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_calendars: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          property_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          property_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          property_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_calendars_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_calendars_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_fees: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          is_refundable: boolean
          kind: Database["public"]["Enums"]["rental_fee_kind"]
          label: string
          organization_id: string
          sort_order: number
        }
        Insert: {
          amount?: number
          booking_id: string
          created_at?: string
          currency: string
          id?: string
          is_refundable?: boolean
          kind: Database["public"]["Enums"]["rental_fee_kind"]
          label: string
          organization_id: string
          sort_order?: number
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_refundable?: boolean
          kind?: Database["public"]["Enums"]["rental_fee_kind"]
          label?: string
          organization_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "rental_fees_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "rental_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_guests: {
        Row: {
          booking_id: string
          created_at: string
          email: string | null
          full_name: string
          guest_category: string
          id: string
          is_primary: boolean
          organization_id: string
          phone: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          email?: string | null
          full_name: string
          guest_category?: string
          id?: string
          is_primary?: boolean
          organization_id: string
          phone?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          guest_category?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_guests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "rental_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_guests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          is_manual: boolean
          organization_id: string
          paid_at: string | null
          payment_provider_id: string | null
          provider: Database["public"]["Enums"]["payment_provider_type"]
          provider_reference: string | null
          purpose: Database["public"]["Enums"]["payment_purpose"]
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency: string
          id?: string
          is_manual?: boolean
          organization_id: string
          paid_at?: string | null
          payment_provider_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider_type"]
          provider_reference?: string | null
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_manual?: boolean
          organization_id?: string
          paid_at?: string | null
          payment_provider_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider_type"]
          provider_reference?: string | null
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "rental_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_payment_provider_id_fkey"
            columns: ["payment_provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_price_rules: {
        Row: {
          calendar_id: string
          created_at: string
          currency: string
          end_date: string
          id: string
          min_stay: number | null
          organization_id: string
          price: number
          start_date: string
          updated_at: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          currency: string
          end_date: string
          id?: string
          min_stay?: number | null
          organization_id: string
          price: number
          start_date: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          currency?: string
          end_date?: string
          id?: string
          min_stay?: number | null
          organization_id?: string
          price?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_price_rules_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "rental_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_price_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
          organization_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
          organization_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          query: Json
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          query?: Json
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          query?: Json
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_searches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_opportunities: {
        Row: {
          clicks: number
          created_at: string
          id: string
          impressions: number
          integration_connection_id: string | null
          opportunity_type: string
          organization_id: string
          page: string | null
          position: number | null
          query: string | null
          recommendation: string | null
        }
        Insert: {
          clicks?: number
          created_at?: string
          id?: string
          impressions?: number
          integration_connection_id?: string | null
          opportunity_type: string
          organization_id: string
          page?: string | null
          position?: number | null
          query?: string | null
          recommendation?: string | null
        }
        Update: {
          clicks?: number
          created_at?: string
          id?: string
          impressions?: number
          integration_connection_id?: string | null
          opportunity_type?: string
          organization_id?: string
          page?: string | null
          position?: number | null
          query?: string | null
          recommendation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_opportunities_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_reports: {
        Row: {
          clicks: number
          created_at: string
          ctr: number
          date: string
          dimension: string | null
          dimension_value: string | null
          id: string
          impressions: number
          integration_connection_id: string | null
          organization_id: string
          position: number
        }
        Insert: {
          clicks?: number
          created_at?: string
          ctr?: number
          date: string
          dimension?: string | null
          dimension_value?: string | null
          id?: string
          impressions?: number
          integration_connection_id?: string | null
          organization_id: string
          position?: number
        }
        Update: {
          clicks?: number
          created_at?: string
          ctr?: number
          date?: string
          dimension?: string | null
          dimension_value?: string | null
          id?: string
          impressions?: number
          integration_connection_id?: string | null
          organization_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "seo_reports_integration_connection_id_fkey"
            columns: ["integration_connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_settings: {
        Row: {
          created_at: string
          default_description: string | null
          default_og_image_url: string | null
          default_title: string | null
          google_site_verification: string | null
          organization_id: string
          robots_txt: string | null
          title_suffix: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_description?: string | null
          default_og_image_url?: string | null
          default_title?: string | null
          google_site_verification?: string | null
          organization_id: string
          robots_txt?: string | null
          title_suffix?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_description?: string | null
          default_og_image_url?: string | null
          default_title?: string | null
          google_site_verification?: string | null
          organization_id?: string
          robots_txt?: string | null
          title_suffix?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_agent_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          organization_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          organization_id: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_settings: {
        Row: {
          consent_mode_enabled: boolean
          created_at: string
          ga4_enabled: boolean
          ga4_measurement_id: string | null
          google_ads_conversion_id: string | null
          google_ads_labels: Json
          gtm_id: string | null
          meta_capi_token: string | null
          meta_pixel_enabled: boolean
          meta_pixel_id: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          consent_mode_enabled?: boolean
          created_at?: string
          ga4_enabled?: boolean
          ga4_measurement_id?: string | null
          google_ads_conversion_id?: string | null
          google_ads_labels?: Json
          gtm_id?: string | null
          meta_capi_token?: string | null
          meta_pixel_enabled?: boolean
          meta_pixel_id?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          consent_mode_enabled?: boolean
          created_at?: string
          ga4_enabled?: boolean
          ga4_measurement_id?: string | null
          google_ads_conversion_id?: string | null
          google_ads_labels?: Json
          gtm_id?: string | null
          meta_capi_token?: string | null
          meta_pixel_enabled?: boolean
          meta_pixel_id?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_sessions: {
        Row: {
          captured_at: string
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          gbraid: string | null
          gclid: string | null
          id: string
          landing_page: string | null
          organization_id: string
          referrer: string | null
          session_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          wbraid: string | null
        }
        Insert: {
          captured_at?: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          landing_page?: string | null
          organization_id: string
          referrer?: string | null
          session_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          wbraid?: string | null
        }
        Update: {
          captured_at?: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          gbraid?: string | null
          gclid?: string | null
          id?: string
          landing_page?: string | null
          organization_id?: string
          referrer?: string | null
          session_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          wbraid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_delivery_logs: {
        Row: {
          attempt: number
          attempted_at: string
          id: string
          organization_id: string
          response_body: string | null
          response_code: number | null
          status: string
          webhook_endpoint_id: string | null
          webhook_event_id: string | null
        }
        Insert: {
          attempt?: number
          attempted_at?: string
          id?: string
          organization_id: string
          response_body?: string | null
          response_code?: number | null
          status: string
          webhook_endpoint_id?: string | null
          webhook_event_id?: string | null
        }
        Update: {
          attempt?: number
          attempted_at?: string
          id?: string
          organization_id?: string
          response_body?: string | null
          response_code?: number | null
          status?: string
          webhook_endpoint_id?: string | null
          webhook_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_delivery_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_delivery_logs_webhook_endpoint_id_fkey"
            columns: ["webhook_endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_delivery_logs_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          agent_website_connection_id: string | null
          created_at: string
          event_types: string[]
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_success_at: string | null
          organization_id: string
          previous_secret: string | null
          secret: string | null
          secret_rotated_at: string | null
          updated_at: string
          url: string
        }
        Insert: {
          agent_website_connection_id?: string | null
          created_at?: string
          event_types?: string[]
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          organization_id: string
          previous_secret?: string | null
          secret?: string | null
          secret_rotated_at?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          agent_website_connection_id?: string | null
          created_at?: string
          event_types?: string[]
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          organization_id?: string
          previous_secret?: string | null
          secret?: string | null
          secret_rotated_at?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_agent_website_connection_id_fkey"
            columns: ["agent_website_connection_id"]
            isOneToOne: false
            referencedRelation: "agent_website_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          attempts: number
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string | null
          organization_id: string
          payload: Json
          processed_at: string | null
          status: Database["public"]["Enums"]["webhook_event_status"]
        }
        Insert: {
          attempts?: number
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string | null
          organization_id: string
          payload?: Json
          processed_at?: string | null
          status?: Database["public"]["Enums"]["webhook_event_status"]
        }
        Update: {
          attempts?: number
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string | null
          organization_id?: string
          payload?: Json
          processed_at?: string | null
          status?: Database["public"]["Enums"]["webhook_event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_id: { Args: never; Returns: string }
      merge_contacts: {
        Args: { p_primary: string; p_secondary: string; p_org: string }
        Returns: undefined
      }
      api_rate_limit_hit: {
        Args: {
          p_api_key: string
          p_org: string
          p_window: string
          p_limit: number
        }
        Returns: boolean
      }
      claim_due_webhook_events: {
        Args: { p_limit: number }
        Returns: string[]
      }
    }
    Enums: {
      address_visibility: "exact" | "approximate" | "hidden"
      agent_canonical_owner:
        | "agency"
        | "agent"
        | "both_unique"
        | "noindex_agent"
      api_key_status: "active" | "revoked"
      attachment_type: "image" | "video" | "document"
      booking_payment_status:
        | "unpaid"
        | "partially_paid"
        | "paid"
        | "refunded"
        | "partially_refunded"
      booking_source: "website" | "agent" | "airbnb_import" | "booking_import"
      booking_status:
        | "draft"
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
      calendar_event_source:
        | "manual"
        | "direct"
        | "airbnb"
        | "booking"
        | "vrbo"
        | "google"
        | "owner"
        | "maintenance"
        | "cleaning"
      calendar_event_status:
        | "available"
        | "booked"
        | "blocked"
        | "pending"
        | "maintenance"
        | "cleaning"
      campaign_recipient_status: "pending" | "sent" | "failed" | "skipped"
      campaign_status: "draft" | "scheduled" | "sending" | "sent" | "failed"
      consent_status: "granted" | "withdrawn"
      conversation_type:
        | "buyer_agent"
        | "seller_agent"
        | "guest_manager"
        | "internal"
      crypto_proof_status: "pending" | "approved" | "rejected"
      deal_status: "open" | "won" | "lost"
      device_type: "desktop" | "mobile" | "tablet" | "unknown"
      document_type: "brochure" | "other"
      domain_status: "pending" | "verified" | "failed" | "disabled"
      domain_type: "primary" | "agent" | "landing" | "api"
      email_send_status: "queued" | "sent" | "failed"
      external_domain_status: "pending" | "active" | "blocked"
      ical_provider: "airbnb" | "booking" | "vrbo" | "google" | "custom"
      ical_sync_status: "success" | "error" | "partial"
      integration_provider: "gsc" | "google_ads" | "meta_ads"
      integration_status: "pending" | "connected" | "disconnected" | "error"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "unqualified"
        | "converted"
        | "lost"
      lead_type:
        | "buyer"
        | "seller"
        | "renter"
        | "guest"
        | "investor"
        | "commercial"
        | "booking"
        | "valuation"
        | "external_agent_website"
      license_installation_type:
        | "solo_realtor_installation"
        | "agency_installation"
        | "property_management_installation"
        | "custom_installation"
      license_status: "active" | "expired" | "suspended" | "revoked"
      measurement_system: "metric" | "imperial"
      media_category: "cover" | "gallery" | "floor_plan"
      member_status: "invited" | "active" | "inactive" | "suspended"
      message_type: "text" | "file" | "system"
      messaging_channel: "whatsapp_cloud" | "telegram" | "messenger"
      messaging_connection_status:
        | "pending"
        | "connected"
        | "disconnected"
        | "error"
      messaging_direction: "inbound" | "outbound"
      messaging_message_status:
        | "received"
        | "queued"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
      notification_delivery_status: "sent" | "skipped" | "failed"
      notification_event_status:
        | "pending"
        | "processing"
        | "processed"
        | "failed"
      organization_status: "active" | "inactive" | "suspended"
      organization_type:
        | "solo_realtor"
        | "agency"
        | "property_management"
        | "brokerage"
      page_status: "draft" | "published"
      page_type:
        | "home"
        | "about"
        | "buy"
        | "sell"
        | "rent"
        | "contact"
        | "custom"
        | "landing"
      payment_provider_mode: "test" | "live"
      payment_provider_type: "stripe" | "paypal" | "crypto" | "manual"
      payment_purpose:
        | "booking_deposit"
        | "booking_balance"
        | "booking_total"
        | "security_deposit"
      payment_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "cancelled"
        | "refunded"
      payment_transaction_kind: "charge" | "refund"
      portal_account_status: "pending" | "active" | "revoked"
      portal_type: "buyer" | "seller" | "guest"
      price_display_type: "visible" | "hidden" | "upon_request"
      price_period: "sale" | "month" | "week" | "night"
      property_purpose:
        | "sale"
        | "long_term_rent"
        | "short_term_rental"
        | "mixed"
      property_status:
        | "draft"
        | "active"
        | "pending"
        | "sold"
        | "rented"
        | "archived"
        | "hidden"
      property_type:
        | "apartment"
        | "house"
        | "villa"
        | "townhouse"
        | "studio"
        | "room"
        | "commercial"
        | "land"
        | "office"
      property_visibility: "public" | "private" | "unlisted"
      refund_status: "pending" | "processing" | "succeeded" | "failed"
      rental_fee_kind:
        | "accommodation"
        | "cleaning"
        | "security_deposit"
        | "tax"
        | "discount"
        | "service"
        | "other"
      size_unit: "sqm" | "sqft"
      task_priority: "low" | "medium" | "high"
      task_status: "open" | "completed" | "cancelled"
      video_type: "tour" | "realtor_review" | "virtual_tour"
      webhook_event_status: "pending" | "delivered" | "failed"
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
    Enums: {
      address_visibility: ["exact", "approximate", "hidden"],
      agent_canonical_owner: [
        "agency",
        "agent",
        "both_unique",
        "noindex_agent",
      ],
      api_key_status: ["active", "revoked"],
      attachment_type: ["image", "video", "document"],
      booking_payment_status: [
        "unpaid",
        "partially_paid",
        "paid",
        "refunded",
        "partially_refunded",
      ],
      booking_source: ["website", "agent", "airbnb_import", "booking_import"],
      booking_status: [
        "draft",
        "pending",
        "confirmed",
        "cancelled",
        "completed",
      ],
      calendar_event_source: [
        "manual",
        "direct",
        "airbnb",
        "booking",
        "vrbo",
        "google",
        "owner",
        "maintenance",
        "cleaning",
      ],
      calendar_event_status: [
        "available",
        "booked",
        "blocked",
        "pending",
        "maintenance",
        "cleaning",
      ],
      campaign_recipient_status: ["pending", "sent", "failed", "skipped"],
      campaign_status: ["draft", "scheduled", "sending", "sent", "failed"],
      consent_status: ["granted", "withdrawn"],
      conversation_type: [
        "buyer_agent",
        "seller_agent",
        "guest_manager",
        "internal",
      ],
      crypto_proof_status: ["pending", "approved", "rejected"],
      deal_status: ["open", "won", "lost"],
      device_type: ["desktop", "mobile", "tablet", "unknown"],
      document_type: ["brochure", "other"],
      domain_status: ["pending", "verified", "failed", "disabled"],
      domain_type: ["primary", "agent", "landing", "api"],
      email_send_status: ["queued", "sent", "failed"],
      external_domain_status: ["pending", "active", "blocked"],
      ical_provider: ["airbnb", "booking", "vrbo", "google", "custom"],
      ical_sync_status: ["success", "error", "partial"],
      integration_provider: ["gsc", "google_ads", "meta_ads"],
      integration_status: ["pending", "connected", "disconnected", "error"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "unqualified",
        "converted",
        "lost",
      ],
      lead_type: [
        "buyer",
        "seller",
        "renter",
        "guest",
        "investor",
        "commercial",
        "booking",
        "valuation",
        "external_agent_website",
      ],
      license_installation_type: [
        "solo_realtor_installation",
        "agency_installation",
        "property_management_installation",
        "custom_installation",
      ],
      license_status: ["active", "expired", "suspended", "revoked"],
      measurement_system: ["metric", "imperial"],
      media_category: ["cover", "gallery", "floor_plan"],
      member_status: ["invited", "active", "inactive", "suspended"],
      message_type: ["text", "file", "system"],
      messaging_channel: ["whatsapp_cloud", "telegram", "messenger"],
      messaging_connection_status: [
        "pending",
        "connected",
        "disconnected",
        "error",
      ],
      messaging_direction: ["inbound", "outbound"],
      messaging_message_status: [
        "received",
        "queued",
        "sent",
        "delivered",
        "read",
        "failed",
      ],
      notification_delivery_status: ["sent", "skipped", "failed"],
      notification_event_status: [
        "pending",
        "processing",
        "processed",
        "failed",
      ],
      organization_status: ["active", "inactive", "suspended"],
      organization_type: [
        "solo_realtor",
        "agency",
        "property_management",
        "brokerage",
      ],
      page_status: ["draft", "published"],
      page_type: [
        "home",
        "about",
        "buy",
        "sell",
        "rent",
        "contact",
        "custom",
        "landing",
      ],
      payment_provider_mode: ["test", "live"],
      payment_provider_type: ["stripe", "paypal", "crypto", "manual"],
      payment_purpose: [
        "booking_deposit",
        "booking_balance",
        "booking_total",
        "security_deposit",
      ],
      payment_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
        "refunded",
      ],
      payment_transaction_kind: ["charge", "refund"],
      portal_account_status: ["pending", "active", "revoked"],
      portal_type: ["buyer", "seller", "guest"],
      price_display_type: ["visible", "hidden", "upon_request"],
      price_period: ["sale", "month", "week", "night"],
      property_purpose: [
        "sale",
        "long_term_rent",
        "short_term_rental",
        "mixed",
      ],
      property_status: [
        "draft",
        "active",
        "pending",
        "sold",
        "rented",
        "archived",
        "hidden",
      ],
      property_type: [
        "apartment",
        "house",
        "villa",
        "townhouse",
        "studio",
        "room",
        "commercial",
        "land",
        "office",
      ],
      property_visibility: ["public", "private", "unlisted"],
      refund_status: ["pending", "processing", "succeeded", "failed"],
      rental_fee_kind: [
        "accommodation",
        "cleaning",
        "security_deposit",
        "tax",
        "discount",
        "service",
        "other",
      ],
      size_unit: ["sqm", "sqft"],
      task_priority: ["low", "medium", "high"],
      task_status: ["open", "completed", "cancelled"],
      video_type: ["tour", "realtor_review", "virtual_tour"],
      webhook_event_status: ["pending", "delivered", "failed"],
    },
  },
} as const
