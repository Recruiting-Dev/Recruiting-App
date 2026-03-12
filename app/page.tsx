/* eslint-disable */
// @ts-nocheck
'use client';
import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Papa, { ParseResult } from 'papaparse';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const STAGES = ['Round 1', 'Round 2', 'Round 3', 'Assignment', 'Final', 'Offer', 'Pending Start', 'Offer Declined'] as const;
type StageValue = (typeof STAGES)[number];

const STATUS_OPTIONS = ['Active', 'On Hold', 'Rejected', 'Hired', 'Offer Declined'] as const;
type StatusValue = (typeof STATUS_OPTIONS)[number];

const REQ_STATUS_OPTIONS = ['Open', 'Hired', 'Closed'] as const;
type ReqStatusValue = (typeof REQ_STATUS_OPTIONS)[number];

type CandidateCategory = 'commercial' | 'non-commercial' | string;

interface Candidate {
  id: string;
  name?: string | null;
  role?: string | null;
  category?: CandidateCategory | null;
  stage?: StageValue | null;
  stage_details?: string | null;
  status?: StatusValue | string | null;
  notes?: string | null;
  linkedin_url?: string | null;
  resume_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface Req {
  id: string;
  job_id?: string | null;
  title?: string | null;
  department?: string | null;
  status?: ReqStatusValue | null;
  created_at?: string | null;
}

// Permissions model temporarily disabled for go-live

const normalizeStatus = (raw: string | null | undefined) => {
  const s = (raw ?? '').toString().trim().toLowerCase();
  if (['active', 'started', 'hold', 'on hold', 'offer'].includes(s)) return 'active';
  if (['hired'].includes(s)) return 'hired';
  if (['reject', 'rejected', 'to reject', 'to rejected'].includes(s)) return 'rejected';
  return 'other';
};

function getStatusColor(status: string): string {
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

function LinkedInIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'analytics'>('dashboard');
  const [entityView, setEntityView] = useState<'candidates' | 'reqs'>('candidates');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [status, setStatus] = useState<StatusValue>('Active');
  const [stage, setStage] = useState<StageValue>('Round 1');
  const [managerFeedback, setManagerFeedback] = useState('');
  const [stageDetails, setStageDetails] = useState('');
  const [category, setCategory] = useState<'commercial' | 'non-commercial'>('commercial');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isCreatingNewRole, setIsCreatingNewRole] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [showRejected, setShowRejected] = useState(false);

