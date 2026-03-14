Initialising login role...
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
    PostgrestVersion: "14.1"
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
          address: string | null
          allow_multi_package: boolean
          code: string
          courier_id: string | null
          created_at: string
          credit_limit: number | null
          credit_terms_days: number | null
          default_modality: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          ruc: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allow_multi_package?: boolean
          code: string
          courier_id?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_terms_days?: number | null
          default_modality?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          ruc?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allow_multi_package?: boolean
          code?: string
          courier_id?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_terms_days?: number | null
          default_modality?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          ruc?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agencies_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_contacts: {
        Row: {
          agency_id: string
          contact_type: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          organization_id: string
          phone: string | null
        }
        Insert: {
          agency_id: string
          contact_type: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          organization_id: string
          phone?: string | null
        }
        Update: {
          agency_id?: string
          contact_type?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_contacts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_destinations: {
        Row: {
          agency_id: string
          created_at: string
          destination_id: string
          id: string
          is_active: boolean
          is_home: boolean
          organization_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          destination_id: string
          id?: string
          is_active?: boolean
          is_home?: boolean
          organization_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          destination_id?: string
          id?: string
          is_active?: boolean
          is_home?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_destinations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_destinations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_destinations_organization_id_fkey"
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
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
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
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      awb_batches: {
        Row: {
          carrier_id: string
          created_at: string
          created_by: string | null
          id: string
          next_available: number
          notes: string | null
          organization_id: string
          prefix: string
          range_end: number
          range_start: number
          updated_at: string
        }
        Insert: {
          carrier_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_available: number
          notes?: string | null
          organization_id: string
          prefix: string
          range_end: number
          range_start: number
          updated_at?: string
        }
        Update: {
          carrier_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_available?: number
          notes?: string | null
          organization_id?: string
          prefix?: string
          range_end?: number
          range_start?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "awb_batches_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awb_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awb_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo_releases: {
        Row: {
          created_at: string
          document_path: string | null
          generated_by: string | null
          hawb_id: string | null
          id: string
          organization_id: string
          shipment_id: string | null
        }
        Insert: {
          created_at?: string
          document_path?: string | null
          generated_by?: string | null
          hawb_id?: string | null
          id?: string
          organization_id: string
          shipment_id?: string | null
        }
        Update: {
          created_at?: string
          document_path?: string | null
          generated_by?: string | null
          hawb_id?: string | null
          id?: string
          organization_id?: string
          shipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargo_releases_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_releases_hawb_id_fkey"
            columns: ["hawb_id"]
            isOneToOne: false
            referencedRelation: "hawbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_releases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_releases_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_modalities: {
        Row: {
          carrier_id: string
          created_at: string
          id: string
          modality_id: string
        }
        Insert: {
          carrier_id: string
          created_at?: string
          id?: string
          modality_id: string
        }
        Update: {
          carrier_id?: string
          created_at?: string
          id?: string
          modality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrier_modalities_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_modalities_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
        ]
      }
      carriers: {
        Row: {
          code: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carriers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consignees: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          agency_id: string
          casillero: string
          cedula_ruc: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          organization_id: string
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          agency_id: string
          casillero: string
          cedula_ruc?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          agency_id?: string
          casillero?: string
          cedula_ruc?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignees_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_destinations: {
        Row: {
          courier_id: string
          created_at: string
          destination_id: string
          id: string
          is_active: boolean
          modality_id: string
          organization_id: string
        }
        Insert: {
          courier_id: string
          created_at?: string
          destination_id: string
          id?: string
          is_active?: boolean
          modality_id: string
          organization_id: string
        }
        Update: {
          courier_id?: string
          created_at?: string
          destination_id?: string
          id?: string
          is_active?: boolean
          modality_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_destinations_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_destinations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_destinations_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_destinations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_modality_tariffs: {
        Row: {
          courier_id: string
          created_at: string
          id: string
          minimum_charge: number | null
          modality_id: string
          organization_id: string
          rate: number
          rate_unit: string
          updated_at: string
        }
        Insert: {
          courier_id: string
          created_at?: string
          id?: string
          minimum_charge?: number | null
          modality_id: string
          organization_id: string
          rate: number
          rate_unit: string
          updated_at?: string
        }
        Update: {
          courier_id?: string
          created_at?: string
          id?: string
          minimum_charge?: number | null
          modality_id?: string
          organization_id?: string
          rate?: number
          rate_unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_modality_tariffs_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_modality_tariffs_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_modality_tariffs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_tariffs: {
        Row: {
          courier_id: string
          created_at: string
          handling_cost_id: string
          id: string
          minimum_charge: number | null
          organization_id: string
          rate: number
          rate_unit: string
          updated_at: string
        }
        Insert: {
          courier_id: string
          created_at?: string
          handling_cost_id: string
          id?: string
          minimum_charge?: number | null
          organization_id: string
          rate: number
          rate_unit: string
          updated_at?: string
        }
        Update: {
          courier_id?: string
          created_at?: string
          handling_cost_id?: string
          id?: string
          minimum_charge?: number | null
          organization_id?: string
          rate?: number
          rate_unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_tariffs_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_tariffs_handling_cost_id_fkey"
            columns: ["handling_cost_id"]
            isOneToOne: false
            referencedRelation: "handling_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_tariffs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      couriers: {
        Row: {
          address: string | null
          city: string | null
          code: string
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          ruc: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          ruc?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          ruc?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courriers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          city: string
          country_code: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          organization_id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          city: string
          country_code: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          organization_id: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string
          country_code?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      handling_costs: {
        Row: {
          base_minimum_charge: number | null
          base_rate: number
          base_rate_unit: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          base_minimum_charge?: number | null
          base_rate?: number
          base_rate_unit?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          base_minimum_charge?: number | null
          base_rate?: number
          base_rate_unit?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charge_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hawbs: {
        Row: {
          created_at: string
          document_type: string
          hawb_number: string
          id: string
          organization_id: string
          pieces: number | null
          shipment_id: string | null
          shipping_instruction_id: string | null
          weight_lb: number | null
        }
        Insert: {
          created_at?: string
          document_type?: string
          hawb_number: string
          id?: string
          organization_id: string
          pieces?: number | null
          shipment_id?: string | null
          shipping_instruction_id?: string | null
          weight_lb?: number | null
        }
        Update: {
          created_at?: string
          document_type?: string
          hawb_number?: string
          id?: string
          organization_id?: string
          pieces?: number | null
          shipment_id?: string | null
          shipping_instruction_id?: string | null
          weight_lb?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hawbs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hawbs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hawbs_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          shipping_instruction_id: string | null
          total: number
          type: string
          unit_price: number
          warehouse_receipt_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          shipping_instruction_id?: string | null
          total: number
          type: string
          unit_price: number
          warehouse_receipt_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          shipping_instruction_id?: string | null
          total?: number
          type?: string
          unit_price?: number
          warehouse_receipt_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          agency_id: string
          created_at: string
          document_path: string | null
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          document_path?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          document_path?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mass_notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          organization_id: string
          target_agencies: Json | null
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          organization_id: string
          target_agencies?: Json | null
          title: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          target_agencies?: Json | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mass_notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mass_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      modalities: {
        Row: {
          base_minimum_charge: number | null
          base_rate: number
          base_rate_unit: string
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          base_minimum_charge?: number | null
          base_rate?: number
          base_rate_unit?: string
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          base_minimum_charge?: number | null
          base_rate?: number
          base_rate_unit?: string
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modalities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel: string
          event_type: string
          id: string
          is_enabled: boolean
          user_id: string
        }
        Insert: {
          channel?: string
          event_type: string
          id?: string
          is_enabled?: boolean
          user_id: string
        }
        Update: {
          channel?: string
          event_type?: string
          id?: string
          is_enabled?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          channel: string
          created_at: string
          event_type: string
          id: string
          is_active: boolean
          locale: string
          organization_id: string | null
          subject_template: string | null
          updated_at: string
        }
        Insert: {
          body_template: string
          channel?: string
          created_at?: string
          event_type: string
          id?: string
          is_active?: boolean
          locale?: string
          organization_id?: string | null
          subject_template?: string | null
          updated_at?: string
        }
        Update: {
          body_template?: string
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          is_active?: boolean
          locale?: string
          organization_id?: string | null
          subject_template?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          organization_id: string
          read_at: string | null
          recipient_email: string | null
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
          read_at?: string | null
          recipient_email?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          read_at?: string | null
          recipient_email?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      package_movements: {
        Row: {
          created_at: string
          from_location_id: string | null
          id: string
          moved_by: string | null
          movement_type: string
          notes: string | null
          organization_id: string
          package_id: string
          suggested_location_id: string | null
          to_location_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          from_location_id?: string | null
          id?: string
          moved_by?: string | null
          movement_type: string
          notes?: string | null
          organization_id: string
          package_id: string
          suggested_location_id?: string | null
          to_location_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          from_location_id?: string | null
          id?: string
          moved_by?: string | null
          movement_type?: string
          notes?: string | null
          organization_id?: string
          package_id?: string
          suggested_location_id?: string | null
          to_location_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_movements_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_movements_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_movements_suggested_location_id_fkey"
            columns: ["suggested_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          actual_weight_lb: number | null
          billable_weight_lb: number | null
          carrier: string | null
          condition_flags: string[]
          content_description: string | null
          created_at: string
          damage_description: string | null
          declared_value_usd: number | null
          dgr_class: string | null
          height_in: number | null
          id: string
          is_damaged: boolean
          is_dgr: boolean
          length_in: number | null
          notes: string | null
          organization_id: string
          package_type: string | null
          pieces_count: number
          sender_name: string | null
          tracking_number: string
          updated_at: string
          volumetric_weight_lb: number | null
          warehouse_location_id: string | null
          warehouse_receipt_id: string
          width_in: number | null
        }
        Insert: {
          actual_weight_lb?: number | null
          billable_weight_lb?: number | null
          carrier?: string | null
          condition_flags?: string[]
          content_description?: string | null
          created_at?: string
          damage_description?: string | null
          declared_value_usd?: number | null
          dgr_class?: string | null
          height_in?: number | null
          id?: string
          is_damaged?: boolean
          is_dgr?: boolean
          length_in?: number | null
          notes?: string | null
          organization_id: string
          package_type?: string | null
          pieces_count?: number
          sender_name?: string | null
          tracking_number: string
          updated_at?: string
          volumetric_weight_lb?: number | null
          warehouse_location_id?: string | null
          warehouse_receipt_id: string
          width_in?: number | null
        }
        Update: {
          actual_weight_lb?: number | null
          billable_weight_lb?: number | null
          carrier?: string | null
          condition_flags?: string[]
          content_description?: string | null
          created_at?: string
          damage_description?: string | null
          declared_value_usd?: number | null
          dgr_class?: string | null
          height_in?: number | null
          id?: string
          is_damaged?: boolean
          is_dgr?: boolean
          length_in?: number | null
          notes?: string | null
          organization_id?: string
          package_type?: string | null
          pieces_count?: number
          sender_name?: string | null
          tracking_number?: string
          updated_at?: string
          volumetric_weight_lb?: number | null
          warehouse_location_id?: string | null
          warehouse_receipt_id?: string
          width_in?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_warehouse_location_id_fkey"
            columns: ["warehouse_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_request_wrs: {
        Row: {
          id: string
          pickup_request_id: string
          warehouse_receipt_id: string
        }
        Insert: {
          id?: string
          pickup_request_id: string
          warehouse_receipt_id: string
        }
        Update: {
          id?: string
          pickup_request_id?: string
          warehouse_receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_request_wrs_pickup_request_id_fkey"
            columns: ["pickup_request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_request_wrs_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_requests: {
        Row: {
          agency_id: string | null
          authorized_person_id: string | null
          authorized_person_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          organization_id: string
          pickup_date: string | null
          pickup_location: string | null
          pickup_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          authorized_person_id?: string | null
          authorized_person_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          organization_id: string
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          authorized_person_id?: string | null
          authorized_person_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          organization_id?: string
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          locale: string
          organization_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          locale?: string
          organization_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          locale?: string
          organization_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_searches: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          query: string
          result_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          query: string
          result_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          query?: string
          result_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recent_searches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          created_at: string
          id: string
          resource: string
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          resource: string
          role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          resource?: string
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          is_default: boolean
          name: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters: Json
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          organization_id: string | null
          scope_id: string | null
          scope_type: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          organization_id?: string | null
          scope_id?: string | null
          scope_type: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          organization_id?: string | null
          scope_id?: string | null
          scope_type?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_containers: {
        Row: {
          container_number: string
          container_type: string
          created_at: string
          id: string
          max_payload: number | null
          organization_id: string
          seal_number: string | null
          shipment_id: string
          tare_weight: number | null
        }
        Insert: {
          container_number: string
          container_type: string
          created_at?: string
          id?: string
          max_payload?: number | null
          organization_id: string
          seal_number?: string | null
          shipment_id: string
          tare_weight?: number | null
        }
        Update: {
          container_number?: string
          container_type?: string
          created_at?: string
          id?: string
          max_payload?: number | null
          organization_id?: string
          seal_number?: string | null
          shipment_id?: string
          tare_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_containers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_containers_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          organization_id: string
          shipment_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_url: string
          id?: string
          organization_id: string
          shipment_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          organization_id?: string
          shipment_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          organization_id: string
          reason: string | null
          shipment_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          organization_id: string
          reason?: string | null
          shipment_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          organization_id?: string
          reason?: string | null
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_status_history_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          arrival_airport: string | null
          arrival_date: string | null
          awb_number: string | null
          bol_number: string | null
          booking_number: string | null
          border_crossing_point: string | null
          carrier_id: string | null
          consignee_address: string | null
          consignee_name: string | null
          created_at: string
          departure_airport: string | null
          departure_date: string | null
          destination_agent_id: string | null
          destination_id: string | null
          destination_terminal: string | null
          driver_id_number: string | null
          driver_name: string | null
          driver_phone: string | null
          estimated_transit_hours: number | null
          exporting_carrier: string | null
          flight_number: string | null
          freight_terms: string | null
          id: string
          modality: string
          notes: string | null
          number_of_original_bols: number | null
          organization_id: string
          origin_terminal: string | null
          place_of_delivery_by_on_carrier: string | null
          port_of_loading: string | null
          port_of_unloading: string | null
          pre_carrier: string | null
          route_number: string | null
          shipment_number: string
          shipper_address: string | null
          shipper_name: string | null
          status: string
          terminal_or_pier: string | null
          total_house_bills: number | null
          total_pieces: number | null
          total_weight_lb: number | null
          trailer_number: string | null
          truck_plate: string | null
          updated_at: string
          vessel_flag: string | null
          vessel_name: string | null
          voyage_id: string | null
          warehouse_id: string
        }
        Insert: {
          arrival_airport?: string | null
          arrival_date?: string | null
          awb_number?: string | null
          bol_number?: string | null
          booking_number?: string | null
          border_crossing_point?: string | null
          carrier_id?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          created_at?: string
          departure_airport?: string | null
          departure_date?: string | null
          destination_agent_id?: string | null
          destination_id?: string | null
          destination_terminal?: string | null
          driver_id_number?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_transit_hours?: number | null
          exporting_carrier?: string | null
          flight_number?: string | null
          freight_terms?: string | null
          id?: string
          modality: string
          notes?: string | null
          number_of_original_bols?: number | null
          organization_id: string
          origin_terminal?: string | null
          place_of_delivery_by_on_carrier?: string | null
          port_of_loading?: string | null
          port_of_unloading?: string | null
          pre_carrier?: string | null
          route_number?: string | null
          shipment_number: string
          shipper_address?: string | null
          shipper_name?: string | null
          status?: string
          terminal_or_pier?: string | null
          total_house_bills?: number | null
          total_pieces?: number | null
          total_weight_lb?: number | null
          trailer_number?: string | null
          truck_plate?: string | null
          updated_at?: string
          vessel_flag?: string | null
          vessel_name?: string | null
          voyage_id?: string | null
          warehouse_id: string
        }
        Update: {
          arrival_airport?: string | null
          arrival_date?: string | null
          awb_number?: string | null
          bol_number?: string | null
          booking_number?: string | null
          border_crossing_point?: string | null
          carrier_id?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          created_at?: string
          departure_airport?: string | null
          departure_date?: string | null
          destination_agent_id?: string | null
          destination_id?: string | null
          destination_terminal?: string | null
          driver_id_number?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          estimated_transit_hours?: number | null
          exporting_carrier?: string | null
          flight_number?: string | null
          freight_terms?: string | null
          id?: string
          modality?: string
          notes?: string | null
          number_of_original_bols?: number | null
          organization_id?: string
          origin_terminal?: string | null
          place_of_delivery_by_on_carrier?: string | null
          port_of_loading?: string | null
          port_of_unloading?: string | null
          pre_carrier?: string | null
          route_number?: string | null
          shipment_number?: string
          shipper_address?: string | null
          shipper_name?: string | null
          status?: string
          terminal_or_pier?: string | null
          total_house_bills?: number | null
          total_pieces?: number | null
          total_weight_lb?: number | null
          trailer_number?: string | null
          truck_plate?: string | null
          updated_at?: string
          vessel_flag?: string | null
          vessel_name?: string | null
          voyage_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_destination_agent_id_fkey"
            columns: ["destination_agent_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_categories: {
        Row: {
          allows_dgr: boolean
          cargo_type: string
          code: string
          country_code: string
          country_specific_rules: Json
          created_at: string
          customs_declaration_type: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          max_declared_value_usd: number | null
          max_weight_kg: number | null
          min_declared_value_usd: number | null
          modality_id: string
          name: string
          organization_id: string
          requires_cedula: boolean
          requires_ruc: boolean
          updated_at: string
        }
        Insert: {
          allows_dgr?: boolean
          cargo_type?: string
          code: string
          country_code: string
          country_specific_rules?: Json
          created_at?: string
          customs_declaration_type?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          max_declared_value_usd?: number | null
          max_weight_kg?: number | null
          min_declared_value_usd?: number | null
          modality_id: string
          name: string
          organization_id: string
          requires_cedula?: boolean
          requires_ruc?: boolean
          updated_at?: string
        }
        Update: {
          allows_dgr?: boolean
          cargo_type?: string
          code?: string
          country_code?: string
          country_specific_rules?: Json
          created_at?: string
          customs_declaration_type?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          max_declared_value_usd?: number | null
          max_weight_kg?: number | null
          min_declared_value_usd?: number | null
          modality_id?: string
          name?: string
          organization_id?: string
          requires_cedula?: boolean
          requires_ruc?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_categories_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_category_required_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          id: string
          is_required: boolean
          label: string
          shipping_category_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          id?: string
          is_required?: boolean
          label: string
          shipping_category_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          id?: string
          is_required?: boolean
          label?: string
          shipping_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_category_required_documents_shipping_category_id_fkey"
            columns: ["shipping_category_id"]
            isOneToOne: false
            referencedRelation: "shipping_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_instruction_documents: {
        Row: {
          content_type: string
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          id: string
          organization_id: string
          shipping_instruction_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          content_type: string
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          id?: string
          organization_id: string
          shipping_instruction_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          content_type?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          id?: string
          organization_id?: string
          shipping_instruction_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_instruction_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instruction_documents_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instruction_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_instruction_items: {
        Row: {
          created_at: string
          id: string
          shipping_instruction_id: string
          warehouse_receipt_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shipping_instruction_id: string
          warehouse_receipt_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shipping_instruction_id?: string
          warehouse_receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_instruction_items_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instruction_items_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_instruction_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          organization_id: string
          reason: string | null
          shipping_instruction_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          organization_id: string
          reason?: string | null
          shipping_instruction_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          organization_id?: string
          reason?: string | null
          shipping_instruction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_instruction_status_histor_shipping_instruction_id_fkey"
            columns: ["shipping_instruction_id"]
            isOneToOne: false
            referencedRelation: "shipping_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instruction_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instruction_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_instructions: {
        Row: {
          additional_charges: Json | null
          agency_id: string
          approved_at: string | null
          approved_by: string | null
          category_snapshot: Json | null
          cedula_ruc: string | null
          consignee_id: string
          courier_category: string | null
          created_at: string
          cupo_4x4_used: boolean | null
          destination_city: string | null
          destination_id: string
          id: string
          insure_cargo: boolean
          is_dgr: boolean
          modality: string | null
          modality_id: string | null
          organization_id: string
          rejection_reason: string | null
          sed_validation_data: Json | null
          shipping_category_id: string | null
          si_number: string
          special_instructions: string | null
          status: string
          total_actual_weight_lb: number | null
          total_billable_weight_lb: number | null
          total_declared_value_usd: number | null
          total_pieces: number | null
          total_volumetric_weight_lb: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          additional_charges?: Json | null
          agency_id: string
          approved_at?: string | null
          approved_by?: string | null
          category_snapshot?: Json | null
          cedula_ruc?: string | null
          consignee_id: string
          courier_category?: string | null
          created_at?: string
          cupo_4x4_used?: boolean | null
          destination_city?: string | null
          destination_id: string
          id?: string
          insure_cargo?: boolean
          is_dgr?: boolean
          modality?: string | null
          modality_id?: string | null
          organization_id: string
          rejection_reason?: string | null
          sed_validation_data?: Json | null
          shipping_category_id?: string | null
          si_number: string
          special_instructions?: string | null
          status?: string
          total_actual_weight_lb?: number | null
          total_billable_weight_lb?: number | null
          total_declared_value_usd?: number | null
          total_pieces?: number | null
          total_volumetric_weight_lb?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          additional_charges?: Json | null
          agency_id?: string
          approved_at?: string | null
          approved_by?: string | null
          category_snapshot?: Json | null
          cedula_ruc?: string | null
          consignee_id?: string
          courier_category?: string | null
          created_at?: string
          cupo_4x4_used?: boolean | null
          destination_city?: string | null
          destination_id?: string
          id?: string
          insure_cargo?: boolean
          is_dgr?: boolean
          modality?: string | null
          modality_id?: string | null
          organization_id?: string
          rejection_reason?: string | null
          sed_validation_data?: Json | null
          shipping_category_id?: string | null
          si_number?: string
          special_instructions?: string | null
          status?: string
          total_actual_weight_lb?: number | null
          total_billable_weight_lb?: number | null
          total_declared_value_usd?: number | null
          total_pieces?: number | null
          total_volumetric_weight_lb?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_instructions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_consignee_id_fkey"
            columns: ["consignee_id"]
            isOneToOne: false
            referencedRelation: "consignees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_shipping_category_id_fkey"
            columns: ["shipping_category_id"]
            isOneToOne: false
            referencedRelation: "shipping_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_charges: {
        Row: {
          amount: number
          charge_date: string
          created_at: string
          daily_rate: number
          id: string
          invoice_line_item_id: string | null
          organization_id: string
          warehouse_receipt_id: string
        }
        Insert: {
          amount: number
          charge_date: string
          created_at?: string
          daily_rate: number
          id?: string
          invoice_line_item_id?: string | null
          organization_id: string
          warehouse_receipt_id: string
        }
        Update: {
          amount?: number
          charge_date?: string
          created_at?: string
          daily_rate?: number
          id?: string
          invoice_line_item_id?: string | null
          organization_id?: string
          warehouse_receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_charges_invoice_line_item_id_fkey"
            columns: ["invoice_line_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_charges_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_queue: {
        Row: {
          client_id: string
          conflict_reason: string | null
          created_at: string
          entity_type: string
          id: string
          organization_id: string
          payload: Json
          status: string
          synced_at: string | null
        }
        Insert: {
          client_id: string
          conflict_reason?: string | null
          created_at?: string
          entity_type: string
          id?: string
          organization_id: string
          payload: Json
          status?: string
          synced_at?: string | null
        }
        Update: {
          client_id?: string
          conflict_reason?: string | null
          created_at?: string
          entity_type?: string
          id?: string
          organization_id?: string
          payload?: Json
          status?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tariff_schedules: {
        Row: {
          agency_id: string | null
          courier_id: string | null
          created_at: string
          currency: string
          destination_id: string | null
          effective_from: string
          effective_to: string | null
          handling_cost_id: string
          id: string
          is_active: boolean
          minimum_charge: number | null
          notes: string | null
          organization_id: string
          rate: number
          rate_unit: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          agency_id?: string | null
          courier_id?: string | null
          created_at?: string
          currency?: string
          destination_id?: string | null
          effective_from?: string
          effective_to?: string | null
          handling_cost_id: string
          id?: string
          is_active?: boolean
          minimum_charge?: number | null
          notes?: string | null
          organization_id: string
          rate: number
          rate_unit: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          agency_id?: string | null
          courier_id?: string | null
          created_at?: string
          currency?: string
          destination_id?: string | null
          effective_from?: string
          effective_to?: string | null
          handling_cost_id?: string
          id?: string
          is_active?: boolean
          minimum_charge?: number | null
          notes?: string | null
          organization_id?: string
          rate?: number
          rate_unit?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tariff_schedules_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_schedules_charge_type_id_fkey"
            columns: ["handling_cost_id"]
            isOneToOne: false
            referencedRelation: "handling_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_schedules_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_schedules_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_schedules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          id: string
          organization_id: string
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          content_type: string
          created_at?: string
          file_name: string
          id?: string
          organization_id: string
          storage_path: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          id?: string
          organization_id?: string
          storage_path?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      ticket_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          organization_id: string
          reason: string | null
          ticket_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          organization_id: string
          reason?: string | null
          ticket_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          organization_id?: string
          reason?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_wrs: {
        Row: {
          id: string
          ticket_id: string
          warehouse_receipt_id: string
        }
        Insert: {
          id?: string
          ticket_id: string
          warehouse_receipt_id: string
        }
        Update: {
          id?: string
          ticket_id?: string
          warehouse_receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_wrs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_wrs_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          agency_id: string
          assigned_to: string | null
          category: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          organization_id: string
          origin_reviewed_at: string | null
          origin_reviewed_by: string | null
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          organization_id: string
          origin_reviewed_at?: string | null
          origin_reviewed_by?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_to?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          organization_id?: string
          origin_reviewed_at?: string | null
          origin_reviewed_by?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string
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
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_origin_reviewed_by_fkey"
            columns: ["origin_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unknown_wrs: {
        Row: {
          carrier: string | null
          claim_invoice_path: string | null
          claim_tracking_match: string | null
          claim_verified_at: string | null
          claim_verified_by: string | null
          claimed_at: string | null
          claimed_by_agency_id: string | null
          created_at: string
          id: string
          organization_id: string
          package_type: string | null
          sender_name: string | null
          status: string
          updated_at: string
          warehouse_receipt_id: string
        }
        Insert: {
          carrier?: string | null
          claim_invoice_path?: string | null
          claim_tracking_match?: string | null
          claim_verified_at?: string | null
          claim_verified_by?: string | null
          claimed_at?: string | null
          claimed_by_agency_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          package_type?: string | null
          sender_name?: string | null
          status?: string
          updated_at?: string
          warehouse_receipt_id: string
        }
        Update: {
          carrier?: string | null
          claim_invoice_path?: string | null
          claim_tracking_match?: string | null
          claim_verified_at?: string | null
          claim_verified_by?: string | null
          claimed_at?: string | null
          claimed_by_agency_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          package_type?: string | null
          sender_name?: string | null
          status?: string
          updated_at?: string
          warehouse_receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unknown_wrs_claim_verified_by_fkey"
            columns: ["claim_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unknown_wrs_claimed_by_agency_id_fkey"
            columns: ["claimed_by_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unknown_wrs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unknown_wrs_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          agency_id: string | null
          courier_id: string | null
          created_at: string
          destination_id: string | null
          id: string
          organization_id: string | null
          role: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          agency_id?: string | null
          courier_id?: string | null
          created_at?: string
          destination_id?: string | null
          id?: string
          organization_id?: string | null
          role: string
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          agency_id?: string | null
          courier_id?: string | null
          created_at?: string
          destination_id?: string | null
          id?: string
          organization_id?: string | null
          role?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_destination_modalities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          modality_id: string
          organization_id: string
          warehouse_destination_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          modality_id: string
          organization_id: string
          warehouse_destination_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          modality_id?: string
          organization_id?: string
          warehouse_destination_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_destination_modalities_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_destination_modalities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_destination_modalities_warehouse_destination_id_fkey"
            columns: ["warehouse_destination_id"]
            isOneToOne: false
            referencedRelation: "warehouse_destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_destinations: {
        Row: {
          created_at: string
          destination_id: string
          id: string
          is_active: boolean
          organization_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          destination_id: string
          id?: string
          is_active?: boolean
          organization_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          destination_id?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_destinations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_destinations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_destinations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_locations: {
        Row: {
          barcode: string
          blocked_at: string | null
          blocked_reason: string | null
          code: string
          created_at: string
          current_count: number
          id: string
          is_active: boolean
          is_blocked: boolean
          max_height_in: number | null
          max_length_in: number | null
          max_packages: number | null
          max_weight_lb: number | null
          max_width_in: number | null
          name: string
          organization_id: string
          preferred_agency_id: string | null
          sort_order: number
          updated_at: string
          warehouse_id: string
          zone_id: string
        }
        Insert: {
          barcode: string
          blocked_at?: string | null
          blocked_reason?: string | null
          code: string
          created_at?: string
          current_count?: number
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          max_height_in?: number | null
          max_length_in?: number | null
          max_packages?: number | null
          max_weight_lb?: number | null
          max_width_in?: number | null
          name: string
          organization_id: string
          preferred_agency_id?: string | null
          sort_order?: number
          updated_at?: string
          warehouse_id: string
          zone_id: string
        }
        Update: {
          barcode?: string
          blocked_at?: string | null
          blocked_reason?: string | null
          code?: string
          created_at?: string
          current_count?: number
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          max_height_in?: number | null
          max_length_in?: number | null
          max_packages?: number | null
          max_weight_lb?: number | null
          max_width_in?: number | null
          name?: string
          organization_id?: string
          preferred_agency_id?: string | null
          sort_order?: number
          updated_at?: string
          warehouse_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_wl_warehouse"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_locations_preferred_agency_id_fkey"
            columns: ["preferred_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_locations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_receipts: {
        Row: {
          agency_id: string | null
          client_id: string | null
          condition_flags: string[]
          consignee_id: string | null
          consignee_name: string | null
          created_at: string
          description: string | null
          free_storage_override_days: number | null
          free_storage_override_reason: string | null
          has_damaged_package: boolean
          has_dgr_package: boolean
          hawb_id: string | null
          id: string
          is_unknown: boolean
          master_tracking: string | null
          notes: string | null
          organization_id: string
          received_at: string
          received_by: string
          shipper_name: string | null
          status: string
          synced_at: string | null
          total_actual_weight_lb: number | null
          total_billable_weight_lb: number | null
          total_declared_value_usd: number | null
          total_packages: number | null
          total_pieces: number | null
          total_volumetric_weight_lb: number | null
          updated_at: string
          warehouse_id: string
          wr_number: string
        }
        Insert: {
          agency_id?: string | null
          client_id?: string | null
          condition_flags?: string[]
          consignee_id?: string | null
          consignee_name?: string | null
          created_at?: string
          description?: string | null
          free_storage_override_days?: number | null
          free_storage_override_reason?: string | null
          has_damaged_package?: boolean
          has_dgr_package?: boolean
          hawb_id?: string | null
          id?: string
          is_unknown?: boolean
          master_tracking?: string | null
          notes?: string | null
          organization_id: string
          received_at?: string
          received_by: string
          shipper_name?: string | null
          status?: string
          synced_at?: string | null
          total_actual_weight_lb?: number | null
          total_billable_weight_lb?: number | null
          total_declared_value_usd?: number | null
          total_packages?: number | null
          total_pieces?: number | null
          total_volumetric_weight_lb?: number | null
          updated_at?: string
          warehouse_id: string
          wr_number: string
        }
        Update: {
          agency_id?: string | null
          client_id?: string | null
          condition_flags?: string[]
          consignee_id?: string | null
          consignee_name?: string | null
          created_at?: string
          description?: string | null
          free_storage_override_days?: number | null
          free_storage_override_reason?: string | null
          has_damaged_package?: boolean
          has_dgr_package?: boolean
          hawb_id?: string | null
          id?: string
          is_unknown?: boolean
          master_tracking?: string | null
          notes?: string | null
          organization_id?: string
          received_at?: string
          received_by?: string
          shipper_name?: string | null
          status?: string
          synced_at?: string | null
          total_actual_weight_lb?: number | null
          total_billable_weight_lb?: number | null
          total_declared_value_usd?: number | null
          total_packages?: number | null
          total_pieces?: number | null
          total_volumetric_weight_lb?: number | null
          updated_at?: string
          warehouse_id?: string
          wr_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_receipts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_consignee_id_fkey"
            columns: ["consignee_id"]
            isOneToOne: false
            referencedRelation: "consignees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_hawb_id_fkey"
            columns: ["hawb_id"]
            isOneToOne: false
            referencedRelation: "hawbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_zones: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
          warehouse_id: string
          zone_type: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
          warehouse_id: string
          zone_type?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
          warehouse_id?: string
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_zones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_zones_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          city: string | null
          code: string
          country: string | null
          created_at: string
          email: string | null
          full_address: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          code: string
          country?: string | null
          created_at?: string
          email?: string | null
          full_address?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          email?: string | null
          full_address?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_items: {
        Row: {
          created_at: string
          id: string
          warehouse_receipt_id: string
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          warehouse_receipt_id: string
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          warehouse_receipt_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_items_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          organization_id: string
          reason: string | null
          work_order_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          organization_id: string
          reason?: string | null
          work_order_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          organization_id?: string
          reason?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_status_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          agency_id: string | null
          assigned_to: string | null
          cancellation_reason: string | null
          completed_at: string | null
          created_at: string
          id: string
          instructions: string | null
          metadata: Json | null
          organization_id: string
          pickup_authorized_person: string | null
          pickup_contact_info: string | null
          pickup_date: string | null
          pickup_location: string | null
          pickup_time: string | null
          priority: string
          requested_by: string
          result_notes: string | null
          status: string
          type: string
          updated_at: string
          warehouse_id: string
          wo_number: string
        }
        Insert: {
          agency_id?: string | null
          assigned_to?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          metadata?: Json | null
          organization_id: string
          pickup_authorized_person?: string | null
          pickup_contact_info?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          priority?: string
          requested_by: string
          result_notes?: string | null
          status?: string
          type: string
          updated_at?: string
          warehouse_id: string
          wo_number: string
        }
        Update: {
          agency_id?: string | null
          assigned_to?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          metadata?: Json | null
          organization_id?: string
          pickup_authorized_person?: string | null
          pickup_contact_info?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          priority?: string
          requested_by?: string
          result_notes?: string | null
          status?: string
          type?: string
          updated_at?: string
          warehouse_id?: string
          wo_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      wr_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          organization_id: string
          storage_path: string
          warehouse_receipt_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          organization_id: string
          storage_path: string
          warehouse_receipt_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          organization_id?: string
          storage_path?: string
          warehouse_receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wr_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_attachments_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      wr_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          warehouse_receipt_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          warehouse_receipt_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          warehouse_receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wr_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_notes_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      wr_photos: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          id: string
          is_damage_photo: boolean
          organization_id: string
          package_id: string | null
          storage_path: string
          uploaded_by: string | null
          warehouse_receipt_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_damage_photo?: boolean
          organization_id: string
          package_id?: string | null
          storage_path: string
          uploaded_by?: string | null
          warehouse_receipt_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_damage_photo?: boolean
          organization_id?: string
          package_id?: string | null
          storage_path?: string
          uploaded_by?: string | null
          warehouse_receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wr_photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_photos_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_photos_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      wr_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          organization_id: string
          reason: string | null
          warehouse_receipt_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          organization_id: string
          reason?: string | null
          warehouse_receipt_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          organization_id?: string
          reason?: string | null
          warehouse_receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wr_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_status_history_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      wr_transfer_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          authorization_doc_path: string | null
          created_at: string
          from_agency_id: string
          id: string
          invoice_doc_path: string | null
          organization_id: string
          rejection_reason: string | null
          requested_by: string
          status: string
          to_agency_id: string
          updated_at: string
          warehouse_receipt_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          authorization_doc_path?: string | null
          created_at?: string
          from_agency_id: string
          id?: string
          invoice_doc_path?: string | null
          organization_id: string
          rejection_reason?: string | null
          requested_by: string
          status?: string
          to_agency_id: string
          updated_at?: string
          warehouse_receipt_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          authorization_doc_path?: string | null
          created_at?: string
          from_agency_id?: string
          id?: string
          invoice_doc_path?: string | null
          organization_id?: string
          rejection_reason?: string | null
          requested_by?: string
          status?: string
          to_agency_id?: string
          updated_at?: string
          warehouse_receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wr_transfer_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_transfer_requests_from_agency_id_fkey"
            columns: ["from_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_transfer_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_transfer_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_transfer_requests_to_agency_id_fkey"
            columns: ["to_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wr_transfer_requests_warehouse_receipt_id_fkey"
            columns: ["warehouse_receipt_id"]
            isOneToOne: false
            referencedRelation: "warehouse_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _rls_org_check: { Args: { org_id: string }; Returns: boolean }
      auth_agency_ids: { Args: never; Returns: string[] }
      auth_courier_ids: { Args: never; Returns: string[] }
      auth_has_role: { Args: { p_role: string }; Returns: boolean }
      auth_org_id: { Args: never; Returns: string }
      next_awb_number: { Args: { p_batch_id: string }; Returns: string }
      next_hawb_number: { Args: { p_org_id: string }; Returns: string }
      next_house_bill_number: {
        Args: { p_doc_type?: string; p_org_id: string }
        Returns: string
      }
      next_shipment_number: {
        Args: { p_modality: string; p_org_id: string }
        Returns: string
      }
      next_si_number: { Args: { p_org_id: string }; Returns: string }
      next_wo_number: { Args: { p_org_id: string }; Returns: string }
      resolve_setting: {
        Args: {
          p_agency_id?: string
          p_destination_id?: string
          p_key: string
          p_org_id: string
          p_user_id?: string
          p_warehouse_id?: string
        }
        Returns: Json
      }
      search_warehouse_receipts: {
        Args: {
          p_agency_ids?: string[]
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_offset?: number
          p_search: string
          p_status?: string[]
          p_warehouse_ids?: string[]
        }
        Returns: {
          id: string
          total_count: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
A new version of Supabase CLI is available: v2.78.1 (currently installed v2.65.5)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
