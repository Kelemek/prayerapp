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
          email: string
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
          email: string
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
          email?: string
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
          author_email: string
          is_anonymous: boolean
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
          author_email: string
          is_anonymous?: boolean
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
          author_email?: string
          is_anonymous?: boolean
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
          requested_email: string
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
          requested_email: string
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
          requested_email?: string
          approval_status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          denial_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      update_deletion_requests: {
        Row: {
          id: string
          update_id: string
          reason: string | null
          requested_by: string
          requested_email: string | null
          approval_status: string
          reviewed_by: string | null
          reviewed_at: string | null
          denial_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          update_id: string
          reason?: string | null
          requested_by: string
          requested_email?: string | null
          approval_status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          denial_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          update_id?: string
          reason?: string | null
          requested_by?: string
          requested_email?: string | null
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
          requested_email: string | null
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
          requested_email?: string | null
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
          requested_email?: string | null
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
      user_preferences: {
        Row: {
          id: string
          email: string
          name: string | null
          receive_new_prayer_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          receive_new_prayer_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          receive_new_prayer_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      pending_preference_changes: {
        Row: {
          id: string
          name: string
          email: string
          receive_new_prayer_notifications: boolean
          approval_status: string
          reviewed_by: string | null
          reviewed_at: string | null
          denial_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          receive_new_prayer_notifications: boolean
          approval_status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          denial_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          receive_new_prayer_notifications?: boolean
          approval_status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          denial_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_subscribers: {
        Row: {
          id: string
          name: string
          email: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      admin_settings: {
        Row: {
          id: number
          require_email_verification: boolean
          verification_code_length: number
          verification_code_expiry_minutes: number
          enable_reminders: boolean
          reminder_interval_days: number
          enable_auto_archive: boolean
          days_before_archive: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          require_email_verification?: boolean
          verification_code_length?: number
          verification_code_expiry_minutes?: number
          enable_reminders?: boolean
          reminder_interval_days?: number
          enable_auto_archive?: boolean
          days_before_archive?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          require_email_verification?: boolean
          verification_code_length?: number
          verification_code_expiry_minutes?: number
          enable_reminders?: boolean
          reminder_interval_days?: number
          enable_auto_archive?: boolean
          days_before_archive?: number
          created_at?: string
          updated_at?: string
        }
      }
      verification_codes: {
        Row: {
          id: string
          email: string
          code: string
          action_type: string
          action_data: Json
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          code: string
          action_type: string
          action_data: Json
          expires_at: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          code?: string
          action_type?: string
          action_data?: Json
          expires_at?: string
          used_at?: string | null
          created_at?: string
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