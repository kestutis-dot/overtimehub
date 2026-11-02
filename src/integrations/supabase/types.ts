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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          created_at: string
          id: string
          min_hours_for_food: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_hours_for_food?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          min_hours_for_food?: number
          name?: string
        }
        Relationships: []
      }
      food_menus: {
        Row: {
          category: string
          company_id: string
          created_at: string
          id: string
          is_visible: boolean
          name: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          id?: string
          is_visible?: boolean
          name: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_menus_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          company_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_entries: {
        Row: {
          can_work: boolean
          company_id: string
          created_at: string
          food_comment: string | null
          food_id: string | null
          food_name: string | null
          hours: number | null
          id: string
          is_until_finished: boolean
          response_type: string
          session_id: string
          updated_at: string
          user_name: string
        }
        Insert: {
          can_work?: boolean
          company_id: string
          created_at?: string
          food_comment?: string | null
          food_id?: string | null
          food_name?: string | null
          hours?: number | null
          id?: string
          is_until_finished?: boolean
          response_type: string
          session_id: string
          updated_at?: string
          user_name: string
        }
        Update: {
          can_work?: boolean
          company_id?: string
          created_at?: string
          food_comment?: string | null
          food_id?: string | null
          food_name?: string | null
          hours?: number | null
          id?: string
          is_until_finished?: boolean
          response_type?: string
          session_id?: string
          updated_at?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "overtime_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_sessions: {
        Row: {
          company_id: string
          created_at: string
          date: string
          estimated_hours: number
          id: string
          includes_food: boolean
          is_open: boolean
          share_token: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date?: string
          estimated_hours?: number
          id?: string
          includes_food?: boolean
          is_open?: boolean
          share_token?: string
          title?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          estimated_hours?: number
          id?: string
          includes_food?: boolean
          is_open?: boolean
          share_token?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_company: { Args: { p_name: string }; Returns: string }
      is_member: { Args: { _company: string }; Returns: boolean }
      public_get_my_answer: {
        Args: { p_name: string; p_token: string }
        Returns: Json
      }
      public_get_request: { Args: { p_token: string }; Returns: Json }
      public_submit_answer: {
        Args: {
          p_food_comment: string
          p_food_id: string
          p_hours: number
          p_name: string
          p_response_type: string
          p_token: string
        }
        Returns: Json
      }
      rotate_share_token: { Args: { p_session_id: string }; Returns: string }
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
  public: {
    Enums: {},
  },
} as const
