'use client';
import { useState } from 'react';
import type { Req } from '@/lib/types';

interface Props {
  req: Req | null;
  onClose: () => void;
  onConfirm: (reason: string, candidateName: string, startDate: string) => Promise<void>;
}

export default function CloseJobModal({ req, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('Hired');
  const [candidateName, setCandidateName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [saving, setSaving] = useState(false);

  if (!req) return null;

  const handleConfirm = async () => {
    if (reason === 'Hired') {
      if (!candidateName.trim()) { alert('Please enter the hired candidate name.'); return; }
      if (!startDate) { alert('Please select a start date.'); return; }
    }
    setSaving(true);
    try {
      await onConfirm(reason, candidateName.trim(), startDate);
      setCandidateName('');
      setStartDate('');
      setReason('Hired');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-2">Close Job</h2>
        <p className="text-slate-400 text-sm mb-6">{req.title ?? 'Selected job'}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Reason</label>
            <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="Hired">Hired</option>
              <option value="Put on hold">Put on hold</option>
              <option value="No longer needed">No longer needed</option>
            </select>
          </div>

          {reason === 'Hired' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Hired Candidate Name</label>
                <input type="text" className={inputCls} value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Enter candidate name" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">Cancel</button>
          <button onClick={handleConfirm} disabled={saving} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl font-bold disabled:opacity-50">
            {saving ? 'Closing…' : 'Confirm Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
