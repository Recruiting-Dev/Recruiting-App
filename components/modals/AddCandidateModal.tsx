'use client';
import { useState } from 'react';
import { STAGES, STATUS_OPTIONS, type StageValue, type StatusValue, type CandidateInsert } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** isNewRole=true when the user typed a brand-new role title; parent should create a matching req. */
  onSave: (data: CandidateInsert, isNewRole: boolean) => Promise<void>;
  openReqTitles: string[];
}

const BLANK = {
  name: '',
  role: '',
  newRoleTitle: '',
  isNewRole: false,
  linkedinUrl: '',
  status: 'Active' as StatusValue,
  stage: 'Round 1' as StageValue,
  stageDetails: '',
  notes: '',
  category: 'commercial' as 'commercial' | 'non-commercial',
};

export default function AddCandidateModal({ isOpen, onClose, onSave, openReqTitles }: Props) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const set = <K extends keyof typeof BLANK>(k: K, v: (typeof BLANK)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Please enter a name.'); return; }
    const finalRole = (form.isNewRole ? form.newRoleTitle : form.role).trim();
    if (!finalRole) { alert('Please select or create a role.'); return; }

    setSaving(true);
    try {
      await onSave(
        { name: form.name, role: finalRole, linkedin_url: form.linkedinUrl, status: form.status,
          stage: form.stage, stage_details: form.stageDetails, notes: form.notes, category: form.category },
        form.isNewRole,
      );
      setForm(BLANK);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">New Candidate</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Name <span className="text-rose-400">*</span></label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Candidate name" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Role <span className="text-rose-400">*</span></label>
            <select
              className={inputCls}
              value={form.isNewRole ? '__new__' : form.role}
              onChange={(e) => {
                if (e.target.value === '__new__') { set('isNewRole', true); set('role', ''); }
                else { set('isNewRole', false); set('role', e.target.value); }
              }}
            >
              <option value="">Select role…</option>
              {Array.from(new Set(openReqTitles)).map((t) => <option key={t} value={t}>{t}</option>)}
              <option value="__new__">+ Create new role…</option>
            </select>
            {form.isNewRole && (
              <input className={inputCls} value={form.newRoleTitle} onChange={(e) => set('newRoleTitle', e.target.value)} placeholder="New role title" />
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Category</label>
            <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value as 'commercial' | 'non-commercial')}>
              <option value="commercial">Commercial</option>
              <option value="non-commercial">Non-Commercial</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Status</label>
            <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value as StatusValue)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Stage</label>
            <select className={inputCls} value={form.stage} onChange={(e) => set('stage', e.target.value as StageValue)}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm text-slate-300">Stage Details</label>
            <textarea className={`${inputCls} min-h-[60px]`} value={form.stageDetails} onChange={(e) => set('stageDetails', e.target.value)} placeholder="Next steps, context, etc." />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm text-slate-300">Notes</label>
            <textarea className={`${inputCls} min-h-[60px]`} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Manager notes, interview feedback, etc." />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm text-slate-300">LinkedIn URL</label>
            <input className={inputCls} value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} placeholder="https://www.linkedin.com/in/..." />
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl font-bold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
