// These types define the shape of the database tables with snake_case properties.
// They are used to provide strong typing for the Supabase client.
// The application itself will use camelCase types defined in `types.ts`.
// Mapping functions in services/coreService.ts will convert between the two formats.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// This is the structure that the Supabase client will be typed against.
export type Database = {
  public: {
    Tables: {
      cores: {
        Row: {
          id: string
          user_id: string
          name: string
          location: Json
          water_depth: number
          project: string
          folder_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          user_id: string
          name: string
          location: Json
          water_depth: number
          project: string
          folder_id?: string | null
        }
        Update: {
          name?: string
          location?: Json
          water_depth?: number
          project?: string
          folder_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cores_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sections: {
        Row: {
          id: string
          core_id: string
          name: string
          section_depth: number
          sample_interval: number | null
          recovery_date: string
          collection_time: string | null
          epoch: string
          geological_period: "Glacial" | "Interglacial" | "Indeterminate"
          age_range: string
          data_points: Json | null
          microfossil_records: Json | null
          lab_analysis: Json | null
          summary: string | null
          section_image: string
          collector: string | null
          lithology: string | null
          munsell_color: string | null
          grain_size: string | null
          tephra_layers: string | null
          paleomagnetic_reversals: string | null
          created_at: string
        }
        Insert: {
          core_id: string
          name: string
          section_depth: number
          sample_interval?: number | null
          recovery_date: string
          collection_time?: string | null
          epoch: string
          geological_period: "Glacial" | "Interglacial" | "Indeterminate"
          age_range: string
          data_points?: Json | null
          microfossil_records?: Json | null
          lab_analysis?: Json | null
          summary?: string | null
          section_image: string
          collector?: string | null
          lithology?: string | null
          munsell_color?: string | null
          grain_size?: string | null
          tephra_layers?: string | null
          paleomagnetic_reversals?: string | null
        }
        Update: {
          name?: string
          section_depth?: number
          sample_interval?: number | null
          recovery_date?: string
          collection_time?: string | null
          epoch?: string
          geological_period?: "Glacial" | "Interglacial" | "Indeterminate"
          age_range?: string
          data_points?: Json | null
          microfossil_records?: Json | null
          lab_analysis?: Json | null
          summary?: string | null
          section_image?: string
          collector?: string | null
          lithology?: string | null
          munsell_color?: string | null
          grain_size?: string | null
          tephra_layers?: string | null
          paleomagnetic_reversals?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_core_id_fkey"
            columns: ["core_id"]
            isOneToOne: false
            referencedRelation: "cores"
            referencedColumns: ["id"]
          }
        ]
      }
      microfossils: {
        Row: {
          id: string
          taxonomy: Json
          description: string | null
          stratigraphic_range: string | null
          ecology: Json
          image_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          taxonomy: Json
          description?: string | null
          stratigraphic_range?: string | null
          ecology: Json
          image_url?: string | null
        }
        Update: {
          taxonomy?: Json
          description?: string | null
          stratigraphic_range?: string | null
          ecology?: Json
          image_url?: string | null
        }
        Relationships: []
      }
      folders: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          user_id: string
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      publications: {
        Row: {
          id: string
          user_id: string
          doi: string
          title: string
          authors: string
          journal: string
          year: number
          abstract: string | null
          link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          doi: string
          title: string
          authors: string
          journal: string
          year: number
          abstract?: string | null
          link?: string | null
        }
        Update: {
          doi?: string
          title?: string
          authors?: string
          journal?: string
          year?: number
          abstract?: string | null
          link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      core_publications: {
        Row: {
          core_id: string
          publication_id: string
        }
        Insert: {
          core_id: string
          publication_id: string
        }
        Update: {}
        Relationships: [
          {
            foreignKeyName: "core_publications_core_id_fkey"
            columns: ["core_id"]
            isOneToOne: false
            referencedRelation: "cores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "core_publications_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}