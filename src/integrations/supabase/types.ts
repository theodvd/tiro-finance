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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          asof: string
          base: string
          created_at: string
          id: string
          quote: string
          rate: number
        }
        Insert: {
          asof: string
          base?: string
          created_at?: string
          id?: string
          quote: string
          rate: number
        }
        Update: {
          asof?: string
          base?: string
          created_at?: string
          id?: string
          quote?: string
          rate?: number
        }
        Relationships: []
      }
      holdings: {
        Row: {
          account_id: string
          amount_invested_eur: number | null
          avg_buy_price_native: number | null
          created_at: string
          id: string
          security_id: string
          shares: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount_invested_eur?: number | null
          avg_buy_price_native?: number | null
          created_at?: string
          id?: string
          security_id: string
          shares?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount_invested_eur?: number | null
          avg_buy_price_native?: number | null
          created_at?: string
          id?: string
          security_id?: string
          shares?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          message: string | null
          started_at: string
          status: Database["public"]["Enums"]["import_job_status"]
          type: Database["public"]["Enums"]["import_job_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          message?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["import_job_status"]
          type: Database["public"]["Enums"]["import_job_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          message?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["import_job_status"]
          type?: Database["public"]["Enums"]["import_job_type"]
          user_id?: string
        }
        Relationships: []
      }
      market_data: {
        Row: {
          eur_fx: number
          id: string
          last_close_dt: string
          last_px_eur: number
          last_px_native: number
          native_ccy: string
          security_id: string
          updated_at: string
        }
        Insert: {
          eur_fx?: number
          id?: string
          last_close_dt: string
          last_px_eur: number
          last_px_native: number
          native_ccy: string
          security_id: string
          updated_at?: string
        }
        Update: {
          eur_fx?: number
          id?: string
          last_close_dt?: string
          last_px_eur?: number
          last_px_native?: number
          native_ccy?: string
          security_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_data_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: true
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
        ]
      }
      securities: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          created_at: string
          currency_quote: string
          id: string
          name: string
          pricing_source: Database["public"]["Enums"]["pricing_source"]
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          created_at?: string
          currency_quote: string
          id?: string
          name: string
          pricing_source: Database["public"]["Enums"]["pricing_source"]
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          created_at?: string
          currency_quote?: string
          id?: string
          name?: string
          pricing_source?: Database["public"]["Enums"]["pricing_source"]
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      snapshot_lines: {
        Row: {
          account_id: string
          cost_eur: number | null
          created_at: string
          id: string
          last_px_eur: number
          market_value_eur: number
          security_id: string
          shares: number
          user_id: string
          valuation_date: string
        }
        Insert: {
          account_id: string
          cost_eur?: number | null
          created_at?: string
          id?: string
          last_px_eur: number
          market_value_eur: number
          security_id: string
          shares: number
          user_id: string
          valuation_date: string
        }
        Update: {
          account_id?: string
          cost_eur?: number | null
          created_at?: string
          id?: string
          last_px_eur?: number
          market_value_eur?: number
          security_id?: string
          shares?: number
          user_id?: string
          valuation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshot_lines_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
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
      account_type: "CTO" | "PEA" | "AV" | "CRYPTO" | "LIVRETS" | "OTHER"
      asset_class: "EQUITY" | "ETF" | "CRYPTO" | "BOND" | "REIT" | "CASH"
      import_job_status: "PENDING" | "OK" | "ERROR"
      import_job_type: "PRICE_REFRESH" | "SNAPSHOT" | "CSV_IMPORT"
      pricing_source: "YFINANCE" | "COINGECKO" | "MANUAL"
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
      account_type: ["CTO", "PEA", "AV", "CRYPTO", "LIVRETS", "OTHER"],
      asset_class: ["EQUITY", "ETF", "CRYPTO", "BOND", "REIT", "CASH"],
      import_job_status: ["PENDING", "OK", "ERROR"],
      import_job_type: ["PRICE_REFRESH", "SNAPSHOT", "CSV_IMPORT"],
      pricing_source: ["YFINANCE", "COINGECKO", "MANUAL"],
    },
  },
} as const
