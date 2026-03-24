'use client';
import { useState, useMemo, useCallback } from 'react';
import { JOB_COLUMNS, HIRED_JOB_COLUMNS, BUDGETED_JOB_COLUMNS, type Job, type JobInsert, type JobType, type UserPermissions } from '@/lib/types';
import GenericSpreadsheet from '@/components/GenericSpreadsheet';
import TableHint from '@/components/TableHint';

// ── Types ─────────────────────────────────────────────────────────────────────

type View = 'menu' | JobType;

const TITLE_MAP: Record<JobType, string> = {
  open:     'Open Jobs',
  hired:    'Hired',
  budgeted: 'Budgeted',
};

const TILES: { type: JobType; label: string; description: string }[] = [
  { type: 'open',     label: 'Open Jobs', description: 'Active open requisitions'     },
  { type: 'hired',    label: 'Hired',     description: 'Successfully filled positions' },
  { type: 'budgeted', label: 'Budgeted',  description: 'Approved headcount pipeline'   },
];

interface Props {
  jobs: Job[];
  onUpdateJob: (id: string, field: string, value: string) => Promise<void>;
  onAddJob: (payload: JobInsert) => Promise<void>;
  onDeleteJob: (id: string) => Promise<void>;
  onSwitchToHome: () => void;
  permissions: UserPermissions;
}

// ── Component ─────────────────────────────────────────────────────────────────
//
// Manages only UI state (which tab is active).
// All data and mutations live in AppShell and are passed as props.
// Tab switching is a synchronous setState — zero network delay.

export default function JobsManager({
  jobs,
  onUpdateJob,
  onAddJob,
  onDeleteJob,
  onSwitchToHome,
  permissions,
}: Props) {
  const readOnly = permissions.role !== 'admin';
  const [view, setView] = useState<View>('menu');

  // ── In-memory split — instant tab switching ────────────────────────────────

  const openJobs     = useMemo(() => jobs.filter((j) => j.type === 'open'),     [jobs]);
  const hiredJobs    = useMemo(() => jobs.filter((j) => j.type === 'hired'),    [jobs]);
  const budgetedJobs = useMemo(() => jobs.filter((j) => j.type === 'budgeted'), [jobs]);

  const jobsByType: Record<JobType, Job[]> = {
    open:     openJobs,
    hired:    hiredJobs,
    budgeted: budgetedJobs,
  };

  // ── Insert row adapter ─────────────────────────────────────────────────────
  // GenericSpreadsheet calls onInsertRow(data: Record<string, string>).
  // This adapter stamps the current view type and builds the full JobInsert
  // before handing off to AppShell's mutation handler.

  // activeColumns drives both the table header and the insert-row form.
  // Swapping it here is the only change needed — GenericSpreadsheet and
  // AppShell require no modifications.
  const activeColumns =
    view === 'hired'    ? HIRED_JOB_COLUMNS    :
    view === 'budgeted' ? BUDGETED_JOB_COLUMNS :
    JOB_COLUMNS;

  const handleInsertRow = useCallback(async (data: Record<string, string>) => {
    const payload: JobInsert = {
      type:             view as JobType,
      // Budgeted view has no Priority column — omit the field entirely.
      ...(view !== 'budgeted' && { priority: data.priority || null }),
      role_name:        data.role_name        || null,
      new_hire_name:    data.new_hire_name    || null,
      start_date:       data.start_date       || null,
      recruiting_owner: data.recruiting_owner || null,
      hiring_manager:   data.hiring_manager   || null,
      function:         (data.function        || null) as Job['function'],
      source:           (data.source          || null) as Job['source'],
      notes:            data.notes            || null,
    };
    await onAddJob(payload);
  }, [view, onAddJob]);

  // ── Menu view ──────────────────────────────────────────────────────────────

  if (view === 'menu') {
    return (
      <div className="relative min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
        <button
          onClick={onSwitchToHome}
          className="absolute top-6 left-6 text-slate-400 hover:text-slate-200 text-sm transition-colors"
        >
          ← Home
        </button>

        <h1 className="text-4xl font-bold text-slate-100 mb-2">Jobs</h1>
        <p className="text-slate-500 text-sm mb-8">Select a pipeline to continue</p>

        <div className="flex gap-6">
          {TILES.map(({ type, label, description }) => (
            <button
              key={type}
              onClick={() => setView(type)}
              className="w-56 h-40 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.2)] text-slate-100 transition-all duration-150 flex flex-col items-center justify-center gap-2"
            >
              <span className="font-semibold text-xl">{label}</span>
              <span className="text-slate-500 text-xs text-center px-4">{description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Dashboard view ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setView('menu')}
            className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            ← Jobs
          </button>
          <h1 className="text-2xl font-bold">{TITLE_MAP[view]}</h1>
        </header>

        {!readOnly && <TableHint />}
        <GenericSpreadsheet
          columns={activeColumns}
          rows={jobsByType[view] as (Job & Record<string, string | null | undefined>)[]}
          onSaveCell={onUpdateJob}
          onInsertRow={handleInsertRow}
          onDeleteRow={onDeleteJob}
          defaultSort={view === 'open' ? { col: 'priority', dir: 'asc' } : undefined}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
