export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users_profile: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string | null
          mobile: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users_profile']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users_profile']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          profile_type: ProfileType
          name: string
          relationship: string | null
          metadata: Json
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      documents: {
        Row: {
          id: string
          user_id: string
          profile_id: string | null
          document_name: string
          category: DocumentCategory
          sub_category: string | null
          issuer: string | null
          document_number: string | null
          issue_date: string | null
          expiry_date: string | null
          verification_status: VerificationStatus
          source: DocumentSource
          storage_path: string
          file_type: string
          file_size: number
          ocr_text: string | null
          tags: string[]
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      document_shares: {
        Row: {
          id: string
          user_id: string
          document_id: string
          recipient_name: string | null
          recipient_contact: string | null
          channel: ShareChannel
          purpose: string | null
          is_password_protected: boolean
          password_hash: string | null
          expiry_at: string | null
          access_count: number
          max_access_count: number | null
          is_watermarked: boolean
          allow_download: boolean
          signed_url: string | null
          status: ShareStatus
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['document_shares']['Row'], 'id' | 'created_at' | 'access_count'>
        Update: Partial<Database['public']['Tables']['document_shares']['Insert']>
      }
      correction_workflows: {
        Row: {
          id: string
          user_id: string
          document_id: string
          correction_type: string
          authority: string | null
          required_documents: Json
          process_steps: Json
          expected_timeline: string | null
          fee: string | null
          status: CorrectionStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['correction_workflows']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['correction_workflows']['Insert']>
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          document_id: string
          reminder_type: ReminderType
          reminder_date: string
          frequency: string | null
          notes: string | null
          status: ReminderStatus
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['reminders']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          document_id: string | null
          action: ActivityAction
          details: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_logs']['Row'], 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type ProfileType = 'self' | 'spouse' | 'child' | 'parent' | 'pet' | 'vehicle' | 'property' | 'other'
export type DocumentCategory = 'identity' | 'education' | 'family' | 'property' | 'vehicle' | 'medical' | 'pet' | 'finance' | 'legal' | 'insurance' | 'other'
export type VerificationStatus = 'verified' | 'self_uploaded' | 'ocr_extracted' | 'expired' | 'needs_correction' | 'mismatch_detected'
export type DocumentSource = 'upload' | 'scan' | 'camera' | 'import'
export type ShareChannel = 'email' | 'whatsapp' | 'sms' | 'link' | 'download'
export type ShareStatus = 'active' | 'expired' | 'revoked'
export type CorrectionStatus = 'not_started' | 'in_progress' | 'submitted' | 'waiting' | 'completed' | 'rejected'
export type ReminderType = 'expiry' | 'renewal' | 'follow_up' | 'submission_deadline' | 'appointment' | 'correction_pending'
export type ReminderStatus = 'active' | 'dismissed' | 'completed'
export type ActivityAction = 'uploaded' | 'viewed' | 'edited' | 'shared' | 'downloaded' | 'ocr_processed' | 'verification_changed' | 'correction_started' | 'reminder_created' | 'share_revoked' | 'deleted'

export type UserProfile = Database['public']['Tables']['users_profile']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentShare = Database['public']['Tables']['document_shares']['Row']
export type CorrectionWorkflow = Database['public']['Tables']['correction_workflows']['Row']
export type Reminder = Database['public']['Tables']['reminders']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