  // Inline editable grid
  const [editingCell, setEditingCell] = useState<{ id: string; column: string } | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savedCell, setSavedCell] = useState<{ id: string; column: string } | null>(null);
  const [savingCell, setSavingCell] = useState<{ id: string; column: string } | null>(null);

  // Reqs state
  const [reqs, setReqs] = useState<Req[]>([]);
  const [reqEditingCell, setReqEditingCell] = useState<{ id: string; column: string } | null>(null);
  const [reqEditDraft, setReqEditDraft] = useState('');
  const [reqSavedCell, setReqSavedCell] = useState<{ id: string; column: string } | null>(null);
  const [reqSavingCell, setReqSavingCell] = useState<{ id: string; column: string } | null>(null);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [newReqTitle, setNewReqTitle] = useState('');

  // Close job modal
  const [isCloseJobModalOpen, setIsCloseJobModalOpen] = useState(false);
  const [closeJobReq, setCloseJobReq] = useState<Req | null>(null);
  const [closeReason, setCloseReason] = useState<string>('Hired');
  const [closeCandidateName, setCloseCandidateName] = useState('');
  const [closeStartDate, setCloseStartDate] = useState('');

  // Job tabs
  const [selectedJobTab, setSelectedJobTab] = useState<string>('All');

  // Admin override for go-live: full access once logged in
  const isAdmin = true;

  // Pass-Through Report modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportRole, setReportRole] = useState('');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportFunnel, setReportFunnel] = useState<{ stage: string; count: number; conversionPercent: number | null; conversionFromStage?: string }[]>([]);

  const baseCandidatesForDisplay = useMemo(() => {
    return candidates.filter((c) => {
      const norm = normalizeStatus(c.status);
      if (norm === 'hired') return false; // hired are never in pipeline dashboard
      if (!showRejected && norm === 'rejected') return false;
      return true;
    });
  }, [candidates, showRejected]);

  const openReqTitles = useMemo(
    () =>
      reqs
        .filter((r) => (r.status || 'Open') === 'Open')
        .map((r) => (r.title || '').toString().trim())
        .filter((t) => t.length > 0),
    [reqs],
  );

  const jobTabs = useMemo(() => {
    const titles = Array.from(new Set(openReqTitles));
    return ['All', 'Commercial', ...titles, 'Hired'];
  }, [openReqTitles]);

  const filteredCandidates = useMemo(() => {
    let list =
      selectedJobTab === 'Hired'
        ? candidates.filter((c) => normalizeStatus(c.status) === 'hired')
        : baseCandidatesForDisplay;

    if (selectedJobTab === 'Commercial') {
      list = list.filter(
        (c) => (c.category || '').toString().trim().toLowerCase() === 'commercial',
      );
    } else if (selectedJobTab !== 'All' && selectedJobTab !== 'Hired') {
      const tabLower = selectedJobTab.toLowerCase();
      list = list.filter(
        (c) => (c.role || '').toString().trim().toLowerCase() === tabLower,
      );
    }

    return [...list].sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tB - tA;
    });
  }, [baseCandidatesForDisplay, candidates, selectedJobTab]);

  const uniqueRoles = useMemo(() => {
    const roles = [...new Set(candidates.map((c) => c.role).filter(Boolean))] as string[];
    return roles.sort();
  }, [candidates]);

  const filteredReqs = useMemo(() => {
    return [...reqs].sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tB - tA;
    });
  }, [reqs]);

  const totalReqOpen = useMemo(() => reqs.filter((r) => r.status === 'Open').length, [reqs]);
  const totalReqHired = useMemo(() => reqs.filter((r) => r.status === 'Hired').length, [reqs]);
  const totalReqClosed = useMemo(() => reqs.filter((r) => r.status === 'Closed').length, [reqs]);

  // 1. Function to get candidates from Supabase
  const fetchCandidates = async () => {
    const { data } = await supabase
      .from<Candidate>('candidates')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCandidates(data);
  };

  const fetchReqs = async () => {
    const { data } = await supabase
      .from<Req>('reqs')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setReqs(data);
  };

  useEffect(() => {
    fetchCandidates();
    fetchReqs();
  }, []);

  // NOTE: permissions & user_permissions are disabled for go-live.

  // Chart data: candidates added over time (group by date)
  const chartDataByDate = useMemo(() => {
    const byDate: Record<string, number> = {};
    candidates.forEach((c) => {
      const raw = c.created_at;
      const date = raw ? new Date(raw).toISOString().slice(0, 10) : '';
      if (date) {
        byDate[date] = (byDate[date] ?? 0) + 1;
      }
    });
    return Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [candidates]);

  // Funnel: count per stage
  const funnelData = useMemo(() => {
    return STAGES.map((stageName) => ({
      stage: stageName,
      count: candidates.filter((c) => (c.stage || 'Round 1') === stageName).length,
    }));
  }, [candidates]);

  // Recent hires by month: last 6 months, status === 'Hired', grouped by month of updated_at or created_at
  const recentHiresByMonth = useMemo(() => {
    const hired = candidates.filter((c) => normalizeStatus(c.status) === 'hired');
    const now = new Date();
    const result: { key: string; label: string; hires: { name: string; role: string }[] }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${m < 10 ? '0' + m : m}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      const monthHires = hired.filter((c) => {
        const hasStageDate =
          typeof c.stage_details === 'string' && !Number.isNaN(Date.parse(c.stage_details));
        const raw = hasStageDate ? c.stage_details : c.updated_at || c.created_at;
        if (!raw) return false;
        const hireDate = new Date(raw);
        return hireDate.getFullYear() === y && hireDate.getMonth() + 1 === m;
      });
      result.push({
        key,
        label,
        hires: monthHires.map((c) => ({ name: c.name ?? '', role: c.role ?? '' })),
      });
    }
    return result;
  }, [candidates]);

  // 2. Function to SAVE a new candidate
  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a name.');
      return;
    }

    const finalRole = (isCreatingNewRole ? newRoleTitle : role).trim();
    if (!finalRole) {
      alert('Please select or create a role.');
      return;
    }

    // If we're creating a brand new role, also create a corresponding open req
    if (isCreatingNewRole) {
      const payloadReq: Partial<Req> = {
        job_id: '',
        title: finalRole,
        department: '',
        status: 'Open' as ReqStatusValue,
      };
      const { error: reqError, data: createdReqs } = await supabase
        .from<Req>('reqs')
        .insert([payloadReq])
        .select();
      if (reqError) {
        alert('Error creating role in requisitions: ' + reqError.message);
        return;
      }
      if (createdReqs && Array.isArray(createdReqs) && createdReqs.length > 0) {
        setReqs((prev) => [...prev, ...createdReqs]);
      } else {
        // Fallback: refresh from server if no rows returned
        fetchReqs();
      }
    }

    const { error } = await supabase
      .from<Candidate>('candidates')
      .insert([{
        name,
        role: finalRole,
        linkedin_url: linkedinUrl,
        resume_url: resumeUrl,
        status,
        stage,
        stage_details: stageDetails,
        notes: managerFeedback,
        category,
      } satisfies Candidate]);
    
    if (!error) {
      setIsModalOpen(false);
      setName('');
      setRole('');
      setLinkedinUrl('');
      setResumeUrl('');
      setManagerFeedback('');
      setStageDetails('');
      setCategory('commercial');
      setIsCreatingNewRole(false);
      setNewRoleTitle('');
      fetchCandidates(); // Refresh the list
    } else {
      alert("Error saving: " + error.message);
    }
  };

  const columnToField: Record<string, string> = {
    name: 'name',
    role: 'role',
    category: 'category',
    stage: 'stage',
    status: 'status',
    stage_details: 'stage_details',
    notes: 'notes',
  };

  const reqColumnToField: Record<string, string> = {
    title: 'title',
    status: 'status',
  };

  const startEdit = (id: string, column: string, currentValue: string | undefined) => {
    setEditingCell({ id, column });
    setEditDraft(currentValue ?? '');
  };

  const saveCell = async (id: string, column: string, value: string) => {
    const field = columnToField[column];
    if (!field) return;
    const prevCandidates = candidates;
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
    setEditingCell(null);
    setSavingCell({ id, column });
    const { error } = await supabase
      .from('candidates')
      .update({ [field]: value })
      .eq('id', id);
    setSavingCell(null);
    if (!error) {
      setSavedCell({ id, column });
      setTimeout(() => setSavedCell(null), 1800);
    } else {
      setCandidates(prevCandidates);
      alert('Error saving: ' + error.message);
    }
  };

  const startReqEdit = (id: string, column: string, currentValue: string | undefined) => {
    setReqEditingCell({ id, column });
    setReqEditDraft(currentValue ?? '');
  };

  const saveReqCell = async (id: string, column: string, value: string) => {
    const field = reqColumnToField[column];
    if (!field) return;
    const prevReqs = reqs;
    setReqs((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setReqEditingCell(null);
    setReqSavingCell({ id, column });
    const { error } = await supabase
      .from('reqs')
      .update({ [field]: value })
      .eq('id', id);
    setReqSavingCell(null);
    if (!error) {
      setReqSavedCell({ id, column });
      setTimeout(() => setReqSavedCell(null), 1800);
    } else {
      setReqs(prevReqs);
      alert('Error saving requisition: ' + error.message);
    }
  };

  const handleCreateReq = async () => {
    if (!newReqTitle.trim()) {
      alert('Please enter a job title.');
      return;
    }

    const payload: Partial<Req> = {
      job_id: '', // satisfy NOT NULL constraint with empty string
      title: newReqTitle.trim(),
      department: '',
      status: 'Open' as ReqStatusValue,
    };

    const { error } = await supabase.from<Req>('reqs').insert([payload]);
    if (error) {
      alert('Error creating requisition: ' + error.message);
    } else {
      setIsReqModalOpen(false);
      setNewReqTitle('');
      fetchReqs();
    }
  };

  const openCloseJobModal = (req: Req) => {
    setCloseJobReq(req);
    setCloseReason('Hired');
    setCloseCandidateName('');
    setCloseStartDate('');
    setIsCloseJobModalOpen(true);
  };

  const handleConfirmCloseJob = async () => {
    if (!closeJobReq) return;

    if (closeReason === 'Hired') {
      if (!closeCandidateName.trim()) {
        alert('Please enter the hired candidate name.');
        return;
      }
      if (!closeStartDate) {
        alert('Please select a start date.');
        return;
      }
    }

    const statusUpdate: ReqStatusValue = closeReason === 'Hired' ? 'Hired' : 'Closed';

    const { error: reqError } = await supabase
      .from('reqs')
      .update({ status: statusUpdate })
      .eq('id', closeJobReq.id);

    if (reqError) {
      alert('Error closing job: ' + reqError.message);
      return;
    }

    if (closeReason === 'Hired') {
      const payload = {
        name: closeCandidateName.trim(),
        role: (closeJobReq.title || '').toString(),
        status: 'Hired' as StatusValue,
        stage: 'Offer' as StageValue,
        stage_details: closeStartDate,
        notes: '',
        category: 'commercial' as 'commercial' | 'non-commercial',
        linkedin_url: '',
        resume_url: '',
      };

      const { error: candError } = await supabase.from('candidates').insert([payload]);
      if (candError) {
        alert('Error recording hire: ' + candError.message);
      }
    }

    setIsCloseJobModalOpen(false);
    setCloseJobReq(null);
    setCloseCandidateName('');
    setCloseStartDate('');
    await fetchReqs();
    await fetchCandidates();
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this candidate?');
    if (!confirmed) return;

    const previous = candidates;
    setCandidates((prev) => prev.filter((c) => c.id !== id));

    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) {
      alert('Error deleting: ' + error.message);
      setCandidates(previous);
    }
  };

  const handleCellBlur = (c: Candidate, column: string) => {
    if (!editingCell || editingCell.id !== c.id || editingCell.column !== column) return;
    saveCell(c.id, column, editDraft);
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    c: Candidate,
    column: string,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingCell && editingCell.id === c.id && editingCell.column === column) {
        saveCell(c.id, column, editDraft);
      }
    }
  };

  const getStageIndex = (stage: string) => {
    const i = STAGES.indexOf((stage || 'Round 1') as StageValue);
    return i >= 0 ? i : 0;
  };

  const runPassThroughReport = () => {
    const start = reportStartDate ? new Date(reportStartDate).getTime() : 0;
    const end = reportEndDate ? new Date(reportEndDate + 'T23:59:59').getTime() : Number.MAX_SAFE_INTEGER;
    const filtered = candidates.filter((c) => {
      const matchRole = !reportRole || c.role === reportRole;
      const created = c.created_at ? new Date(c.created_at).getTime() : 0;
      const inRange = created >= start && created <= end;
      return matchRole && inRange;
    });
    const funnel: { stage: string; count: number; conversionPercent: number | null; conversionFromStage?: string }[] = [];
    let prevCount = 0;
    const offerOrFurtherIndex = STAGES.indexOf('Offer');
    STAGES.forEach((stageName, i) => {
      const count = filtered.filter((c) => getStageIndex(c.stage) >= i).length;
      let conversionPercent: number | null = null;
      let conversionFromStage: string | undefined;
      if (i === 0) {
        conversionPercent = null;
      } else if (stageName === 'Offer Declined') {
        const offerCount = funnel[offerOrFurtherIndex]?.count ?? 0;
        conversionPercent = offerCount > 0 ? Math.round((count / offerCount) * 100) : 0;
        conversionFromStage = 'Offer';
      } else {
        conversionPercent = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
        conversionFromStage = STAGES[i - 1];
      }
      funnel.push({ stage: stageName, count, conversionPercent, conversionFromStage });
      prevCount = count;
    });
    setReportFunnel(funnel);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: ParseResult<Record<string, unknown>>) => {
        // Normalize headers: lowercase + replace spaces with underscores
        const normalizedRows = (results.data as Array<Record<string, unknown>>).map((row) => {
          const norm: Record<string, unknown> = {};
          Object.keys(row).forEach((key) => {
            const normKey = key.toLowerCase().replace(/\s+/g, '_');
            norm[normKey] = row[key];
          });
          return norm;
        });

        const rows = normalizedRows.filter((row) => {
          const rawName = ((row['name'] ?? '') as string).toString().trim();
          return rawName.length > 0;
        });

        if (!rows.length) {
          alert('No valid rows with a "name" column were found in the CSV.');
          e.target.value = '';
          return;
        }

        const payload: Candidate[] = rows.map((row) => {
          const name = ((row['name'] ?? '') as string).toString().trim();
          const role = ((row['role'] ?? '') as string).toString().trim();
          const category = ((row['category'] ?? 'commercial') as string).toString().trim();
          const stage = ((row['stage'] ?? 'Round 1') as string).toString().trim();
          const stageDetails = ((row['stage_details'] ?? '') as string).toString().trim();
          const status = ((row['status'] ?? 'Active') as string).toString().trim();
          const linkedin_url = ((row['linkedin_url'] ?? '') as string).toString().trim();
          const resume_url = (row['resume_url'] as string) || '';
          const notes =
            (((row['notes'] as string | undefined) ??
              ((row['manager_feedback'] as string | undefined) ?? ''))?.toString().trim() || '');

          return {
            name,
            role,
            category,
            stage,
            stage_details: stageDetails,
            status,
            linkedin_url,
            resume_url,
            notes,
          } as Candidate;
        });

        const { error } = await supabase.from<Candidate>('candidates').insert(payload);

        if (error) {
          alert('Error importing CSV: ' + error.message);
        } else {
          alert(`Success! Added ${payload.length} candidate(s).`);
          fetchCandidates();
        }

        e.target.value = '';
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        alert('Error parsing CSV: ' + message);
        e.target.value = '';
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Recruiting Dashboard</h1>
            <div className="flex rounded-lg border border-slate-700 bg-slate-900/80 p-0.5">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'dashboard' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'analytics'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Analytics
              </button>
            </div>
            <div className="flex rounded-lg border border-slate-700 bg-slate-900/80 p-0.5">
              <button
                type="button"
                onClick={() => setEntityView('candidates')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  entityView === 'candidates' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Candidates
              </button>
              <button
                type="button"
                onClick={() => setEntityView('reqs')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  entityView === 'reqs' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reqs
              </button>
            </div>
          </div>
          <div className="relative z-50 flex gap-3 items-center">
            {entityView === 'candidates' && (
              <>
                {isAdmin && (
                  <span className="text-xs font-mono text-emerald-400">
                    Logged in as ADMIN
                  </span>
                )}
                <input
                  id="csv-input"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleImportCsv}
                />
                {isAdmin && (
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="bg-slate-700 border border-slate-600 hover:bg-slate-600 px-3 py-1.5 rounded-lg font-semibold text-sm"
                  >
                    Run Report
                  </button>
                )}
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => document.getElementById('csv-input')?.click()}
                      className="bg-slate-800 border border-slate-600 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-semibold text-sm"
                    >
                      Import CSV
                    </button>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="bg-blue-600 px-3 py-1.5 rounded-lg font-semibold text-sm"
                    >
                      Add Candidate
                    </button>
                  </>
                )}
              </>
            )}
            {entityView === 'reqs' && (
              <button
                type="button"
                onClick={() => setIsReqModalOpen(true)}
                className="bg-blue-600 px-3 py-1.5 rounded-lg font-semibold text-sm"
              >
                Create New Job
              </button>
            )}
          </div>
        </header>

            {entityView === 'candidates' && (
              <>
            {/* Job Tabs */}
            <section className="mb-8">
              <div className="flex flex-wrap gap-2">
                {jobTabs.map((tab) => {
                  const isActiveTab = tab === selectedJobTab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSelectedJobTab(tab)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        isActiveTab
                          ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.45)]'
                          : 'bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </section>

        {/* Reporting / Analytics */}
        {viewMode === 'analytics' && (
          <section className="mb-10 space-y-6">
            <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Recent Hires by Month</h3>
              <div className="max-h-[420px] overflow-y-auto pr-1 space-y-4">
                {recentHiresByMonth.map(({ key: monthKey, label, hires }) => (
                  <div key={monthKey} className="border-b border-slate-700/80 pb-4 last:border-0 last:pb-0">
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</h4>
                    {hires.length === 0 ? (
                      <p className="text-slate-500 text-sm">No hires this month</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {hires.map((h, i) => (
                          <li key={`${monthKey}-${i}`} className="flex items-center gap-2 text-sm">
                            <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-medium shrink-0">
                              Hired
                            </span>
                            <span className="text-slate-200 font-medium">{h.name || '—'}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-400">{h.role || '—'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-6 shadow-[0_0_30px_rgba(56,189,248,0.12)]">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Candidates Added Over Time</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDataByDate} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Candidates added"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={{ fill: '#38bdf8', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-900/60 border border-slate-700/80 rounded-2xl p-6 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Hiring Funnel by Stage</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="stage" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="count" name="Candidates" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* Settings / user permissions temporarily removed for go-live */}

        {/* Candidate Table */}
            {viewMode === 'dashboard' && (
            <div className="space-y-3">
          <div className="flex items-center justify-end gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowRejected((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                showRejected
                  ? 'bg-red-900/40 border-red-500 text-red-200'
                  : 'bg-slate-900 border-slate-600 text-slate-300'
              }`}
            >
              {showRejected ? 'Hide Rejected' : 'Show Rejected'}
            </button>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 text-slate-400 text-sm">
                <tr>
                  <th className="p-3">NAME</th>
                  <th className="p-3">ROLE</th>
                  <th className="p-3">CATEGORY</th>
                  <th className="p-3">STAGE</th>
                  <th className="p-3">STAGE DETAILS</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3">NOTES</th>
                  <th className="p-3 w-20 text-center">LINKS</th>
                  <th className="p-3 w-12 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c) => {
                  const isEditing = (col: string) => editingCell?.id === c.id && editingCell?.column === col;
                  const isSaved = (col: string) => savedCell?.id === c.id && savedCell?.column === col;
                  const isSaving = (col: string) => savingCell?.id === c.id && savingCell?.column === col;
                  const cellClass = (col: string) =>
                    `p-2 align-top border-l-2 transition-colors relative ${isSaved(col) ? 'border-green-500 bg-green-950/20' : 'border-transparent'}`;
                  const savingIndicator = (col: string) =>
                    isSaving(col) ? (
                      <span className="absolute top-1 right-1 text-[10px] text-slate-500 animate-pulse" aria-live="polite">
                        Saving…
                      </span>
                    ) : null;
                  const displayVal = (col: string) => {
                    const v = c[col];
                    return (v ?? '') as string;
                  };
                  return (
                    <tr key={c.id} className="group border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className={cellClass('name')}>
                        {isEditing('name') ? (
                          <input
                            className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onBlur={() => handleCellBlur(c, 'name')}
                            onKeyDown={(e) => handleCellKeyDown(e, c, 'name')}
                            autoFocus
                          />
                        ) : (
                          <div
                            className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1"
                            onClick={() => startEdit(c.id, 'name', displayVal('name'))}
                          >
                            {displayVal('name') || '—'}
                            {isSaved('name') && <span className="text-green-400 text-xs">✓</span>}
                          </div>
                        )}
                        {savingIndicator('name')}
                      </td>
                      <td className={cellClass('role')}>
                        {isEditing('role') ? (
                          <input
                            className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onBlur={() => handleCellBlur(c, 'role')}
                            onKeyDown={(e) => handleCellKeyDown(e, c, 'role')}
                            autoFocus
                          />
                        ) : (
                          <div
                            className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1"
                            onClick={() => startEdit(c.id, 'role', displayVal('role'))}
                          >
                            {displayVal('role') || '—'}
                            {isSaved('role') && <span className="text-green-400 text-xs">✓</span>}
                          </div>
                        )}
                        {savingIndicator('role')}
                      </td>
                      <td className={cellClass('category')}>
                        {isEditing('category') ? (
                          <select
                            className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onBlur={() => handleCellBlur(c, 'category')}
                            onKeyDown={(e) => handleCellKeyDown(e, c, 'category')}
                            autoFocus
                          >
                            <option value="commercial">Commercial</option>
                            <option value="non-commercial">Non-Commercial</option>
                          </select>
                        ) : (
                          <div
                            className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1"
                            onClick={() => startEdit(c.id, 'category', displayVal('category') || 'commercial')}
                          >
                            {displayVal('category') || '—'}
                            {isSaved('category') && <span className="text-green-400 text-xs">✓</span>}
                          </div>
                        )}
                        {savingIndicator('category')}
                      </td>
                      <td className={cellClass('stage')}>
                        {isEditing('stage') ? (
                          <select
                            className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                            value={editDraft}
                            onChange={(e) => saveCell(c.id, 'stage', e.target.value)}
                            onBlur={() => handleCellBlur(c, 'stage')}
                            onKeyDown={(e) => handleCellKeyDown(e, c, 'stage')}
                            autoFocus
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <div
                            className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1"
                            onClick={() => startEdit(c.id, 'stage', displayVal('stage') || 'Round 1')}
                          >
                            <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-full text-xs">
                              {displayVal('stage') || 'Round 1'}
                            </span>
                            {isSaved('stage') && <span className="text-green-400 text-xs">✓</span>}
                          </div>
                        )}
                        {savingIndicator('stage')}
                      </td>
                      <td className={cellClass('stage_details')}>
                        {isEditing('stage_details') ? (
                          <input
                            className="w-full min-w-[120px] bg-transparent border border-slate-600 focus:bg-slate-950 rounded px-2 py-1 text-sm text-slate-200"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onBlur={() => handleCellBlur(c, 'stage_details')}
                            onKeyDown={(e) => handleCellKeyDown(e, c, 'stage_details')}
                            autoFocus
                            placeholder="Details…"
                          />
                        ) : (
                          <div
                            className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1 max-w-[200px] truncate"
                            onClick={() => startEdit(c.id, 'stage_details', displayVal('stage_details'))}
                            title={displayVal('stage_details') || undefined}
                          >
                            {displayVal('stage_details') || '—'}
                            {isSaved('stage_details') && <span className="text-green-400 text-xs shrink-0">✓</span>}
                          </div>
                        )}
                        {savingIndicator('stage_details')}
                      </td>
                      <td className={cellClass('status')}>
                        {isEditing('status') ? (
                          <select
                            className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                            value={editDraft}
                            onChange={(e) => saveCell(c.id, 'status', e.target.value)}
                            onBlur={() => handleCellBlur(c, 'status')}
                            onKeyDown={(e) => handleCellKeyDown(e, c, 'status')}
                            autoFocus
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <div
                            className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1"
                            onClick={() => startEdit(c.id, 'status', displayVal('status') || 'Active')}
                          >
                            <span className={`${getStatusColor(c.status || 'Active')} px-2 py-0.5 rounded-full text-xs`}>
                              {c.status || 'Active'}
                            </span>
                            {isSaved('status') && <span className="text-green-400 text-xs ml-0.5">✓</span>}
                          </div>
                        )}
                        {savingIndicator('status')}
                      </td>
                      <td className={cellClass('notes')}>
                        {isEditing('notes') ? (
                          <input
                            className="w-full min-w-[120px] bg-transparent border border-slate-600 focus:bg-slate-950 rounded px-2 py-1 text-sm text-slate-200"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onBlur={() => handleCellBlur(c, 'notes')}
                            onKeyDown={(e) => handleCellKeyDown(e, c, 'notes')}
                            autoFocus
                            placeholder="Notes…"
                          />
                        ) : (
                          <div
                            className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1 max-w-[200px] truncate"
                            onClick={() => startEdit(c.id, 'notes', displayVal('notes'))}
                            title={displayVal('notes') || undefined}
                          >
                            {displayVal('notes') || '—'}
                            {isSaved('notes') && <span className="text-green-400 text-xs shrink-0">✓</span>}
                          </div>
                        )}
                        {savingIndicator('notes')}
                      </td>
                      <td className="p-2 align-middle text-center">
                        <div className="flex items-center justify-center gap-1">
                          {c.linkedin_url ? (
                            <a
                              href={c.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                              title="Open LinkedIn"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LinkedInIcon />
                            </a>
                          ) : (
                            <span className="w-8 h-8 inline-block" />
                          )}
                          {c.resume_url ? (
                            <a
                              href={c.resume_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                              title="Open Resume"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ResumeIcon />
                            </a>
                          ) : (
                            <span className="w-8 h-8 inline-block" />
                          )}
                        </div>
                      </td>
                      <td className="p-2 align-middle text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(c.id);
                          }}
                          className="inline-flex items-center justify-center rounded-full p-1.5 text-rose-500/70 hover:text-rose-400 hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete candidate"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}
        </>
        )}

        {/* MODAL FORM */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">New Candidate</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm text-slate-300">
                    Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Candidate name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-slate-300">
                    Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl"
                    value={role}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '__new__') {
                        setIsCreatingNewRole(true);
                        setRole('');
                      } else {
                        setIsCreatingNewRole(false);
                        setRole(value);
                      }
                    }}
                  >
                    <option value="">Select role…</option>
                    {Array.from(new Set(openReqTitles)).map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                    <option value="__new__">Create new role…</option>
                  </select>
                  {isCreatingNewRole && (
                    <input
                      type="text"
                      className="mt-2 w-full bg-slate-950 border border-slate-800 p-3 rounded-xl"
                      value={newRoleTitle}
                      onChange={(e) => setNewRoleTitle(e.target.value)}
                      placeholder="New role title"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-slate-300">Category</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as 'commercial' | 'non-commercial')}
                  >
                    <option value="commercial">Commercial</option>
                    <option value="non-commercial">Non-Commercial</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-slate-300">Status</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusValue)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-slate-300">Stage</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl"
                    value={stage}
                    onChange={(e) => setStage(e.target.value as StageValue)}
                  >
                    <option value="Round 1">Round 1</option>
                    <option value="Round 2">Round 2</option>
                    <option value="Round 3">Round 3</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Final">Final</option>
                    <option value="Offer">Offer</option>
                    <option value="Pending Start">Pending Start</option>
                    <option value="Offer Declined">Offer Declined</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm text-slate-300">Stage Details</label>
                  <textarea
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl min-h-[70px]"
                    value={stageDetails}
                    onChange={(e) => setStageDetails(e.target.value)}
                    placeholder="Any additional context on stage, next steps, etc."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm text-slate-300">Notes</label>
                  <textarea
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl min-h-[70px]"
                    value={managerFeedback}
                    onChange={(e) => setManagerFeedback(e.target.value)}
                    placeholder="Manager notes, interview feedback, etc."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm text-slate-300">LinkedIn URL</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="bg-blue-600 px-6 py-2 rounded-xl font-bold"
                >
                  Save to Database
                </button>
              </div>
            </div>
          </div>
        )}

        {entityView === 'reqs' && (
        <>
        {/* Req Summary */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-3">
            <p className="text-xs uppercase text-slate-400 mb-1">Total Open</p>
            <p className="text-xl font-semibold text-slate-50">{totalReqOpen}</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-3">
            <p className="text-xs uppercase text-slate-400 mb-1">Total Filled (Hired)</p>
            <p className="text-xl font-semibold text-emerald-400">{totalReqHired}</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-3">
            <p className="text-xs uppercase text-slate-400 mb-1">Total Closed</p>
            <p className="text-xl font-semibold text-slate-50">{totalReqClosed}</p>
          </div>
        </section>

        {/* Req Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Department</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReqs.map((r) => {
                const isEditing = (col: string) => reqEditingCell != null && reqEditingCell.id === r.id && reqEditingCell.column === col;
                const isSaved = (col: string) => reqSavedCell != null && reqSavedCell.id === r.id && reqSavedCell.column === col;
                const isSaving = (col: string) => reqSavingCell != null && reqSavingCell.id === r.id && reqSavingCell.column === col;
                const cellClass = (col: string) =>
                  `p-2 align-top border-l-2 relative ${
                    isSaved(col) ? 'border-emerald-500 bg-emerald-950/20' : 'border-transparent'
                  }`;
                const savingIndicator = (col: string) =>
                  isSaving(col) ? (
                    <span className="absolute top-1 right-1 text-[10px] text-slate-500 animate-pulse">Saving…</span>
                  ) : null;

                return (
                  <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className={cellClass('title')}>
                      {isEditing('title') ? (
                        <input
                          className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                          value={reqEditDraft}
                          onChange={(e) => setReqEditDraft(e.target.value)}
                          onBlur={() => saveReqCell(r.id, 'title', reqEditDraft)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveReqCell(r.id, 'title', reqEditDraft);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <div
                          className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1"
                          onClick={() => startReqEdit(r.id, 'title', r.title)}
                        >
                          <span className="text-slate-200">{r.title || '—'}</span>
                          {isSaved('title') && <span className="text-emerald-400 text-xs">✓</span>}
                        </div>
                      )}
                      {savingIndicator('title')}
                    </td>
                    <td className="p-2 text-slate-300">{r.department || '—'}</td>
                    <td className={cellClass('status')}>
                      {isEditing('status') ? (
                        <select
                          className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                          value={reqEditDraft}
                          onChange={(e) => saveReqCell(r.id, 'status', e.target.value)}
                          autoFocus
                        >
                          {REQ_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <div
                          className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 inline-flex items-center gap-1"
                          onClick={() => startReqEdit(r.id, 'status', r.status || 'Open')}
                        >
                          <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-full text-xs">
                            {r.status || 'Open'}
                          </span>
                          {isSaved('status') && <span className="text-emerald-400 text-xs">✓</span>}
                        </div>
                      )}
                      {savingIndicator('status')}
                    </td>
                    <td className="p-2 text-right align-top">
                      {(r.status || 'Open') !== 'Hired' && (r.status || 'Open') !== 'Closed' && (
                        <button
                          type="button"
                          onClick={() => openCloseJobModal(r)}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-600 text-slate-200 bg-slate-900 hover:bg-slate-800"
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Create New Job Modal */}
        {isReqModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">Create New Job</h2>
              <input
                type="text"
                placeholder="Job Title"
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl mb-4"
                value={newReqTitle}
                onChange={(e) => setNewReqTitle(e.target.value)}
              />
              <div className="flex justify-end gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsReqModalOpen(false)}
                  className="text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateReq}
                  className="bg-blue-600 px-6 py-2 rounded-xl font-bold"
                >
                  Create Job
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Close Job Modal */}
        {isCloseJobModalOpen && closeJobReq && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Close Job</h2>
              <p className="text-slate-300 text-sm mb-4">
                {closeJobReq.title ? `Job: ${closeJobReq.title}` : 'Selected job'}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Reason</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm"
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                  >
                    <option value="Hired">Hired</option>
                    <option value="Put on hold">Put on hold</option>
                    <option value="No longer needed">No longer needed</option>
                  </select>
                </div>
                {closeReason === 'Hired' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Hired Candidate Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm mb-3"
                      value={closeCandidateName}
                      onChange={(e) => setCloseCandidateName(e.target.value)}
                      placeholder="Enter candidate name"
                    />
                    <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm"
                      value={closeStartDate}
                      onChange={(e) => setCloseStartDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCloseJobModalOpen(false);
                    setCloseJobReq(null);
                    setCloseCandidateName('');
                  }}
                  className="text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCloseJob}
                  className="bg-blue-600 px-6 py-2 rounded-xl font-bold"
                >
                  Confirm Close
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}

        {/* Pass-Through Report Modal */}
        {isReportModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Pass-Through Report</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Role</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl"
                    value={reportRole}
                    onChange={(e) => setReportRole(e.target.value)}
                  >
                    <option value="">All roles</option>
                    {uniqueRoles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3 mb-6">
                <button
                  onClick={runPassThroughReport}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl font-semibold"
                >
                  Run Report
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2.5 text-slate-400 hover:text-slate-200"
                >
                  Close
                </button>
              </div>
              {reportFunnel.length > 0 && (
                <div className="border-t border-slate-700 pt-4">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Funnel</h3>
                  <ul className="space-y-2">
                    {reportFunnel.map((row, i) => (
                      <li
                        key={row.stage}
                        className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
                      >
                        <span className="font-medium text-slate-200">{row.stage}</span>
                        <span className="text-slate-300">
                          {row.count} candidate{row.count !== 1 ? 's' : ''}
                          {row.conversionPercent !== null && row.conversionFromStage && (
                            <span className="text-slate-400 text-sm ml-1">
                              ({row.conversionPercent}% conversion from {row.conversionFromStage})
                            </span>
                          )}
                          {row.conversionPercent === null && i === 0 && (
                            <span className="text-slate-400 text-sm ml-1">(100% of filtered)</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}