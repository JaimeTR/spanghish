
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_logs": {
                  Row: {
                    "action": string,"actor": string | null,"at": string,"id": number,"new_data": Json | null,"old_data": Json | null,"row_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor"?: string | null,"at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"row_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor"?: string | null,"at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"row_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"languages": {
                  Row: {
                    "active": boolean,"code": string,"name_en": string,"name_es": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"code": string,"name_en": string,"name_es": string
                  }
                  Update: {
                    "active"?: boolean,"code"?: string,"name_en"?: string,"name_es"?: string
                  }
                  Relationships: [
                    
                  ]
                },"levels": {
                  Row: {
                    "code": string,"id": string,"language_code": string,"name_en": string,"name_es": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"id"?: string,"language_code": string,"name_en": string,"name_es": string,"sort": number
                  }
                  Update: {
                    "code"?: string,"id"?: string,"language_code"?: string,"name_en"?: string,"name_es"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "levels_language_code_fkey"
      columns: ["language_code"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    }
                  ]
                },"locations": {
                  Row: {
                    "active": boolean,"address": string | null,"created_at": string,"id": string,"kind": Database["public"]['Enums']["location_kind"],"map_url": string | null,"name": string,"region": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"address"?: string | null,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["location_kind"],"map_url"?: string | null,"name": string,"region": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"address"?: string | null,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["location_kind"],"map_url"?: string | null,"name"?: string,"region"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string | null,"id": string,"preferred_locale": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"preferred_locale"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"preferred_locale"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"program_editions": {
                  Row: {
                    "created_at": string,"ends_on": string,"id": string,"label_en": string | null,"label_es": string | null,"program_id": string,"starts_on": string,"status": Database["public"]['Enums']["edition_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_on": string,"id"?: string,"label_en"?: string | null,"label_es"?: string | null,"program_id": string,"starts_on": string,"status"?: Database["public"]['Enums']["edition_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_on"?: string,"id"?: string,"label_en"?: string | null,"label_es"?: string | null,"program_id"?: string,"starts_on"?: string,"status"?: Database["public"]['Enums']["edition_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "program_editions_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                },"program_prices": {
                  Row: {
                    "active": boolean,"amount_cents": number,"created_at": string,"currency": string,"edition_id": string | null,"id": string,"kind": Database["public"]['Enums']["price_kind"],"label_en": string | null,"label_es": string | null,"lessons_included": number | null,"location_id": string | null,"program_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"amount_cents": number,"created_at"?: string,"currency"?: string,"edition_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["price_kind"],"label_en"?: string | null,"label_es"?: string | null,"lessons_included"?: number | null,"location_id"?: string | null,"program_id": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"amount_cents"?: number,"created_at"?: string,"currency"?: string,"edition_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["price_kind"],"label_en"?: string | null,"label_es"?: string | null,"lessons_included"?: number | null,"location_id"?: string | null,"program_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "program_prices_edition_fk"
      columns: ["edition_id","program_id"]
isOneToOne: false
      referencedRelation: "program_editions"
      referencedColumns: ["id","program_id"]
    },{
      foreignKeyName: "program_prices_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "locations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "program_prices_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "programs"
      referencedColumns: ["id"]
    }
                  ]
                },"programs": {
                  Row: {
                    "active": boolean,"audience": Database["public"]['Enums']["audience_segment"],"code": string,"created_at": string,"description_en": string | null,"description_es": string | null,"duration_weeks": number | null,"format": Database["public"]['Enums']["lesson_format"],"id": string,"is_public": boolean,"language_code": string,"lesson_minutes": number,"level_id": string | null,"name_en": string,"name_es": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"audience": Database["public"]['Enums']["audience_segment"],"code": string,"created_at"?: string,"description_en"?: string | null,"description_es"?: string | null,"duration_weeks"?: number | null,"format": Database["public"]['Enums']["lesson_format"],"id"?: string,"is_public"?: boolean,"language_code": string,"lesson_minutes"?: number,"level_id"?: string | null,"name_en": string,"name_es": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"audience"?: Database["public"]['Enums']["audience_segment"],"code"?: string,"created_at"?: string,"description_en"?: string | null,"description_es"?: string | null,"duration_weeks"?: number | null,"format"?: Database["public"]['Enums']["lesson_format"],"id"?: string,"is_public"?: boolean,"language_code"?: string,"lesson_minutes"?: number,"level_id"?: string | null,"name_en"?: string,"name_es"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "programs_language_code_fkey"
      columns: ["language_code"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "programs_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "account_status":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"enable_audit":
{ Args: { "p_table": unknown }; Returns: undefined
                           },
"has_role":
{ Args: { "r": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"is_active":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"user_has_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "app_role": "admin"|"teacher"|"student"|"guardian","audience_segment": "kids"|"adults"|"mature","edition_status": "draft"|"open"|"closed"|"cancelled","lesson_format": "individual"|"own_group"|"local_group","location_kind": "library"|"office"|"home"|"online","price_kind": "per_lesson"|"upfront"|"pack"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["admin", "teacher", "student", "guardian"],"audience_segment": ["kids", "adults", "mature"],"edition_status": ["draft", "open", "closed", "cancelled"],"lesson_format": ["individual", "own_group", "local_group"],"location_kind": ["library", "office", "home", "online"],"price_kind": ["per_lesson", "upfront", "pack"]
          }
        }
} as const
