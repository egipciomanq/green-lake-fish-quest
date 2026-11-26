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
          ad_cooldown_seconds: number
          ad_daily_limit: number
          ad_reward_baits: number
          ad_reward_coins: number
          adsgram_block_id: string
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
          ad_cooldown_seconds?: number
          ad_daily_limit?: number
          ad_reward_baits?: number
          ad_reward_coins?: number
          adsgram_block_id?: string
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
          ad_cooldown_seconds?: number
          ad_daily_limit?: number
          ad_reward_baits?: number
          ad_reward_coins?: number
          adsgram_block_id?: string
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
          ads_today: number
          baits: Json
          banned: boolean
          chests: Json
          coins: number
          coins_day: string
          coins_today: number
          collection: Json
          created_at: string
          display_name: string | null
          id: string
          last_ad_at: string | null
          last_catch_at: string | null
          last_catch_result: Json | null
          level: number
          pending_catch: Json | null
          referral_code: string
          referral_earned: number
          referral_paid: number
          referral_rewarded: boolean
          referred_by: string | null
          telegram_id: number | null
          total_earned: number
          username: string | null
          world_id: string
          xp: number
        }
        Insert: {
          ads_today?: number
          baits?: Json
          banned?: boolean
          chests?: Json
          coins?: number
          coins_day?: string
          coins_today?: number
          collection?: Json
          created_at?: string
          display_name?: string | null
          id: string
          last_ad_at?: string | null
          last_catch_at?: string | null
          last_catch_result?: Json | null
          level?: number
          pending_catch?: Json | null
          referral_code?: string
          referral_earned?: number
          referral_paid?: number
          referral_rewarded?: boolean
          referred_by?: string | null
          telegram_id?: number | null
          total_earned?: number
          username?: string | null
          world_id?: string
          xp?: number
        }
        Update: {
          ads_today?: number
          baits?: Json
          banned?: boolean
          chests?: Json
          coins?: number
          coins_day?: string
          coins_today?: number
          collection?: Json
          created_at?: string
          display_name?: string | null
          id?: string
          last_ad_at?: string | null
          last_catch_at?: string | null
          last_catch_result?: Json | null
          level?: number
          pending_catch?: Json | null
          referral_code?: string
          referral_earned?: number
          referral_paid?: number
          referral_rewarded?: boolean
          referred_by?: string | null
          telegram_id?: number | null
          total_earned?: number
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
      begin_fishing_cast: {
        Args: {
          _bait_id: string
          _catch_id: string
          _fish_id: string
          _kg: number
          _user: string
          _world_id: string
        }
        Returns: Json
      }
      cancel_fishing_cast: {
        Args: { _catch_id: string; _user: string }
        Returns: boolean
      }
      create_fishing_withdrawal: {
        Args: { _address: string; _coins: number; _user: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      open_fishing_chest: {
        Args: {
          _expected_tier: string
          _index: number
          _loot: Json
          _user: string
        }
        Returns: Json
      }
      process_fishing_withdrawal: {
        Args: { _action: string; _id: string; _note: string; _tx_hash: string }
        Returns: Json
      }
      settle_fishing_catch: {
        Args: {
          _catch_id: string
          _rarity: string
          _user: string
          _xp_gain: number
        }
        Returns: Json
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
