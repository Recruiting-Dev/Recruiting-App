'use client';
import { useState } from 'react';
import { STAGES, STATUS_OPTIONS, type StageValue, type StatusValue, type CandidateInsert } from '@/lib/types';

interface Props {
  isOpen: boolean;
  category: 'commercial' | 'non-commercial';
  onClose: () => void;
  onSave: (data: CandidateInsert) => Promise<void>;
}

const blank = (category: 'commercial' | 'non-commercial') => ({
  name: '',
  role: '',
  stage: 'Round 1' as StageValue,
  stage_details: '',
  status: 'Active' as StatusValue,
  notes: '',
  linkedin_url: '',
  resume_url: '',
  category,
});

export default function InsertRowModal({ isOpen, category, onClose, onSave }: Props) {
  const [form, setForm] = useState(() => blank(category));
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Name is required.'); return; }
    setSaving(true);
    try {
      await onSave({ ...form, name: form.name.trim(), role: form.role.trim() });
      setForm(blank(category));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-sm text-slate-100';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 p-7 rounded-2xl w-full max-w-lg">
        <h2 className="text-lg font-bold mb-5">Insert Row</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="text-xs text-slate-400">Name <span className="text-rose-400">*</span></label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Candidate name" autoFocus />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Role</label>
            <input className={inputCls} value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Account Executive" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Stage</label>
            <select className={inputCls} value={form.stage} onChange={(e) => set('stage', e.target.value as StageValue)}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Status</label>
            <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value as StatusValue)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Stage Details</label>
            <input className={inputCls} value={form.stage_details ?? ''} onChange={(e) => set('stage_details', e.target.value)} placeholder="Next steps…" />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs text-slate-400">Notes</label>
            <input className={inputCls} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Notes…" />
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-xs text-slate-400">LinkedIn URL</label>
            <input className={inputCls} value={form.linkedin_url ?? ''} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/…" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Insert'}
          </button>
        </div>
      </div>
    </div>
  );
}
