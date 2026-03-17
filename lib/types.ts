export const STAGES = [
  'Round 1',
  'Round 2',
  'Round 3',
  'Assignment',
  'Final',
  'Offer',
  'Pending Start',
  'Offer Declined',
] as const;
export type StageValue = (typeof STAGES)[number];

export const STATUS_OPTIONS = ['Active', 'On Hold', 'Rejected', 'Hired', 'Offer Declined'] as const;
export type StatusValue = (typeof STATUS_OPTIONS)[number];

export const REQ_STATUS_OPTIONS = ['Open', 'Hired', 'Closed'] as const;
export type ReqStatusValue = (typeof REQ_STATUS_OPTIONS)[number];

export interface Candidate {
  id: string;
  name?: string | null;
  role?: string | null;
  category?: 'commercial' | 'non-commercial' | string | null;
  stage?: StageValue | null;
  stage_details?: string | null;
  status?: StatusValue | string | null;
  notes?: string | null;
  linkedin_url?: string | null;
  resume_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Shape used when inserting a new candidate (no server-generated fields). */
export type CandidateInsert = Omit<Candidate, 'id' | 'created_at' | 'updated_at'>;

export interface Req {
  id: string;
  job_id?: string | null;
  title?: string | null;
  department?: string | null;
  status?: ReqStatusValue | null;
  created_at?: string | null;
}

export function normalizeStatus(raw: string | null | undefined): string {
  const s = (raw ?? '').toString().trim().toLowerCase();
  if (['active', 'started', 'hold', 'on hold', 'offer'].includes(s)) return 'active';
  if (['hired'].includes(s)) return 'hired';
  if (['reject', 'rejected', 'to reject', 'to rejected'].includes(s)) return 'rejected';
  return 'other';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Hired':
      return 'bg-emerald-500/30 text-emerald-300';
    case 'Offer Declined':
      return 'bg-rose-900/40 text-rose-300';
    case 'Rejected':
      return 'bg-red-900/30 text-red-400';
    case 'On Hold':
      return 'bg-yellow-900/30 text-yellow-400';
    case 'Active':
    default:
      return 'bg-green-900/30 text-green-400';
  }
}
