'use client';
import { useState, useMemo } from 'react';
import { type Candidate, type CandidateInsert, type UserPermissions } from '@/lib/types';
import LandingScreen from '@/components/LandingScreen';
import CandidateSheet from '@/components/CandidateSheet';

// ── Types ─────────────────────────────────────────────────────────────────────

type View = 'landing' | 'commercial' | 'non-commercial';

interface Props {
  commercialCandidates: Candidate[];
  nonCommercialCandidates: Candidate[];
  onUpdateCandidate: (id: string, field: keyof CandidateInsert, value: string) => Promise<void>;
  onAddCandidate: (data: CandidateInsert) => Promise<void>;
  onDeleteCandidate: (id: string) => Promise<void>;
  onSwitchToJobs: () => void;
  commercialRoleOptions: string[];
  nonCommercialRoleOptions: string[];
  permissions: UserPermissions;
}

// ── Component ─────────────────────────────────────────────────────────────────
//
// Manages only UI state (which view is active).
// All data, permission filtering, and job-function-based category splits live
// in AppShell and arrive here as ready-to-render arrays.

export default function MainDashboard({
  commercialCandidates,
  nonCommercialCandidates,
  onUpdateCandidate,
  onAddCandidate,
  onDeleteCandidate,
  onSwitchToJobs,
  commercialRoleOptions,
  nonCommercialRoleOptions,
  permissions,
}: Props) {
  const [view, setView] = useState<View>('landing');
  const [commercialRoleFilter, setCommercialRoleFilter] = useState<string>('');
  const [nonCommercialRoleFilter, setNonCommercialRoleFilter] = useState<string>('');

  // ── Visible rows after applying role filter dropdown ───────────────────────

  const visibleCommercialCandidates = useMemo(() => {
    if (!commercialRoleFilter) return commercialCandidates;
    return commercialCandidates.filter((c) => c.role === commercialRoleFilter);
  }, [commercialCandidates, commercialRoleFilter]);

  const visibleNonCommercialCandidates = useMemo(() => {
    if (!nonCommercialRoleFilter) return nonCommercialCandidates;
    return nonCommercialCandidates.filter((c) => c.role === nonCommercialRoleFilter);
  }, [nonCommercialCandidates, nonCommercialRoleFilter]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToLanding = () => {
    setView('landing');
    setCommercialRoleFilter('');
    setNonCommercialRoleFilter('');
  };

  const handleCategorySelect = (category: 'commercial' | 'non-commercial') => {
    // global_commercial cannot navigate to non-commercial
    if (category === 'non-commercial' && permissions.role === 'global_commercial') return;
    setView(category);
  };

  // ── Landing ────────────────────────────────────────────────────────────────

  if (view === 'landing') {
    return (
      <LandingScreen
        onSelect={handleCategorySelect}
        onJobsClick={onSwitchToJobs}
        permissions={permissions}
      />
    );
  }

  // ── Manager with no roles assigned ─────────────────────────────────────────

  if (permissions.role === 'manager' && permissions.allowedRoleNames.length === 0) {
    const label = view === 'commercial' ? 'Commercial' : 'Non-Commercial';
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex items-center gap-4 mb-8">
            <button onClick={goToLanding} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
              ← Home
            </button>
            <h1 className="text-2xl font-bold">{label}</h1>
          </header>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-slate-500 text-sm">No roles assigned. Please contact your administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Pipeline views ─────────────────────────────────────────────────────────

  const isAdmin = permissions.role === 'admin';

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">

        {/* ── Commercial ── */}
        {view === 'commercial' && (
          <>
            <header className="flex items-center gap-4 mb-8">
              <button
                onClick={goToLanding}
                className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
              >
                ← Home
              </button>
              <h1 className="text-2xl font-bold">Commercial</h1>

              {/* Role filter — admin and global_commercial only */}
              {permissions.role !== 'manager' && commercialRoleOptions.length > 0 && (
                <div className="ml-auto">
                  <select
                    value={commercialRoleFilter}
                    onChange={(e) => setCommercialRoleFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Roles</option>
                    {commercialRoleOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}
            </header>
            <CandidateSheet
              candidates={visibleCommercialCandidates}
              onSaveCell={onUpdateCandidate}
              onDelete={onDeleteCandidate}
              onInsertRow={(data) => onAddCandidate({ ...data, category: 'commercial' })}
              roleOptions={commercialRoleOptions}
            />
          </>
        )}

        {/* ── Non-Commercial ── */}
        {view === 'non-commercial' && (
          <>
            <header className="flex items-center gap-4 mb-8">
              <button
                onClick={goToLanding}
                className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
              >
                ← Home
              </button>
              <h1 className="text-2xl font-bold">Non-Commercial</h1>

              {/* Role filter — admin only */}
              {isAdmin && nonCommercialRoleOptions.length > 0 && (
                <div className="ml-auto">
                  <select
                    value={nonCommercialRoleFilter}
                    onChange={(e) => setNonCommercialRoleFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Roles</option>
                    {nonCommercialRoleOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}
            </header>
            <CandidateSheet
              candidates={visibleNonCommercialCandidates}
              onSaveCell={onUpdateCandidate}
              onDelete={onDeleteCandidate}
              onInsertRow={(data) => onAddCandidate({ ...data, category: 'non-commercial' })}
              roleOptions={nonCommercialRoleOptions}
            />
          </>
        )}

      </div>
    </div>
  );
}
