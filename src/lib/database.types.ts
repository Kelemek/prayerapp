export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      prayers: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string
          requester: string
          prayer_for: string
          email: string | null
          is_anonymous: boolean
          date_requested: string
          date_answered: string | null
          approval_status: string
          approved_by: string | null
          approved_at: string | null
          denial_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status: string
          requester: string
          prayer_for: string
          email?: string | null
          is_anonymous?: boolean
          date_requested?: string
          date_answered?: string | null
          approval_status?: string
          approved_by?: string | null
          approved_at?: string | null
          denial_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string
          requester?: string
          prayer_for?: string
          email?: string | null
          is_anonymous?: boolean
          date_requested?: string
          date_answered?: string | null
          approval_status?: string
          approved_by?: string | null
          approved_at?: string | null
          denial_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prayer_updates: {
        Row: {
          id: string
          prayer_id: string
          content: string
          author: string
          approval_status: string
          approved_by: string | null
          approved_at: string | null
          denial_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prayer_id: string
          content: string
          author: string
          approval_status?: string
          approved_by?: string | null
          approved_at?: string | null
          denial_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prayer_id?: string
          content?: string
          author?: string
          approval_status?: string
          approved_by?: string | null
          approved_at?: string | null
          denial_reason?: string | null
          created_at?: string
        }
      }
      deletion_requests: {
        Row: {
          id: string
          prayer_id: string
          reason: string | null
          requested_by: string
          approval_status: string
          reviewed_by: string | null
          reviewed_at: string | null
          denial_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          prayer_id: string
          reason?: string | null
          requested_by: string
          approval_status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          denial_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          prayer_id?: string
          reason?: string | null
          requested_by?: string
          approval_status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          denial_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      status_change_requests: {
        Row: {
          id: string
          prayer_id: string
          requested_status: string
          reason: string | null
          requested_by: string
          approval_status: string
          reviewed_by: string | null
          reviewed_at: string | null
          denial_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          prayer_id: string
          requested_status: string
          reason?: string | null
          requested_by: string
          approval_status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          denial_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          prayer_id?: string
          requested_status?: string
          reason?: string | null
          requested_by?: string
          approval_status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          denial_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          username: string
          password_hash: string
          email: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          password_hash: string
          email: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          password_hash?: string
          email?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}