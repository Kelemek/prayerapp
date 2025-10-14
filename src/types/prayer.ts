export interface PrayerRequest {
  id: string;
  title: string;
  description: string;
  status: PrayerStatus;
  requester: string;
  prayer_for: string;
  email?: string | null;
  is_anonymous?: boolean;
  date_requested: string;
  date_answered?: string | null;
  created_at: string;
  updated_at: string;
  updates?: PrayerUpdate[];
  approval_status?: 'pending' | 'approved' | 'denied';
  denial_reason?: string | null;
}

export interface PrayerUpdate {
  id: string;
  prayer_id: string;
  content: string;
  author: string;
  created_at: string;
  approval_status?: 'pending' | 'approved' | 'denied';
  denial_reason?: string | null;
}

export interface DeletionRequest {
  id: string;
  prayer_id: string;
  reason?: string | null;
  requested_by: string;
  approval_status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  denial_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusChangeRequest {
  id: string;
  prayer_id: string;
  requested_status: PrayerStatus;
  reason?: string | null;
  requested_by: string;
  approval_status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  denial_reason?: string | null;
  created_at: string;
  updated_at: string;
}



export const PrayerStatus = {
  ACTIVE: 'active',
  ANSWERED: 'answered',
  ONGOING: 'ongoing',
  CLOSED: 'closed'
} as const;

export type PrayerStatus = typeof PrayerStatus[keyof typeof PrayerStatus];

export interface PrayerFilters {
  status?: PrayerStatus;
  searchTerm?: string;
}