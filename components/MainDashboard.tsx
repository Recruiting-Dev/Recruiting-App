'use client';
import { useState, useMemo } from 'react';
import { type Candidate, type CandidateInsert, type UserPermissions } from '@/lib/types';
import LandingScreen from '@/components/LandingScreen';
import CandidateSheet from '@/components/CandidateSheet';
import NonCommercialHub from '@/components/NonCommercialHub';

// ── Types ─────────────────────────────────────────────────────────────────────

type View = 'landing' | 'commercial' | 'non-commercial';

interface Props {
  candidates: Candidate[];
  onUpdateCandidate: (id: string, field: keyof CandidateInsert, value: string) => Promise<void>;
  onAddCandidate: (data: CandidateInsert) => Promise<void>;
  onDeleteCandidate: (id: string) => Promise<void>;
  onSwitchToJobs: () => void;
  roleOptions: string[];
  permissions: UserPermissions;
}

// ── Component ─────────────────────────────────────────────────────────────────
//
// Manages only UI state (which view is active, which role is selected).
// All data and mutations live in AppShell and are passed as props.

export default function MainDashboard({
  candidates,
  onUpdateCandidate,
  onAddCandidate,
  onDeleteCandidate,
  onSwitchToJobs,
  roleOptions,
  permissions,
}: Props) {
  const [view, setView] = useState<View>('landing');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('');

  const commercialCandidates = useMemo(
    () => candidates.filter((c) => (c.category ?? '').toLowerCase() === 'commercial'),
    [candidates],
  );

  const nonCommercialCandidates = useMemo(
    () => candidates.filter((c) => (c.category ?? '').toLowerCase() === 'non-commercial'),
    [candidates],
  );

  // Further filter commercial candidates by role when a filter is selected
  const visibleCommercialCandidates = useMemo(() => {
    if (!roleFilter) return commercialCandidates;
    return commercialCandidates.filter((c) => c.role === roleFilter);
  }, [commercialCandidates, roleFilter]);

  const goToLanding = () => { setView('landing'); setSelectedRole(null); setRoleFilter(''); };

  const handleCategorySelect = (category: 'commercial' | 'non-commercial') => {
    // Only admin can navigate to non-commercial
    if (category === 'non-commercial' && permissions.role !== 'admin') return;
    setView(category === 'commercial' ? 'commercial' : 'non-commercial');
    setSelectedRole(null);
    setRoleFilter('');
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

  // ── Pipeline views ─────────────────────────────────────────────────────────

  // Manager with no assigned roles: show empty state
  if (view === 'commercial' && permissions.role === 'manager' && permissions.allowedRoleNames.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex items-center gap-4 mb-8">
            <button onClick={goToLanding} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
              ← Home
            </button>
            <h1 className="text-2xl font-bold">Commercial</h1>
          </header>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-slate-500 text-sm">No roles assigned. Please contact your administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">

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

              {/* Role filter — visible to admin and global_commercial only */}
              {permissions.role !== 'manager' && roleOptions.length > 0 && (
                <div className="ml-auto">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Roles</option>
                    {roleOptions.map((r) => (
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
              roleOptions={roleOptions}
            />
          </>
        )}

        {view === 'non-commercial' && permissions.role === 'admin' && (
          <>
            <header className="flex items-center gap-4 mb-8">
              <button
                onClick={goToLanding}
                className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
              >
                ← Home
              </button>
              <h1 className="text-2xl font-bold">Non-Commercial</h1>
            </header>
            <NonCommercialHub
              candidates={nonCommercialCandidates}
              selectedRole={selectedRole}
              onSelectRole={setSelectedRole}
              onSaveCell={onUpdateCandidate}
              onDelete={onDeleteCandidate}
              onInsertRow={(data) => onAddCandidate({ ...data, category: 'non-commercial' })}
              onGoHome={goToLanding}
              roleOptions={roleOptions}
            />
          </>
        )}

      </div>
    </div>
  );
}
