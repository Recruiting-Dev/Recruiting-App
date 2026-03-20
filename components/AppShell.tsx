'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  type Candidate, type CandidateInsert,
  type Job, type JobInsert,
} from '@/lib/types';
import MainDashboard from '@/components/MainDashboard';
import JobsManager from '@/components/JobsManager';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActiveModule = 'home' | 'jobs';

// ── Component ─────────────────────────────────────────────────────────────────
//
// Single source of truth for the whole app.
// Both datasets are fetched in parallel on mount so every module transition
// is a synchronous React setState — zero network delay.

export default function AppShell() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('home');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  // ── Parallel prefetch ──────────────────────────────────────────────────────

  useEffect(() => {
    supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setCandidates(data as Candidate[]); });

    supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setJobs(data as Job[]); });
  }, []);

  // ── Candidate mutations ────────────────────────────────────────────────────

  const updateCandidate = useCallback(async (
    id: string,
    field: keyof CandidateInsert,
    value: string,
  ) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    const { error } = await supabase.from('candidates').update({ [field]: value }).eq('id', id);
    if (error) {
      const { data } = await supabase.from('candidates').select('*').eq('id', id).single();
      if (data) setCandidates((prev) => prev.map((c) => (c.id === id ? (data as Candidate) : c)));
      alert('Error saving: ' + error.message);
    }
  }, []);

  const addCandidate = useCallback(async (data: CandidateInsert) => {
    const { data: inserted, error } = await supabase
      .from('candidates')
      .insert([data])
      .select()
      .single();
    if (error) { alert('Error adding candidate: ' + error.message); return; }
    if (inserted) setCandidates((prev) => [inserted as Candidate, ...prev]);
  }, []);

  const deleteCandidate = useCallback(async (id: string) => {
    if (!window.confirm('Delete this candidate?')) return;
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) {
      const { data } = await supabase
        .from('candidates').select('*').order('created_at', { ascending: false });
      if (data) setCandidates(data as Candidate[]);
      alert('Error deleting: ' + error.message);
    }
  }, []);

  // ── Job mutations ──────────────────────────────────────────────────────────

  const updateJob = useCallback(async (id: string, field: string, value: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, [field]: value } : j)));
    const { error } = await supabase.from('jobs').update({ [field]: value }).eq('id', id);
    if (error) {
      const { data } = await supabase.from('jobs').select('*').eq('id', id).single();
      if (data) setJobs((prev) => prev.map((j) => (j.id === id ? (data as Job) : j)));
      alert('Error saving: ' + error.message);
    }
  }, []);

  const addJob = useCallback(async (payload: JobInsert) => {
    const { data: inserted, error } = await supabase
      .from('jobs')
      .insert([payload])
      .select()
      .single();
    if (error) { alert('Error adding row: ' + error.message); return; }
    if (inserted) setJobs((prev) => [inserted as Job, ...prev]);
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    if (!window.confirm('Delete this row?')) return;
    setJobs((prev) => prev.filter((j) => j.id !== id));
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) {
      const { data } = await supabase
        .from('jobs').select('*').order('created_at', { ascending: false });
      if (data) setJobs(data as Job[]);
      alert('Error deleting: ' + error.message);
    }
  }, []);

  // ── Derived: open job titles for the Role Name dropdown ───────────────────
  // Filters to type === 'open', deduplicates, sorts A–Z.
  // Automatically reacts when a job is moved to 'hired' or 'budgeted'.

  const openRoleOptions = useMemo(() =>
    [...new Set(
      jobs
        .filter((j) => j.type === 'open' && j.role_name?.trim())
        .map((j) => j.role_name as string),
    )].sort((a, b) => a.localeCompare(b)),
  [jobs]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (activeModule === 'jobs') {
    return (
      <JobsManager
        jobs={jobs}
        onUpdateJob={updateJob}
        onAddJob={addJob}
        onDeleteJob={deleteJob}
        onSwitchToHome={() => setActiveModule('home')}
      />
    );
  }

  return (
    <MainDashboard
      candidates={candidates}
      onUpdateCandidate={updateCandidate}
      onAddCandidate={addCandidate}
      onDeleteCandidate={deleteCandidate}
      onSwitchToJobs={() => setActiveModule('jobs')}
      roleOptions={openRoleOptions}
    />
  );
}
