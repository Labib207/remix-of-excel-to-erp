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
  public: {
    Tables: {
      bundle_guides: {
        Row: {
          bundle_size: number | null
          bundles: number | null
          created_at: string
          created_by: string | null
          cut_plan_id: string | null
          id: string
          remainder_qty: number | null
          size: string | null
          total_qty: number | null
        }
        Insert: {
          bundle_size?: number | null
          bundles?: number | null
          created_at?: string
          created_by?: string | null
          cut_plan_id?: string | null
          id?: string
          remainder_qty?: number | null
          size?: string | null
          total_qty?: number | null
        }
        Update: {
          bundle_size?: number | null
          bundles?: number | null
          created_at?: string
          created_by?: string | null
          cut_plan_id?: string | null
          id?: string
          remainder_qty?: number | null
          size?: string | null
          total_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bundle_guides_cut_plan_id_fkey"
            columns: ["cut_plan_id"]
            isOneToOne: false
            referencedRelation: "cut_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          bundle_no: string
          color: string | null
          created_at: string
          created_by: string | null
          cut_no: number | null
          cut_plan_id: string | null
          end_no: number | null
          id: string
          lay_sheet_id: string | null
          notes: string | null
          order_id: string | null
          part: string | null
          ply_end: number | null
          ply_start: number | null
          quantity: number | null
          scanned_at: string | null
          serial_range: string | null
          shade: string | null
          size: string | null
          start_no: number | null
          status: string
          updated_at: string
        }
        Insert: {
          bundle_no: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          cut_no?: number | null
          cut_plan_id?: string | null
          end_no?: number | null
          id?: string
          lay_sheet_id?: string | null
          notes?: string | null
          order_id?: string | null
          part?: string | null
          ply_end?: number | null
          ply_start?: number | null
          quantity?: number | null
          scanned_at?: string | null
          serial_range?: string | null
          shade?: string | null
          size?: string | null
          start_no?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          bundle_no?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          cut_no?: number | null
          cut_plan_id?: string | null
          end_no?: number | null
          id?: string
          lay_sheet_id?: string | null
          notes?: string | null
          order_id?: string | null
          part?: string | null
          ply_end?: number | null
          ply_start?: number | null
          quantity?: number | null
          scanned_at?: string | null
          serial_range?: string | null
          shade?: string | null
          size?: string | null
          start_no?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundles_cut_plan_id_fkey"
            columns: ["cut_plan_id"]
            isOneToOne: false
            referencedRelation: "cut_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundles_lay_sheet_id_fkey"
            columns: ["lay_sheet_id"]
            isOneToOne: false
            referencedRelation: "lay_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundles_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cut_plans: {
        Row: {
          created_at: string
          created_by: string | null
          cut_no: number | null
          date: string | null
          fabric_type: string | null
          fabric_used: number | null
          fabric_width: number | null
          id: string
          lay_length: number | null
          marker_id: string | null
          marker_length: number | null
          notes: string | null
          order_id: string | null
          plan_no: string
          planned_date: string | null
          plies: number | null
          shade: string | null
          sizes: Json | null
          status: string
          total_pieces: number | null
          total_qty: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cut_no?: number | null
          date?: string | null
          fabric_type?: string | null
          fabric_used?: number | null
          fabric_width?: number | null
          id?: string
          lay_length?: number | null
          marker_id?: string | null
          marker_length?: number | null
          notes?: string | null
          order_id?: string | null
          plan_no: string
          planned_date?: string | null
          plies?: number | null
          shade?: string | null
          sizes?: Json | null
          status?: string
          total_pieces?: number | null
          total_qty?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cut_no?: number | null
          date?: string | null
          fabric_type?: string | null
          fabric_used?: number | null
          fabric_width?: number | null
          id?: string
          lay_length?: number | null
          marker_id?: string | null
          marker_length?: number | null
          notes?: string | null
          order_id?: string | null
          plan_no?: string
          planned_date?: string | null
          plies?: number | null
          shade?: string | null
          sizes?: Json | null
          status?: string
          total_pieces?: number | null
          total_qty?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cut_plans_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_recutting: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          fabric_usage: number | null
          id: string
          line_no: string | null
          marker_length: number
          order_id: string | null
          part_name: string
          quantity: number
          reason: string | null
          remark: string | null
          size_code: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          fabric_usage?: number | null
          id?: string
          line_no?: string | null
          marker_length?: number
          order_id?: string | null
          part_name: string
          quantity?: number
          reason?: string | null
          remark?: string | null
          size_code: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          fabric_usage?: number | null
          id?: string
          line_no?: string | null
          marker_length?: number
          order_id?: string | null
          part_name?: string
          quantity?: number
          reason?: string | null
          remark?: string | null
          size_code?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_recutting_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_acknowledgments: {
        Row: {
          acknowledgment_no: string
          created_at: string
          created_by: string | null
          delivery_date: string
          id: string
          line_recorder_signature: string | null
          line_supervisor_signature: string | null
          notes: string | null
          received_by: string | null
          request_id: string | null
          updated_at: string
        }
        Insert: {
          acknowledgment_no: string
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          id?: string
          line_recorder_signature?: string | null
          line_supervisor_signature?: string | null
          notes?: string | null
          received_by?: string | null
          request_id?: string | null
          updated_at?: string
        }
        Update: {
          acknowledgment_no?: string
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          id?: string
          line_recorder_signature?: string | null
          line_supervisor_signature?: string | null
          notes?: string | null
          received_by?: string | null
          request_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_acknowledgments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_items: {
        Row: {
          acknowledgment_id: string | null
          balance_qty: number | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          issued_qty: number | null
          item_code: string | null
          request_item_id: string | null
          requirement_qty: number | null
          size: string | null
          unit: string | null
        }
        Insert: {
          acknowledgment_id?: string | null
          balance_qty?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issued_qty?: number | null
          item_code?: string | null
          request_item_id?: string | null
          requirement_qty?: number | null
          size?: string | null
          unit?: string | null
        }
        Update: {
          acknowledgment_id?: string | null
          balance_qty?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issued_qty?: number | null
          item_code?: string | null
          request_item_id?: string | null
          requirement_qty?: number | null
          size?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_items_acknowledgment_id_fkey"
            columns: ["acknowledgment_id"]
            isOneToOne: false
            referencedRelation: "delivery_acknowledgments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "request_items"
            referencedColumns: ["id"]
          },
        ]
      }
      fabric_calculations: {
        Row: {
          balance: number | null
          created_at: string
          created_by: string | null
          fabric_type: string
          id: string
          order_id: string | null
          received_meters: number | null
          remarks: string | null
          request_with_allowance: number | null
          total_meters: number | null
          total_yards: number | null
          updated_at: string
          used_meters: number | null
          wastage_percent: number | null
        }
        Insert: {
          balance?: number | null
          created_at?: string
          created_by?: string | null
          fabric_type: string
          id?: string
          order_id?: string | null
          received_meters?: number | null
          remarks?: string | null
          request_with_allowance?: number | null
          total_meters?: number | null
          total_yards?: number | null
          updated_at?: string
          used_meters?: number | null
          wastage_percent?: number | null
        }
        Update: {
          balance?: number | null
          created_at?: string
          created_by?: string | null
          fabric_type?: string
          id?: string
          order_id?: string | null
          received_meters?: number | null
          remarks?: string | null
          request_with_allowance?: number | null
          total_meters?: number | null
          total_yards?: number | null
          updated_at?: string
          used_meters?: number | null
          wastage_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fabric_calculations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fabric_rolls: {
        Row: {
          created_at: string
          created_by: string | null
          fabric_type: string
          id: string
          received_date: string | null
          roll_no: string
          status: string | null
          system_length: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fabric_type: string
          id?: string
          received_date?: string | null
          roll_no: string
          status?: string | null
          system_length?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fabric_type?: string
          id?: string
          received_date?: string | null
          roll_no?: string
          status?: string | null
          system_length?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      lay_records: {
        Row: {
          actual_lays: number | null
          big_end: number | null
          created_at: string
          created_by: string | null
          cut_no: number | null
          cut_plan_id: string | null
          damage: number | null
          id: string
          layed_mts: number | null
          marker_length: number | null
          overlap_yards: number | null
          recut_return: number | null
          remarks: string | null
          roll_end: number | null
          roll_end_next_ply_1st: number | null
          roll_end_next_ply_2nd: number | null
          roll_id: string | null
          roll_no: string | null
          roll_shortage_increase: number | null
          shade: string | null
          system_roll_length: number | null
          total_usage: number | null
          unusable_roll_end: number | null
          updated_at: string
        }
        Insert: {
          actual_lays?: number | null
          big_end?: number | null
          created_at?: string
          created_by?: string | null
          cut_no?: number | null
          cut_plan_id?: string | null
          damage?: number | null
          id?: string
          layed_mts?: number | null
          marker_length?: number | null
          overlap_yards?: number | null
          recut_return?: number | null
          remarks?: string | null
          roll_end?: number | null
          roll_end_next_ply_1st?: number | null
          roll_end_next_ply_2nd?: number | null
          roll_id?: string | null
          roll_no?: string | null
          roll_shortage_increase?: number | null
          shade?: string | null
          system_roll_length?: number | null
          total_usage?: number | null
          unusable_roll_end?: number | null
          updated_at?: string
        }
        Update: {
          actual_lays?: number | null
          big_end?: number | null
          created_at?: string
          created_by?: string | null
          cut_no?: number | null
          cut_plan_id?: string | null
          damage?: number | null
          id?: string
          layed_mts?: number | null
          marker_length?: number | null
          overlap_yards?: number | null
          recut_return?: number | null
          remarks?: string | null
          roll_end?: number | null
          roll_end_next_ply_1st?: number | null
          roll_end_next_ply_2nd?: number | null
          roll_id?: string | null
          roll_no?: string | null
          roll_shortage_increase?: number | null
          shade?: string | null
          system_roll_length?: number | null
          total_usage?: number | null
          unusable_roll_end?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lay_records_cut_plan_id_fkey"
            columns: ["cut_plan_id"]
            isOneToOne: false
            referencedRelation: "cut_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lay_sheets: {
        Row: {
          created_at: string
          created_by: string | null
          cut_plan_id: string | null
          fabric_type: string | null
          fabric_width: number | null
          id: string
          lay_length: number | null
          notes: string | null
          plies: number | null
          sheet_no: string
          status: string
          total_pieces: number | null
          updated_at: string
          wastage_percent: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cut_plan_id?: string | null
          fabric_type?: string | null
          fabric_width?: number | null
          id?: string
          lay_length?: number | null
          notes?: string | null
          plies?: number | null
          sheet_no: string
          status?: string
          total_pieces?: number | null
          updated_at?: string
          wastage_percent?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cut_plan_id?: string | null
          fabric_type?: string | null
          fabric_width?: number | null
          id?: string
          lay_length?: number | null
          notes?: string | null
          plies?: number | null
          sheet_no?: string
          status?: string
          total_pieces?: number | null
          updated_at?: string
          wastage_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lay_sheets_cut_plan_id_fkey"
            columns: ["cut_plan_id"]
            isOneToOne: false
            referencedRelation: "cut_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      marker_plans: {
        Row: {
          created_at: string
          created_by: string | null
          efficiency: number | null
          id: string
          marker_length: number | null
          marker_no: string
          marker_width: number | null
          notes: string | null
          order_id: string | null
          pieces_per_marker: number | null
          size_combination: string | null
          sizes: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          efficiency?: number | null
          id?: string
          marker_length?: number | null
          marker_no: string
          marker_width?: number | null
          notes?: string | null
          order_id?: string | null
          pieces_per_marker?: number | null
          size_combination?: string | null
          sizes?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          efficiency?: number | null
          id?: string
          marker_length?: number | null
          marker_no?: string
          marker_width?: number | null
          notes?: string | null
          order_id?: string | null
          pieces_per_marker?: number | null
          size_combination?: string | null
          sizes?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marker_plans_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      material_catalog: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          item_code: string
          uom: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          item_code: string
          uom?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          item_code?: string
          uom?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          custom_sizes: Json | null
          customer: string
          delivery_date: string | null
          fabric_type: string | null
          fabric_width: number | null
          id: string
          order_date: string | null
          order_no: string
          quantity: number
          shade: string | null
          size_quantities: Json | null
          status: string
          style_name: string | null
          style_no: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_sizes?: Json | null
          customer: string
          delivery_date?: string | null
          fabric_type?: string | null
          fabric_width?: number | null
          id?: string
          order_date?: string | null
          order_no: string
          quantity?: number
          shade?: string | null
          size_quantities?: Json | null
          status?: string
          style_name?: string | null
          style_no: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_sizes?: Json | null
          customer?: string
          delivery_date?: string | null
          fabric_type?: string | null
          fabric_width?: number | null
          id?: string
          order_date?: string | null
          order_no?: string
          quantity?: number
          shade?: string | null
          size_quantities?: Json | null
          status?: string
          style_name?: string | null
          style_no?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ratios: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          order_id: string | null
          planned_qty: Json | null
          plies: number | null
          ratio_name: string | null
          ratio_number: number | null
          sizes: Json | null
          total_qty: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          order_id?: string | null
          planned_qty?: Json | null
          plies?: number | null
          ratio_name?: string | null
          ratio_number?: number | null
          sizes?: Json | null
          total_qty?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          order_id?: string | null
          planned_qty?: Json | null
          plies?: number | null
          ratio_name?: string | null
          ratio_number?: number | null
          sizes?: Json | null
          total_qty?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratios_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      request_items: {
        Row: {
          balance_qty: number | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          issued_qty: number | null
          item_code: string | null
          notes: string | null
          request_id: string | null
          requested_qty: number
          requirement_id: string | null
          size: string | null
          sort_order: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          balance_qty?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issued_qty?: number | null
          item_code?: string | null
          notes?: string | null
          request_id?: string | null
          requested_qty?: number
          requirement_id?: string | null
          size?: string | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          balance_qty?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issued_qty?: number | null
          item_code?: string | null
          notes?: string | null
          request_id?: string | null
          requested_qty?: number
          requirement_id?: string | null
          size?: string | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          notes: string | null
          order_id: string | null
          request_date: string
          request_no: string
          requested_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          request_date?: string
          request_no: string
          requested_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          request_date?: string
          request_no?: string
          requested_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      requirements: {
        Row: {
          balance_qty: number | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          item_code: string
          notes: string | null
          order_id: string | null
          received_qty: number | null
          required_qty: number
          size: string | null
          sort_order: number | null
          status: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          balance_qty?: number | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item_code: string
          notes?: string | null
          order_id?: string | null
          received_qty?: number | null
          required_qty?: number
          size?: string | null
          sort_order?: number | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          balance_qty?: number | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item_code?: string
          notes?: string | null
          order_id?: string | null
          received_qty?: number | null
          required_qty?: number
          size?: string | null
          sort_order?: number | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
