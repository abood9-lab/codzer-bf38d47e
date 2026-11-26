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
      chats: {
        Row: {
          created_at: string
          description: string
          id: string
          messages: Json
          model: string
          provider: string
          updated_at: string
          url_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id: string
          messages?: Json
          model?: string
          provider?: string
          updated_at?: string
          url_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          messages?: Json
          model?: string
          provider?: string
          updated_at?: string
          url_id?: string
          user_id?: string
        }
        Relationships: []
      }
      legacy_user_imports: {
        Row: {
          bio: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          is_admin: boolean
          legacy_uid: string
          photo_url: string
          username: string
        }
        Insert: {
          bio?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          display_name?: string
          email: string
          id?: string
          is_admin?: boolean
          legacy_uid: string
          photo_url?: string
          username?: string
        }
        Update: {
          bio?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          is_admin?: boolean
          legacy_uid?: string
          photo_url?: string
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string
          created_at: string
          display_name: string
          email: string
          id: string
          legacy_uid: string | null
          photo_url: string
          updated_at: string
          username: string
        }
        Insert: {
          bio?: string
          created_at?: string
          display_name?: string
          email?: string
          id: string
          legacy_uid?: string | null
          photo_url?: string
          updated_at?: string
          username?: string
        }
        Update: {
          bio?: string
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          legacy_uid?: string | null
          photo_url?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          content: string
          id: string
          mime_type: string
          owner_id: string
          project_id: string
          relative_path: string
          size_bytes: number
          storage_location: string
          updated_at: string
        }
        Insert: {
          content?: string
          id: string
          mime_type?: string
          owner_id: string
          project_id: string
          relative_path: string
          size_bytes?: number
          storage_location?: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          mime_type?: string
          owner_id?: string
          project_id?: string
          relative_path?: string
          size_bytes?: number
          storage_location?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_secrets: {
        Row: {
          encrypted_value: string
          name: string
          owner_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          encrypted_value: string
          name: string
          owner_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          encrypted_value?: string
          name?: string
          owner_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_secrets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          last_active_at: string
          last_stopped_at: string | null
          migration_status: string
          name: string
          owner_id: string
          sandbox_id: string | null
          sandbox_status: string
          storage_backend: string
          total_bytes: number
          total_files: number
          updated_at: string
          volume_id: string | null
          volume_name: string
          volume_subpath: string
        }
        Insert: {
          created_at?: string
          id: string
          last_active_at?: string
          last_stopped_at?: string | null
          migration_status?: string
          name?: string
          owner_id: string
          sandbox_id?: string | null
          sandbox_status?: string
          storage_backend?: string
          total_bytes?: number
          total_files?: number
          updated_at?: string
          volume_id?: string | null
          volume_name?: string
          volume_subpath?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_active_at?: string
          last_stopped_at?: string | null
          migration_status?: string
          name?: string
          owner_id?: string
          sandbox_id?: string | null
          sandbox_status?: string
          storage_backend?: string
          total_bytes?: number
          total_files?: number
          updated_at?: string
          volume_id?: string | null
          volume_name?: string
          volume_subpath?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      workspace_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          last_heartbeat_at: string
          owner_id: string
          project_id: string
          sandbox_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id: string
          last_heartbeat_at?: string
          owner_id: string
          project_id: string
          sandbox_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          last_heartbeat_at?: string
          owner_id?: string
          project_id?: string
          sandbox_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
