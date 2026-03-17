'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { type Candidate, type CandidateInsert } from '@/lib/types';
import LandingScreen from '@/components/LandingScreen';
import CandidateSheet from '@/components/CandidateSheet';
import NonCommercialHub from '@/components/NonCommercialHub';
type View = 'landing' | 'commercial' | 'non-commercial';

export default function MainDashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [view, setView] = useState<View>('landing');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchCandidates = async () => {
    const { data } = await supabase.from('candidates').select('*').order('created_at', { ascending: false });
    if (data) setCandidates(data as Candidate[]);
  };

  useEffect(() => { fetchCandidates(); }, []);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateCandidate = async (id: string, field: keyof CandidateInsert, value: string) => {
    const prev = candidates;
    setCandidates((cs) => cs.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    const { error } = await supabase.from('candidates').update({ [field]: value }).eq('id', id);
    if (error) { setCandidates(prev); alert('Error saving: ' + error.message); }
  };

  const addCandidate = async (data: CandidateInsert) => {
    const { error } = await supabase.from('candidates').insert([data]);
    if (error) { alert('Error adding candidate: ' + error.message); return; }
    await fetchCandidates();
  };

  const deleteCandidate = async (id: string) => {
    if (!window.confirm('Delete this candidate?')) return;
    const prev = candidates;
    setCandidates((cs) => cs.filter((c) => c.id !== id));
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) { setCandidates(prev); alert('Error deleting: ' + error.message); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const commercialCandidates = useMemo(
    () => candidates.filter((c) => (c.category ?? '').toLowerCase() === 'commercial'),
    [candidates],
  );

  const nonCommercialCandidates = useMemo(
    () => candidates.filter((c) => (c.category ?? '').toLowerCase() === 'non-commercial'),
    [candidates],
  );

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToLanding = () => { setView('landing'); setSelectedRole(null); };

  const handleCategorySelect = (category: 'commercial' | 'non-commercial') => {
    setView(category === 'commercial' ? 'commercial' : 'non-commercial');
    setSelectedRole(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (view === 'landing') {
    return <LandingScreen onSelect={handleCategorySelect} />;
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
            </header>
            <CandidateSheet
              candidates={commercialCandidates}
              onSaveCell={updateCandidate}
              onDelete={deleteCandidate}
              onInsertRow={(data) => addCandidate({ ...data, category: 'commercial' })}
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
              onSaveCell={updateCandidate}
              onDelete={deleteCandidate}
              onInsertRow={(data) => addCandidate({ ...data, category: 'non-commercial' })}
              onGoHome={goToLanding}
            />
          </>
        )}

      </div>
    </div>
  );
}
