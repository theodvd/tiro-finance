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
      bridge_accounts: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          name: string
          provider: string
          provider_account_id: string
          raw_json: Json | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name: string
          provider: string
          provider_account_id: string
          raw_json?: Json | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name?: string
          provider?: string
          provider_account_id?: string
          raw_json?: Json | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bridge_transactions: {
        Row: {
          amount: number
          bridge_account_id: string
          bridge_transaction_id: string
          category: string | null
          created_at: string | null
          currency: string | null
          date: string
          description: string | null
          id: string
          raw_json: Json | null
          user_id: string
        }
        Insert: {
          amount: number
          bridge_account_id: string
          bridge_transaction_id: string
          category?: string | null
          created_at?: string | null
          currency?: string | null
          date: string
          description?: string | null
          id?: string
          raw_json?: Json | null
          user_id: string
        }
        Update: {
          amount?: number
          bridge_account_id?: string
          bridge_transaction_id?: string
          category?: string | null
          created_at?: string | null
          currency?: string | null
          date?: string
          description?: string | null
          id?: string
          raw_json?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bridge_transactions_bridge_account_id_fkey"
            columns: ["bridge_account_id"]
            isOneToOne: false
            referencedRelation: "bridge_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      dca_plans: {
        Row: {
          account_id: string
          active: boolean
          amount: number
          created_at: string
          frequency: string
          id: string
          interval_days: number | null
          investment_mode: string
          monthday: number | null
          next_execution_date: string | null
          security_id: string
          source_account_id: string | null
          start_date: string
          updated_at: string
          user_id: string
          weekday: number | null
        }
        Insert: {
          account_id: string
          active?: boolean
          amount: number
          created_at?: string
          frequency: string
          id?: string
          interval_days?: number | null
          investment_mode?: string
          monthday?: number | null
          next_execution_date?: string | null
          security_id: string
          source_account_id?: string | null
          start_date: string
          updated_at?: string
          user_id: string
          weekday?: number | null
        }
        Update: {
          account_id?: string
          active?: boolean
          amount?: number
          created_at?: string
          frequency?: string
          id?: string
          interval_days?: number | null
          investment_mode?: string
          monthday?: number | null
          next_execution_date?: string | null
          security_id?: string
          source_account_id?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dca_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dca_plans_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dca_plans_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "bridge_accounts"
            referencedColumns: ["id"]
          },
        ]
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
          isin: string | null
          name: string
          pricing_source: Database["public"]["Enums"]["pricing_source"]
          region: string | null
          sector: string | null
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          created_at?: string
          currency_quote: string
          id?: string
          isin?: string | null
          name: string
          pricing_source: Database["public"]["Enums"]["pricing_source"]
          region?: string | null
          sector?: string | null
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          created_at?: string
          currency_quote?: string
          id?: string
          isin?: string | null
          name?: string
          pricing_source?: Database["public"]["Enums"]["pricing_source"]
          region?: string | null
          sector?: string | null
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      snapshot_lines: {
        Row: {
          account_id: string
          asset_class: Database["public"]["Enums"]["asset_class"] | null
          cost_eur: number | null
          created_at: string
          id: string
          last_px_eur: number
          market_value_eur: number
          region: string | null
          sector: string | null
          security_id: string
          shares: number
          snapshot_id: string | null
          user_id: string
          valuation_date: string
        }
        Insert: {
          account_id: string
          asset_class?: Database["public"]["Enums"]["asset_class"] | null
          cost_eur?: number | null
          created_at?: string
          id?: string
          last_px_eur: number
          market_value_eur: number
          region?: string | null
          sector?: string | null
          security_id: string
          shares: number
          snapshot_id?: string | null
          user_id: string
          valuation_date?: string
        }
        Update: {
          account_id?: string
          asset_class?: Database["public"]["Enums"]["asset_class"] | null
          cost_eur?: number | null
          created_at?: string
          id?: string
          last_px_eur?: number
          market_value_eur?: number
          region?: string | null
          sector?: string | null
          security_id?: string
          shares?: number
          snapshot_id?: string | null
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
          {
            foreignKeyName: "snapshot_lines_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshot_lines_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_latest_snapshot"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshots: {
        Row: {
          created_at: string
          id: string
          meta: Json
          pnl_eur: number
          pnl_pct: number
          snapshot_ts: string
          snapshot_type: string
          total_invested_eur: number
          total_value_eur: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json
          pnl_eur?: number
          pnl_pct?: number
          snapshot_ts?: string
          snapshot_type?: string
          total_invested_eur?: number
          total_value_eur?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json
          pnl_eur?: number
          pnl_pct?: number
          snapshot_ts?: string
          snapshot_type?: string
          total_invested_eur?: number
          total_value_eur?: number
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          created_at: string
          dca_plan_id: string | null
          executed_at: string
          fees_eur: number | null
          id: string
          notes: string | null
          price_eur: number
          security_id: string
          shares: number
          source_account_id: string | null
          total_eur: number
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          dca_plan_id?: string | null
          executed_at?: string
          fees_eur?: number | null
          id?: string
          notes?: string | null
          price_eur: number
          security_id: string
          shares: number
          source_account_id?: string | null
          total_eur: number
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          dca_plan_id?: string | null
          executed_at?: string
          fees_eur?: number | null
          id?: string
          notes?: string | null
          price_eur?: number
          security_id?: string
          shares?: number
          source_account_id?: string | null
          total_eur?: number
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_dca_plan_id_fkey"
            columns: ["dca_plan_id"]
            isOneToOne: false
            referencedRelation: "dca_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "securities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "bridge_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          age: number | null
          ai_expectations: Json | null
          available_time: string | null
          cash_target_pct: number | null
          city: string | null
          commitment_apply_advice: boolean | null
          commitment_long_term_investing: boolean | null
          commitment_regular_learning: boolean | null
          communication_tone: string | null
          created_at: string
          current_savings: Json | null
          current_situation: string | null
          debts: Json | null
          emotional_stability: string | null
          esg_importance: string | null
          existing_investments: Json | null
          financial_resilience_months: string | null
          first_name: string | null
          fomo_tendency: string | null
          housing_situation: string | null
          id: string
          income_stability: string | null
          investment_experience: string | null
          investment_horizon: string | null
          knowledge_levels: Json | null
          learning_topics: string[] | null
          loss_impact: string | null
          main_project: string | null
          management_style: string | null
          max_acceptable_loss: string | null
          max_asset_class_pct: number | null
          max_etf_position_pct: number | null
          max_position_pct: number | null
          monthly_expenses: Json | null
          monthly_income: Json | null
          onboarding_answers: Json | null
          panic_selling_history: boolean | null
          priorities: Json | null
          profile_computed_at: string | null
          profile_confidence: string | null
          project_budget: number | null
          project_horizon_months: number | null
          reaction_to_gains: string | null
          reaction_to_volatility: string | null
          regretted_purchases_history: boolean | null
          remaining_monthly: number | null
          risk_percentage_on_main_goal: number | null
          risk_profile: string | null
          risk_vision: string | null
          saveable_monthly: number | null
          score_behavior: number | null
          score_capacity: number | null
          score_capacity_computed: number | null
          score_horizon: number | null
          score_knowledge: number | null
          score_objectives_computed: number | null
          score_tolerance: number | null
          score_tolerance_computed: number | null
          score_total: number | null
          score_total_computed: number | null
          sectors_of_interest: string[] | null
          sectors_to_avoid: string[] | null
          thresholds_mode: string | null
          upcoming_constraints: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          ai_expectations?: Json | null
          available_time?: string | null
          cash_target_pct?: number | null
          city?: string | null
          commitment_apply_advice?: boolean | null
          commitment_long_term_investing?: boolean | null
          commitment_regular_learning?: boolean | null
          communication_tone?: string | null
          created_at?: string
          current_savings?: Json | null
          current_situation?: string | null
          debts?: Json | null
          emotional_stability?: string | null
          esg_importance?: string | null
          existing_investments?: Json | null
          financial_resilience_months?: string | null
          first_name?: string | null
          fomo_tendency?: string | null
          housing_situation?: string | null
          id?: string
          income_stability?: string | null
          investment_experience?: string | null
          investment_horizon?: string | null
          knowledge_levels?: Json | null
          learning_topics?: string[] | null
          loss_impact?: string | null
          main_project?: string | null
          management_style?: string | null
          max_acceptable_loss?: string | null
          max_asset_class_pct?: number | null
          max_etf_position_pct?: number | null
          max_position_pct?: number | null
          monthly_expenses?: Json | null
          monthly_income?: Json | null
          onboarding_answers?: Json | null
          panic_selling_history?: boolean | null
          priorities?: Json | null
          profile_computed_at?: string | null
          profile_confidence?: string | null
          project_budget?: number | null
          project_horizon_months?: number | null
          reaction_to_gains?: string | null
          reaction_to_volatility?: string | null
          regretted_purchases_history?: boolean | null
          remaining_monthly?: number | null
          risk_percentage_on_main_goal?: number | null
          risk_profile?: string | null
          risk_vision?: string | null
          saveable_monthly?: number | null
          score_behavior?: number | null
          score_capacity?: number | null
          score_capacity_computed?: number | null
          score_horizon?: number | null
          score_knowledge?: number | null
          score_objectives_computed?: number | null
          score_tolerance?: number | null
          score_tolerance_computed?: number | null
          score_total?: number | null
          score_total_computed?: number | null
          sectors_of_interest?: string[] | null
          sectors_to_avoid?: string[] | null
          thresholds_mode?: string | null
          upcoming_constraints?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          ai_expectations?: Json | null
          available_time?: string | null
          cash_target_pct?: number | null
          city?: string | null
          commitment_apply_advice?: boolean | null
          commitment_long_term_investing?: boolean | null
          commitment_regular_learning?: boolean | null
          communication_tone?: string | null
          created_at?: string
          current_savings?: Json | null
          current_situation?: string | null
          debts?: Json | null
          emotional_stability?: string | null
          esg_importance?: string | null
          existing_investments?: Json | null
          financial_resilience_months?: string | null
          first_name?: string | null
          fomo_tendency?: string | null
          housing_situation?: string | null
          id?: string
          income_stability?: string | null
          investment_experience?: string | null
          investment_horizon?: string | null
          knowledge_levels?: Json | null
          learning_topics?: string[] | null
          loss_impact?: string | null
          main_project?: string | null
          management_style?: string | null
          max_acceptable_loss?: string | null
          max_asset_class_pct?: number | null
          max_etf_position_pct?: number | null
          max_position_pct?: number | null
          monthly_expenses?: Json | null
          monthly_income?: Json | null
          onboarding_answers?: Json | null
          panic_selling_history?: boolean | null
          priorities?: Json | null
          profile_computed_at?: string | null
          profile_confidence?: string | null
          project_budget?: number | null
          project_horizon_months?: number | null
          reaction_to_gains?: string | null
          reaction_to_volatility?: string | null
          regretted_purchases_history?: boolean | null
          remaining_monthly?: number | null
          risk_percentage_on_main_goal?: number | null
          risk_profile?: string | null
          risk_vision?: string | null
          saveable_monthly?: number | null
          score_behavior?: number | null
          score_capacity?: number | null
          score_capacity_computed?: number | null
          score_horizon?: number | null
          score_knowledge?: number | null
          score_objectives_computed?: number | null
          score_tolerance?: number | null
          score_tolerance_computed?: number | null
          score_total?: number | null
          score_total_computed?: number | null
          sectors_of_interest?: string[] | null
          sectors_to_avoid?: string[] | null
          thresholds_mode?: string | null
          upcoming_constraints?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_latest_alloc_by_account: {
        Row: {
          account_id: string | null
          account_name: string | null
          account_type: string | null
          user_id: string | null
          value_eur: number | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_latest_alloc_by_asset_class: {
        Row: {
          asset_class: string | null
          user_id: string | null
          value_eur: number | null
        }
        Relationships: []
      }
      v_latest_alloc_by_region: {
        Row: {
          region: string | null
          user_id: string | null
          value_eur: number | null
        }
        Relationships: []
      }
      v_latest_alloc_by_sector: {
        Row: {
          sector: string | null
          user_id: string | null
          value_eur: number | null
        }
        Relationships: []
      }
      v_latest_market_price: {
        Row: {
          last_px_eur: number | null
          security_id: string | null
          updated_at: string | null
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
      v_latest_snapshot: {
        Row: {
          created_at: string | null
          id: string | null
          meta: Json | null
          pnl_eur: number | null
          pnl_pct: number | null
          snapshot_ts: string | null
          total_invested_eur: number | null
          total_value_eur: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_snapshot_totals: {
        Row: {
          d: string | null
          total_invested_eur: number | null
          total_value_eur: number | null
          user_id: string | null
        }
        Insert: {
          d?: string | null
          total_invested_eur?: number | null
          total_value_eur?: number | null
          user_id?: string | null
        }
        Update: {
          d?: string | null
          total_invested_eur?: number | null
          total_value_eur?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      extract_date_immutable: { Args: { ts: string }; Returns: string }
      snapshot_exists_for_period: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_snapshot_type: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "CTO" | "PEA" | "AV" | "CRYPTO" | "LIVRETS" | "OTHER"
      asset_class: "STOCK" | "ETF" | "CRYPTO" | "BOND" | "REIT" | "CASH"
      pricing_source: "YFINANCE" | "COINGECKO" | "MANUAL"
      transaction_type: "BUY" | "SELL" | "DCA_BUY" | "DIVIDEND" | "TRANSFER"
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
      asset_class: ["STOCK", "ETF", "CRYPTO", "BOND", "REIT", "CASH"],
      pricing_source: ["YFINANCE", "COINGECKO", "MANUAL"],
      transaction_type: ["BUY", "SELL", "DCA_BUY", "DIVIDEND", "TRANSFER"],
    },
  },
} as const
