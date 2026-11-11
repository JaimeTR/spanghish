
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
                },"consent_texts": {
                  Row: {
                    "body_en": string,"body_es": string,"created_at": string,"effective_from": string,"id": string,"kind": Database["public"]['Enums']["consent_kind"]
                  }
                  ComputedFields: never
                  Insert: {
                    "body_en": string,"body_es": string,"created_at"?: string,"effective_from": string,"id": string,"kind": Database["public"]['Enums']["consent_kind"]
                  }
                  Update: {
                    "body_en"?: string,"body_es"?: string,"created_at"?: string,"effective_from"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["consent_kind"]
                  }
                  Relationships: [
                    
                  ]
                },"consents": {
                  Row: {
                    "created_at": string,"granted": boolean,"guardian_id": string | null,"id": string,"kind": Database["public"]['Enums']["consent_kind"],"method": Database["public"]['Enums']["consent_method"],"recorded_at": string,"recorded_by": string | null,"student_id": string,"text_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"granted": boolean,"guardian_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["consent_kind"],"method": Database["public"]['Enums']["consent_method"],"recorded_at"?: string,"recorded_by"?: string | null,"student_id": string,"text_id": string
                  }
                  Update: {
                    "created_at"?: string,"granted"?: boolean,"guardian_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["consent_kind"],"method"?: Database["public"]['Enums']["consent_method"],"recorded_at"?: string,"recorded_by"?: string | null,"student_id"?: string,"text_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_guardian_id_fkey"
      columns: ["guardian_id"]
isOneToOne: false
      referencedRelation: "guardians"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consents_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consents_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consents_text_kind_fk"
      columns: ["text_id","kind"]
isOneToOne: false
      referencedRelation: "consent_texts"
      referencedColumns: ["id","kind"]
    }
                  ]
                },"guardians": {
                  Row: {
                    "created_at": string,"email": string,"full_name": string,"id": string,"phone": string | null,"preferred_locale": string,"profile_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"full_name": string,"id"?: string,"phone"?: string | null,"preferred_locale"?: string,"profile_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"phone"?: string | null,"preferred_locale"?: string,"profile_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guardians_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
                },"lesson_blocks": {
                  Row: {
                    "alt_en": string | null,"alt_es": string | null,"body_en": string | null,"body_es": string | null,"correct_option": number | null,"created_at": string,"explanation_en": string | null,"explanation_es": string | null,"game_data": Json | null,"game_type": string | null,"id": string,"image_height": number | null,"image_path": string | null,"image_width": number | null,"kind": Database["public"]['Enums']["lesson_block_kind"],"lesson_id": string,"options_en": (string)[] | null,"options_es": (string)[] | null,"position": number,"updated_at": string,"youtube_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_en"?: string | null,"alt_es"?: string | null,"body_en"?: string | null,"body_es"?: string | null,"correct_option"?: number | null,"created_at"?: string,"explanation_en"?: string | null,"explanation_es"?: string | null,"game_data"?: Json | null,"game_type"?: string | null,"id"?: string,"image_height"?: number | null,"image_path"?: string | null,"image_width"?: number | null,"kind": Database["public"]['Enums']["lesson_block_kind"],"lesson_id": string,"options_en"?: (string)[] | null,"options_es"?: (string)[] | null,"position": number,"updated_at"?: string,"youtube_id"?: string | null
                  }
                  Update: {
                    "alt_en"?: string | null,"alt_es"?: string | null,"body_en"?: string | null,"body_es"?: string | null,"correct_option"?: number | null,"created_at"?: string,"explanation_en"?: string | null,"explanation_es"?: string | null,"game_data"?: Json | null,"game_type"?: string | null,"id"?: string,"image_height"?: number | null,"image_path"?: string | null,"image_width"?: number | null,"kind"?: Database["public"]['Enums']["lesson_block_kind"],"lesson_id"?: string,"options_en"?: (string)[] | null,"options_es"?: (string)[] | null,"position"?: number,"updated_at"?: string,"youtube_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_blocks_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "access_level": Database["public"]['Enums']["access_level"],"category": Database["public"]['Enums']["learn_category"],"component_key": string | null,"cover_path": string | null,"created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["lesson_kind"],"language_code": string,"level_id": string | null,"published_at": string | null,"slug": string,"sort_order": number,"status": Database["public"]['Enums']["content_status"],"summary_en": string | null,"summary_es": string | null,"teaser_public": boolean,"title_en": string,"title_es": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_level"?: Database["public"]['Enums']["access_level"],"category": Database["public"]['Enums']["learn_category"],"component_key"?: string | null,"cover_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["lesson_kind"],"language_code"?: string,"level_id"?: string | null,"published_at"?: string | null,"slug": string,"sort_order": number,"status"?: Database["public"]['Enums']["content_status"],"summary_en"?: string | null,"summary_es"?: string | null,"teaser_public"?: boolean,"title_en": string,"title_es": string,"updated_at"?: string
                  }
                  Update: {
                    "access_level"?: Database["public"]['Enums']["access_level"],"category"?: Database["public"]['Enums']["learn_category"],"component_key"?: string | null,"cover_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["lesson_kind"],"language_code"?: string,"level_id"?: string | null,"published_at"?: string | null,"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"summary_en"?: string | null,"summary_es"?: string | null,"teaser_public"?: boolean,"title_en"?: string,"title_es"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_language_code_fkey"
      columns: ["language_code"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "lessons_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
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
                    "address": string | null,"birth_date": string | null,"city": string | null,"country": string | null,"created_at": string,"email": string | null,"full_name": string | null,"id": string,"phone": string | null,"preferred_locale": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"birth_date"?: string | null,"city"?: string | null,"country"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"phone"?: string | null,"preferred_locale"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"birth_date"?: string | null,"city"?: string | null,"country"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"phone"?: string | null,"preferred_locale"?: string,"status"?: string,"updated_at"?: string
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
                },"resources": {
                  Row: {
                    "access_level": Database["public"]['Enums']["access_level"],"audience": Database["public"]['Enums']["audience_segment"] | null,"created_at": string,"created_by": string | null,"description_en": string | null,"description_es": string | null,"external_url": string | null,"file_mime": string | null,"file_path": string | null,"file_size_bytes": number | null,"id": string,"kind": Database["public"]['Enums']["resource_kind"],"language_code": string,"level_id": string | null,"published_at": string | null,"sort_order": number,"status": Database["public"]['Enums']["content_status"],"teaser_public": boolean,"thumbnail_path": string | null,"title_en": string,"title_es": string,"title_lang": string | null,"updated_at": string,"youtube_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "access_level"?: Database["public"]['Enums']["access_level"],"audience"?: Database["public"]['Enums']["audience_segment"] | null,"created_at"?: string,"created_by"?: string | null,"description_en"?: string | null,"description_es"?: string | null,"external_url"?: string | null,"file_mime"?: string | null,"file_path"?: string | null,"file_size_bytes"?: number | null,"id"?: string,"kind": Database["public"]['Enums']["resource_kind"],"language_code"?: string,"level_id"?: string | null,"published_at"?: string | null,"sort_order": number,"status"?: Database["public"]['Enums']["content_status"],"teaser_public"?: boolean,"thumbnail_path"?: string | null,"title_en": string,"title_es": string,"title_lang"?: string | null,"updated_at"?: string,"youtube_id"?: string | null
                  }
                  Update: {
                    "access_level"?: Database["public"]['Enums']["access_level"],"audience"?: Database["public"]['Enums']["audience_segment"] | null,"created_at"?: string,"created_by"?: string | null,"description_en"?: string | null,"description_es"?: string | null,"external_url"?: string | null,"file_mime"?: string | null,"file_path"?: string | null,"file_size_bytes"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["resource_kind"],"language_code"?: string,"level_id"?: string | null,"published_at"?: string | null,"sort_order"?: number,"status"?: Database["public"]['Enums']["content_status"],"teaser_public"?: boolean,"thumbnail_path"?: string | null,"title_en"?: string,"title_es"?: string,"title_lang"?: string | null,"updated_at"?: string,"youtube_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "resources_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_language_code_fkey"
      columns: ["language_code"]
isOneToOne: false
      referencedRelation: "languages"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "resources_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    }
                  ]
                },"student_admin_notes": {
                  Row: {
                    "created_at": string,"id": string,"notes": string,"student_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"notes": string,"student_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"notes"?: string,"student_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_admin_notes_student_id_fkey"
      columns: ["student_id"]
isOneToOne: true
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_admin_notes_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"student_guardians": {
                  Row: {
                    "created_at": string,"guardian_id": string,"id": string,"is_primary": boolean,"relationship": string,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"guardian_id": string,"id"?: string,"is_primary"?: boolean,"relationship": string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"guardian_id"?: string,"id"?: string,"is_primary"?: boolean,"relationship"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_guardians_guardian_id_fkey"
      columns: ["guardian_id"]
isOneToOne: false
      referencedRelation: "guardians"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_guardians_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"student_private": {
                  Row: {
                    "birth_date": string | null,"birth_year": number | null,"created_at": string,"email": string | null,"gender": string | null,"id": string,"phone": string | null,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "birth_date"?: string | null,"birth_year"?: number | null,"created_at"?: string,"email"?: string | null,"gender"?: string | null,"id"?: string,"phone"?: string | null,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "birth_date"?: string | null,"birth_year"?: number | null,"created_at"?: string,"email"?: string | null,"gender"?: string | null,"id"?: string,"phone"?: string | null,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_private_student_id_fkey"
      columns: ["student_id"]
isOneToOne: true
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "audience": Database["public"]['Enums']["audience_segment"],"created_at": string,"created_by": string | null,"full_name": string,"id": string,"is_minor": boolean | null,"level_id": string | null,"preferred_locale": string,"profile_id": string | null,"status": Database["public"]['Enums']["student_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience": Database["public"]['Enums']["audience_segment"],"created_at"?: string,"created_by"?: string | null,"full_name": string,"id"?: string,"is_minor"?: never,"level_id"?: string | null,"preferred_locale"?: string,"profile_id"?: string | null,"status"?: Database["public"]['Enums']["student_status"],"updated_at"?: string
                  }
                  Update: {
                    "audience"?: Database["public"]['Enums']["audience_segment"],"created_at"?: string,"created_by"?: string | null,"full_name"?: string,"id"?: string,"is_minor"?: never,"level_id"?: string | null,"preferred_locale"?: string,"profile_id"?: string | null,"status"?: Database["public"]['Enums']["student_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "students_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_profiles": {
                  Row: {
                    "body_en": string,"body_es": string,"created_at": string,"created_by": string | null,"enrol_en": string | null,"enrol_es": string | null,"enrol_title_en": string | null,"enrol_title_es": string | null,"facts_en": (string)[],"facts_es": (string)[],"id": string,"intro_en": string,"intro_es": string,"meta_description_en": string,"meta_description_es": string,"name": string,"photo_alt_en": string,"photo_alt_es": string,"photo_path": string | null,"photo_position": string,"profile_id": string | null,"published_at": string | null,"role_en": string,"role_es": string,"show_approach": boolean,"slug": string,"sort_order": number,"specialty_en": string | null,"specialty_es": string | null,"status": Database["public"]['Enums']["content_status"],"tagline_en": string,"tagline_es": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_en": string,"body_es": string,"created_at"?: string,"created_by"?: string | null,"enrol_en"?: string | null,"enrol_es"?: string | null,"enrol_title_en"?: string | null,"enrol_title_es"?: string | null,"facts_en"?: (string)[],"facts_es"?: (string)[],"id"?: string,"intro_en": string,"intro_es": string,"meta_description_en": string,"meta_description_es": string,"name": string,"photo_alt_en": string,"photo_alt_es": string,"photo_path"?: string | null,"photo_position"?: string,"profile_id"?: string | null,"published_at"?: string | null,"role_en": string,"role_es": string,"show_approach"?: boolean,"slug": string,"sort_order": number,"specialty_en"?: string | null,"specialty_es"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"tagline_en": string,"tagline_es": string,"updated_at"?: string
                  }
                  Update: {
                    "body_en"?: string,"body_es"?: string,"created_at"?: string,"created_by"?: string | null,"enrol_en"?: string | null,"enrol_es"?: string | null,"enrol_title_en"?: string | null,"enrol_title_es"?: string | null,"facts_en"?: (string)[],"facts_es"?: (string)[],"id"?: string,"intro_en"?: string,"intro_es"?: string,"meta_description_en"?: string,"meta_description_es"?: string,"name"?: string,"photo_alt_en"?: string,"photo_alt_es"?: string,"photo_path"?: string | null,"photo_position"?: string,"profile_id"?: string | null,"published_at"?: string | null,"role_en"?: string,"role_es"?: string,"show_approach"?: boolean,"slug"?: string,"sort_order"?: number,"specialty_en"?: string | null,"specialty_es"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"tagline_en"?: string,"tagline_es"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_profiles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_profiles_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tests": {
                  Row: {
                    "access_level": Database["public"]['Enums']["access_level"],"audience": Database["public"]['Enums']["audience_segment"] | null,"created_at": string,"created_by": string | null,"description_en": string | null,"description_es": string | null,"grade_scale": number,"id": string,"in_resources": boolean,"level_id": string | null,"max_attempts": number | null,"pass_percent": number,"published_at": string | null,"questions_per_attempt": number | null,"shuffle_options": boolean,"shuffle_questions": boolean,"slug": string,"status": Database["public"]['Enums']["content_status"],"time_limit_minutes": number | null,"title_en": string,"title_es": string,"updated_at": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_level"?: Database["public"]['Enums']["access_level"],"audience"?: Database["public"]['Enums']["audience_segment"] | null,"created_at"?: string,"created_by"?: string | null,"description_en"?: string | null,"description_es"?: string | null,"grade_scale"?: number,"id"?: string,"in_resources"?: boolean,"level_id"?: string | null,"max_attempts"?: number | null,"pass_percent"?: number,"published_at"?: string | null,"questions_per_attempt"?: number | null,"shuffle_options"?: boolean,"shuffle_questions"?: boolean,"slug": string,"status"?: Database["public"]['Enums']["content_status"],"time_limit_minutes"?: number | null,"title_en": string,"title_es": string,"updated_at"?: string,"visibility"?: string
                  }
                  Update: {
                    "access_level"?: Database["public"]['Enums']["access_level"],"audience"?: Database["public"]['Enums']["audience_segment"] | null,"created_at"?: string,"created_by"?: string | null,"description_en"?: string | null,"description_es"?: string | null,"grade_scale"?: number,"id"?: string,"in_resources"?: boolean,"level_id"?: string | null,"max_attempts"?: number | null,"pass_percent"?: number,"published_at"?: string | null,"questions_per_attempt"?: number | null,"shuffle_options"?: boolean,"shuffle_questions"?: boolean,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"time_limit_minutes"?: number | null,"title_en"?: string,"title_es"?: string,"updated_at"?: string,"visibility"?: string
                  }
                  Relationships: [
    {
      foreignKeyName: "tests_level_id_fkey"
      columns: ["level_id"]
isOneToOne: false
      referencedRelation: "levels"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
  ]
                },"test_attempts": {
                  Row: {
                    "answers": Json | null,"grade": number | null,"id": string,"max_score": number | null,"passed": boolean | null,"percent": number | null,"question_ids": (string)[],"score": number | null,"started_at": string,"submitted_at": string | null,"test_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: Json | null,"grade"?: number | null,"id"?: string,"max_score"?: number | null,"passed"?: boolean | null,"percent"?: number | null,"question_ids": (string)[],"score"?: number | null,"started_at"?: string,"submitted_at"?: string | null,"test_id": string,"user_id"?: string
                  }
                  Update: {
                    "answers"?: Json | null,"grade"?: number | null,"id"?: string,"max_score"?: number | null,"passed"?: boolean | null,"percent"?: number | null,"question_ids"?: (string)[],"score"?: number | null,"started_at"?: string,"submitted_at"?: string | null,"test_id"?: string,"user_id"?: string
                  }
                  Relationships: [
    {
      foreignKeyName: "test_attempts_test_id_fkey"
      columns: ["test_id"]
isOneToOne: false
      referencedRelation: "tests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "test_attempts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
  ]
                },"test_questions": {
                  Row: {
                    "accepted_answers": (string)[] | null,"correct_bool": boolean | null,"correct_option": number | null,"created_at": string,"explanation_en": string | null,"explanation_es": string | null,"id": string,"kind": Database["public"]['Enums']["test_question_kind"],"options": (string)[] | null,"points": number,"position": number,"prompt_en": string,"prompt_es": string,"test_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_answers"?: (string)[] | null,"correct_bool"?: boolean | null,"correct_option"?: number | null,"created_at"?: string,"explanation_en"?: string | null,"explanation_es"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["test_question_kind"],"options"?: (string)[] | null,"points"?: number,"position": number,"prompt_en": string,"prompt_es": string,"test_id": string,"updated_at"?: string
                  }
                  Update: {
                    "accepted_answers"?: (string)[] | null,"correct_bool"?: boolean | null,"correct_option"?: number | null,"created_at"?: string,"explanation_en"?: string | null,"explanation_es"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["test_question_kind"],"options"?: (string)[] | null,"points"?: number,"position"?: number,"prompt_en"?: string,"prompt_es"?: string,"test_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
    {
      foreignKeyName: "test_questions_test_id_fkey"
      columns: ["test_id"]
isOneToOne: false
      referencedRelation: "tests"
      referencedColumns: ["id"]
    }
  ]
                },"test_shares": {
                  Row: {
                    "created_at": string,"test_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"test_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"test_id"?: string,"user_id"?: string
                  }
                  Relationships: [
    {
      foreignKeyName: "test_shares_test_id_fkey"
      columns: ["test_id"]
isOneToOne: false
      referencedRelation: "tests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "test_shares_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
"can_read_resource_object":
{ Args: { "p_name": string }; Returns: boolean
                           },
"can_view_student":
{ Args: { "p_student_id": string }; Returns: boolean
                           },
"content_tier":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["access_level"]
                           },
"create_student":
{ Args: { "p_payload": Json }; Returns: string
                           },
"current_guardian_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"current_student_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"enable_audit":
{ Args: { "p_table": unknown }; Returns: undefined
                           },
"get_published_lesson":
{ Args: { "p_slug": string }; Returns: Json
                           },
"guarded_student_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"has_current_consent":
{ Args: { "p_kind": Database["public"]['Enums']["consent_kind"],"p_student_id": string }; Returns: boolean
                           },
"has_enrolled_access":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"has_role":
{ Args: { "r": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"health_ping":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_active":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"list_published_lessons":
{ Args: Record<PropertyKey, never>; Returns: {
              "access_level": Database["public"]['Enums']["access_level"],"category": Database["public"]['Enums']["learn_category"],"component_key": string,"cover_path": string,"id": string,"kind": Database["public"]['Enums']["lesson_kind"],"level_code": string,"locked": boolean,"slug": string,"sort_order": number,"summary_en": string,"summary_es": string,"title_en": string,"title_es": string
            }[]
                           },
"list_published_resources":
{ Args: Record<PropertyKey, never>; Returns: {
              "access_level": Database["public"]['Enums']["access_level"],"audience": Database["public"]['Enums']["audience_segment"],"description_en": string,"description_es": string,"external_url": string,"has_file": boolean,"id": string,"kind": Database["public"]['Enums']["resource_kind"],"level_code": string,"locked": boolean,"sort_order": number,"thumbnail_path": string,"title_en": string,"title_es": string,"title_lang": string,"youtube_id": string
            }[]
                           },
"get_test_info":
{ Args: { "p_test_id": string }; Returns: Json
                           },
"list_available_tests":
{ Args: Record<PropertyKey, never>; Returns: {
              "attempts": number,"audience": Database["public"]['Enums']["audience_segment"],"best_grade": number,"best_percent": number,"description_en": string,"description_es": string,"grade_scale": number,"id": string,"in_resources": boolean,"level_code": string,"max_attempts": number,"passed": boolean,"pass_percent": number,"question_count": number,"slug": string,"time_limit_minutes": number,"title_en": string,"title_es": string,"visibility": string
            }[]
                           },
"list_my_test_results":
{ Args: Record<PropertyKey, never>; Returns: {
              "attempt_id": string,"grade": number,"grade_scale": number,"level_code": string,"passed": boolean,"percent": number,"submitted_at": string,"test_id": string,"title_en": string,"title_es": string
            }[]
                           },
"move_test_question":
{ Args: { "p_question_id": string,"p_direction": string }; Returns: undefined
                           },
"start_test":
{ Args: { "p_test_id": string }; Returns: Json
                           },
"submit_test":
{ Args: { "p_attempt_id": string,"p_answers": Json }; Returns: Json
                           },
"list_published_teachers":
{ Args: Record<PropertyKey, never>; Returns: {
              "body_en": string,"body_es": string,"enrol_en": string,"enrol_es": string,"enrol_title_en": string,"enrol_title_es": string,"facts_en": (string)[],"facts_es": (string)[],"intro_en": string,"intro_es": string,"meta_description_en": string,"meta_description_es": string,"name": string,"photo_alt_en": string,"photo_alt_es": string,"photo_path": string,"photo_position": string,"role_en": string,"role_es": string,"show_approach": boolean,"slug": string,"sort_order": number,"specialty_en": string,"specialty_es": string,"tagline_en": string,"tagline_es": string
            }[]
                           },
"move_lesson":
{ Args: { "p_direction": string,"p_lesson_id": string }; Returns: undefined
                           },
"move_lesson_block":
{ Args: { "p_block_id": string,"p_direction": string }; Returns: undefined
                           },
"move_resource":
{ Args: { "p_direction": string,"p_resource_id": string }; Returns: undefined
                           },
"move_teacher_profile":
{ Args: { "p_direction": string,"p_id": string }; Returns: undefined
                           },
"resource_file_path":
{ Args: { "p_resource_id": string }; Returns: string
                           },
"text_items_within":
{ Args: { "p_items": (string)[],"p_max": number,"p_min": number }; Returns: boolean
                           },
"user_has_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "access_level": "public"|"account"|"enrolled","app_role": "admin"|"teacher"|"student"|"guardian","audience_segment": "kids"|"adults"|"mature","consent_kind": "enrolment_terms"|"privacy"|"minor_data"|"recordings"|"photos","consent_method": "portal"|"paper"|"email"|"web_form","content_status": "draft"|"published","test_question_kind": "single"|"truefalse"|"fill","edition_status": "draft"|"open"|"closed"|"cancelled","learn_category": "foundations"|"kids"|"adults"|"stories"|"games","lesson_block_kind": "text"|"image"|"video"|"quiz"|"game","lesson_format": "individual"|"own_group"|"local_group","lesson_kind": "interactive"|"article","location_kind": "library"|"office"|"home"|"online","price_kind": "per_lesson"|"upfront"|"pack","resource_kind": "video"|"document"|"link"|"worksheet"|"vocabulary"|"recording"|"coursework","student_status": "active"|"inactive"
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
            "access_level": ["public", "account", "enrolled"],"app_role": ["admin", "teacher", "student", "guardian"],"audience_segment": ["kids", "adults", "mature"],"consent_kind": ["enrolment_terms", "privacy", "minor_data", "recordings", "photos"],"consent_method": ["portal", "paper", "email", "web_form"],"content_status": ["draft", "published"],"test_question_kind": ["single", "truefalse", "fill"],"edition_status": ["draft", "open", "closed", "cancelled"],"learn_category": ["foundations", "kids", "adults", "stories", "games"],"lesson_block_kind": ["text", "image", "video", "quiz", "game"],"lesson_format": ["individual", "own_group", "local_group"],"lesson_kind": ["interactive", "article"],"location_kind": ["library", "office", "home", "online"],"price_kind": ["per_lesson", "upfront", "pack"],"resource_kind": ["video", "document", "link", "worksheet", "vocabulary", "recording", "coursework"],"student_status": ["active", "inactive"]
          }
        }
} as const
