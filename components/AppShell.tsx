'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import {
  type Candidate, type CandidateInsert,
  type Job, type JobInsert,
  type UserPermissions, type UserRole,
} from '@/lib/types';
import MainDashboard from '@/components/MainDashboard';
import JobsManager from '@/components/JobsManager';

type ActiveModule = 'home' | 'jobs';

// ── Component ─────────────────────────────────────────────────────────────────
//
// Single source of truth for the whole app.
// Fetches data + permissions in parallel on mount, then pre-filters all
// datasets before they reach child components.

export default function AppShell() {
  const { user } = useUser();
  const [activeModule, setActiveModule] = useState<ActiveModule>('home');

  // ── Raw data ────────────────────────────────────────────────────────────────

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  // ── Permission state ────────────────────────────────────────────────────────

  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('manager');
  const [allowedJobIds, setAllowedJobIds] = useState<string[]>([]);

  // ── Fetch data (runs once on mount) ────────────────────────────────────────

  useEffect(() => {
    supabase
      .from('candidates').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setCandidates(data as Candidate[]); });

    supabase
      .from('jobs').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setJobs(data as Job[]); });
  }, []);

  // ── Fetch permissions (runs once Clerk user is available) ──────────────────

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from('profiles').select('user_role').eq('user_id', user.id).single(),
      supabase.from('user_roles').select('job_id').eq('user_id', user.id),
    ]).then(([profileRes, rolesRes]) => {
      setUserRole((profileRes.data?.user_role as UserRole) ?? 'manager');
      setAllowedJobIds(
        (rolesRes.data ?? []).map((r: { job_id: string }) => r.job_id)
      );
      setPermissionsLoading(false);
    });
  }, [user?.id]);

  // ── Derived: role names allowed for manager ─────────────────────────────────
  // null = no restriction (admin / global_commercial)

  const allowedRoleNames = useMemo(() => {
    if (userRole !== 'manager') return null;
    return jobs
      .filter((j) => allowedJobIds.includes(j.id))
      .map((j) => j.role_name)
      .filter((r): r is string => Boolean(r));
  }, [userRole, allowedJobIds, jobs]);

  // ── Pre-filter candidates based on access level ─────────────────────────────

  const filteredCandidates = useMemo(() => {
    if (permissionsLoading) return [];
    if (userRole === 'admin') return candidates;
    if (userRole === 'global_commercial')
      return candidates.filter((c) => (c.category ?? '').toLowerCase() === 'commercial');
    // manager
    if (!allowedRoleNames || allowedRoleNames.length === 0) return [];
    return candidates.filter((c) => c.role && allowedRoleNames.includes(c.role));
  }, [candidates, permissionsLoading, userRole, allowedRoleNames]);

  // ── Pre-filter jobs based on access level ───────────────────────────────────

  const filteredJobs = useMemo(() => {
    if (permissionsLoading) return [];
    if (userRole === 'admin' || userRole === 'global_commercial') return jobs;
    // manager: only their explicitly assigned jobs
    return jobs.filter((j) => allowedJobIds.includes(j.id));
  }, [jobs, permissionsLoading, userRole, allowedJobIds]);

  // ── Open role options for candidate Role-Name dropdown ──────────────────────

  const openRoleOptions = useMemo(() =>
    [...new Set(
      filteredJobs
        .filter((j) => j.type === 'open' && j.role_name?.trim())
        .map((j) => j.role_name as string),
    )].sort((a, b) => a.localeCompare(b)),
  [filteredJobs]);

  // ── Assembled permissions object (passed to child UIs) ─────────────────────

  const permissions: UserPermissions = {
    loading: permissionsLoading,
    role: userRole,
    allowedJobIds,
    allowedRoleNames: allowedRoleNames ?? [],
  };

  // ── Candidate mutations ─────────────────────────────────────────────────────

  const updateCandidate = useCallback(async (
    id: string, field: keyof CandidateInsert, value: string,
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
      .from('candidates').insert([data]).select().single();
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

  // ── Job mutations ───────────────────────────────────────────────────────────

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
      .from('jobs').insert([payload]).select().single();
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

  // ── Loading screen ──────────────────────────────────────────────────────────
  // Hold render until permissions are resolved to avoid flashing
  // data the user shouldn't see.

  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-slate-600 text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (activeModule === 'jobs') {
    return (
      <JobsManager
        jobs={filteredJobs}
        onUpdateJob={updateJob}
        onAddJob={addJob}
        onDeleteJob={deleteJob}
        onSwitchToHome={() => setActiveModule('home')}
      />
    );
  }

  return (
    <MainDashboard
      candidates={filteredCandidates}
      onUpdateCandidate={updateCandidate}
      onAddCandidate={addCandidate}
      onDeleteCandidate={deleteCandidate}
      onSwitchToJobs={() => setActiveModule('jobs')}
      roleOptions={openRoleOptions}
      permissions={permissions}
    />
  );
}
