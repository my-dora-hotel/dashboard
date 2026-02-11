export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          entry_type: "debt" | "receivable" | "both";
          advance_period_days: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          entry_type?: "debt" | "receivable" | "both";
          advance_period_days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          entry_type?: "debt" | "receivable" | "both";
          advance_period_days?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      ledger_drafts: {
        Row: {
          id: string;
          date: string | null;
          entries: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          date?: string | null;
          entries?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          date?: string | null;
          entries?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ledger_entries: {
        Row: {
          id: string;
          date: string;
          category_id: string;
          account_id: string;
          statement: string | null;
          receivable: number;
          debt: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          category_id: string;
          account_id: string;
          statement?: string | null;
          receivable?: number;
          debt?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          category_id?: string;
          account_id?: string;
          statement?: string | null;
          receivable?: number;
          debt?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_entries_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_account_id_fkey";
            columns: ["account_id"];
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          }
        ];
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          type: "account_statement" | "account_summary";
          title: string;
          parameters: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "account_statement" | "account_summary";
          title: string;
          parameters: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "account_statement" | "account_summary";
          title?: string;
          parameters?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_account_statement: {
        Args: {
          p_account_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Json;
      };
      get_account_summary: {
        Args: {
          p_start_date: string;
          p_end_date: string;
          p_category_id: string | null;
          p_filter_option: string;
        };
        Returns: Json;
      };
      get_account_totals: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier use
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export type Account = Database["public"]["Tables"]["accounts"]["Row"];
export type AccountInsert = Database["public"]["Tables"]["accounts"]["Insert"];
export type AccountUpdate = Database["public"]["Tables"]["accounts"]["Update"];

export type LedgerEntry = Database["public"]["Tables"]["ledger_entries"]["Row"];
export type LedgerEntryInsert = Database["public"]["Tables"]["ledger_entries"]["Insert"];
export type LedgerEntryUpdate = Database["public"]["Tables"]["ledger_entries"]["Update"];

// Extended types with relations
export type AccountWithCategory = Account & {
  categories: Category;
};

export type LedgerEntryWithRelations = LedgerEntry & {
  categories: Category;
  accounts: Account;
};

// Draft entry shape stored in JSONB
export interface LedgerDraftEntry {
  id: string;
  account_id: string;
  category_id: string;
  statement: string;
  type: "receivable" | "debt";
  amount: string;
}

export type LedgerDraftRow = Database["public"]["Tables"]["ledger_drafts"]["Row"];
export type LedgerDraftInsert = Database["public"]["Tables"]["ledger_drafts"]["Insert"];
export type LedgerDraftUpdate = Database["public"]["Tables"]["ledger_drafts"]["Update"];

// Typed draft with parsed entries
export type LedgerDraft = Omit<LedgerDraftRow, "entries"> & {
  entries: LedgerDraftEntry[];
};

export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];
