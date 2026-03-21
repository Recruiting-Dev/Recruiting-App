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

// ── Generic spreadsheet ───────────────────────────────────────────────────────

export interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: readonly string[];
  /** When true, clicking the column header toggles numeric ascending/descending sort. */
  sortable?: boolean;
  /**
   * For select columns: value to display and pre-select when the stored value is null/empty.
   * Prevents showing "—" for rows that were inserted before a default was set.
   */
  defaultValue?: string;
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export const JOB_TYPES = ['open', 'hired', 'budgeted'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const SOURCE_OPTIONS = [
  'Sourced by Tony',
  'Sourced by Andrea',
  'Referral',
  'Applied to Job Ad',
] as const;
export type SourceValue = (typeof SOURCE_OPTIONS)[number];

export interface Job {
  id: string;
  type: JobType;
  priority?: string | null;
  role_name?: string | null;
  new_hire_name?: string | null;
  start_date?: string | null;
  recruiting_owner?: string | null;
  hiring_manager?: string | null;
  function?: string | null;
  source?: SourceValue | string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type JobInsert = Omit<Job, 'id' | 'created_at' | 'updated_at'>;

/** Column layout for Open and Budgeted dashboards. */
export const FUNCTION_OPTIONS = ['Commercial', 'Non-Commercial'] as const;

export const JOB_COLUMNS: ColumnConfig[] = [
  { key: 'priority',         label: 'Priority',          type: 'text', sortable: true },
  { key: 'role_name',        label: 'Role Name',         type: 'text' },
  { key: 'start_date',       label: 'Start Date',        type: 'text' },
  { key: 'recruiting_owner', label: 'Recruiting Owner',  type: 'text' },
  { key: 'hiring_manager',   label: 'Hiring Manager',    type: 'text' },
  { key: 'function',         label: 'Function',          type: 'select', options: FUNCTION_OPTIONS, defaultValue: 'Commercial' },
  { key: 'notes',            label: 'Notes',             type: 'text' },
];

/** Column layout for the Hired dashboard.
 *  - No Priority column.
 *  - New Hire Name immediately after Role Name.
 *  - Source dropdown before Notes.
 */
export const HIRED_JOB_COLUMNS: ColumnConfig[] = [
  { key: 'role_name',        label: 'Role Name',         type: 'text' },
  { key: 'new_hire_name',    label: 'New Hire Name',     type: 'text' },
  { key: 'start_date',       label: 'Start Date',        type: 'text' },
  { key: 'recruiting_owner', label: 'Recruiting Owner',  type: 'text' },
  { key: 'hiring_manager',   label: 'Hiring Manager',    type: 'text' },
  { key: 'function',         label: 'Function',          type: 'select', options: FUNCTION_OPTIONS, defaultValue: 'Commercial' },
  { key: 'source',           label: 'Source',            type: 'select', options: SOURCE_OPTIONS },
  { key: 'notes',            label: 'Notes',             type: 'text' },
];

// ── Permissions ──────────────────────────────────────────────────────────────

/** Three distinct access tiers. */
export type UserRole = 'admin' | 'global_commercial' | 'manager';

export interface UserPermissions {
  /** True while the profiles/user_roles queries are in-flight. */
  loading: boolean;
  role: UserRole;
  /**
   * Job IDs this user is explicitly assigned to (managers only).
   * Admins and global_commercial users ignore this field.
   */
  allowedJobIds: string[];
  /**
   * Role name strings derived from allowedJobIds + the jobs array.
   * Used to filter candidate rows for managers.
   */
  allowedRoleNames: string[];
}

// ── Utilities ─────────────────────────────────────────────────────────────────

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
