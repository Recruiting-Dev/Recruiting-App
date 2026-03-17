'use client';
import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
}

export default function AddReqModal({ isOpen, onClose, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) { alert('Please enter a job title.'); return; }
    setSaving(true);
    try {
      await onSave(title.trim());
      setTitle('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Create New Job</h2>
        <input
          type="text"
          placeholder="Job Title"
          className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          autoFocus
        />
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl font-bold disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Job'}
          </button>
        </div>
      </div>
    </div>
  );
}
