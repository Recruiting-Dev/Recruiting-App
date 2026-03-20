'use client';
import { useState, useMemo } from 'react';
import { type Candidate, type CandidateInsert } from '@/lib/types';
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
}: Props) {
  const [view, setView] = useState<View>('landing');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const commercialCandidates = useMemo(
    () => candidates.filter((c) => (c.category ?? '').toLowerCase() === 'commercial'),
    [candidates],
  );

  const nonCommercialCandidates = useMemo(
    () => candidates.filter((c) => (c.category ?? '').toLowerCase() === 'non-commercial'),
    [candidates],
  );

  const goToLanding = () => { setView('landing'); setSelectedRole(null); };

  const handleCategorySelect = (category: 'commercial' | 'non-commercial') => {
    setView(category === 'commercial' ? 'commercial' : 'non-commercial');
    setSelectedRole(null);
  };

  // ── Landing ────────────────────────────────────────────────────────────────

  if (view === 'landing') {
    return (
      <LandingScreen
        onSelect={handleCategorySelect}
        onJobsClick={onSwitchToJobs}
      />
    );
  }

  // ── Pipeline views ─────────────────────────────────────────────────────────

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
            </header>
            <CandidateSheet
              candidates={commercialCandidates}
              onSaveCell={onUpdateCandidate}
              onDelete={onDeleteCandidate}
              onInsertRow={(data) => onAddCandidate({ ...data, category: 'commercial' })}
              roleOptions={roleOptions}
            />
          </>
        )}

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
