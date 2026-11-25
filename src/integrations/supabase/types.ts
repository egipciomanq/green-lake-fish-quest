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
      app_settings: {
        Row: {
          catch_cooldown_seconds: number
          coins_common: number
          coins_epic: number
          coins_legendary: number
          coins_per_usd: number
          coins_rare: number
          daily_catch_limit: number
          daily_coin_cap: number
          id: number
          maintenance: boolean
          min_account_days: number
          min_withdraw_coins: number
          referral_bonus_coins: number
          referral_percent: number
          updated_at: string
          withdraw_fee_percent: number
          withdrawals_enabled: boolean
        }
        Insert: {
          catch_cooldown_seconds?: number
          coins_common?: number
          coins_epic?: number
          coins_legendary?: number
          coins_per_usd?: number
          coins_rare?: number
          daily_catch_limit?: number
          daily_coin_cap?: number
          id?: number
          maintenance?: boolean
          min_account_days?: number
          min_withdraw_coins?: number
          referral_bonus_coins?: number
          referral_percent?: number
          updated_at?: string
          withdraw_fee_percent?: number
          withdrawals_enabled?: boolean
        }
        Update: {
          catch_cooldown_seconds?: number
          coins_common?: number
          coins_epic?: number
          coins_legendary?: number
          coins_per_usd?: number
          coins_rare?: number
          daily_catch_limit?: number
          daily_coin_cap?: number
          id?: number
          maintenance?: boolean
          min_account_days?: number
          min_withdraw_coins?: number
          referral_bonus_coins?: number
          referral_percent?: number
          updated_at?: string
          withdraw_fee_percent?: number
          withdrawals_enabled?: boolean
        }
        Relationships: []
      }
      coin_ledger: {
        Row: {
          created_at: string
          delta: number
          id: number
          meta: Json
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: number
          meta?: Json
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: number
          meta?: Json
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          baits: Json
          banned: boolean
          chests: Json
          coins: number
          collection: Json
          created_at: string
          display_name: string | null
          id: string
          last_catch_at: string | null
          level: number
          referral_code: string
          referral_rewarded: boolean
          referred_by: string | null
          telegram_id: number | null
          username: string | null
          world_id: string
          xp: number
        }
        Insert: {
          baits?: Json
          banned?: boolean
          chests?: Json
          coins?: number
          collection?: Json
          created_at?: string
          display_name?: string | null
          id: string
          last_catch_at?: string | null
          level?: number
          referral_code?: string
          referral_rewarded?: boolean
          referred_by?: string | null
          telegram_id?: number | null
          username?: string | null
          world_id?: string
          xp?: number
        }
        Update: {
          baits?: Json
          banned?: boolean
          chests?: Json
          coins?: number
          collection?: Json
          created_at?: string
          display_name?: string | null
          id?: string
          last_catch_at?: string | null
          level?: number
          referral_code?: string
          referral_rewarded?: boolean
          referred_by?: string | null
          telegram_id?: number | null
          username?: string | null
          world_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          address: string
          admin_note: string | null
          coins: number
          created_at: string
          id: string
          network: string
          processed_at: string | null
          status: string
          tx_hash: string | null
          usd: number
          user_id: string
        }
        Insert: {
          address: string
          admin_note?: string | null
          coins: number
          created_at?: string
          id?: string
          network?: string
          processed_at?: string | null
          status?: string
          tx_hash?: string | null
          usd: number
          user_id: string
        }
        Update: {
          address?: string
          admin_note?: string | null
          coins?: number
          created_at?: string
          id?: string
          network?: string
          processed_at?: string | null
          status?: string
          tx_hash?: string | null
          usd?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_coins: {
        Args: { _delta: number; _meta?: Json; _reason: string; _user: string }
        Returns: number
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
