'use client';
import { useState } from 'react';
import { REQ_STATUS_OPTIONS, type Req } from '@/lib/types';

type ReqField = 'title' | 'status';
type CellRef = { id: string; col: ReqField };

interface Props {
  reqs: Req[];
  onSaveCell: (id: string, field: ReqField, value: string) => Promise<void>;
  onOpenCloseModal: (req: Req) => void;
  onAddReq: () => void;
}

export default function ReqsView({ reqs, onSaveCell, onOpenCloseModal, onAddReq }: Props) {
  const [editingCell, setEditingCell] = useState<CellRef | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savedCell, setSavedCell] = useState<CellRef | null>(null);
  const [savingCell, setSavingCell] = useState<CellRef | null>(null);

  const open   = reqs.filter((r) => r.status === 'Open').length;
  const hired  = reqs.filter((r) => r.status === 'Hired').length;
  const closed = reqs.filter((r) => r.status === 'Closed').length;

  const sorted = [...reqs].sort((a, b) =>
    (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0),
  );

  const startEdit = (id: string, col: ReqField, value: string) => { setEditingCell({ id, col }); setEditDraft(value); };

  const commitEdit = async (id: string, col: ReqField, value: string) => {
    setEditingCell(null);
    setSavingCell({ id, col });
    await onSaveCell(id, col, value);
    setSavingCell(null);
    setSavedCell({ id, col });
    setTimeout(() => setSavedCell((c) => (c?.id === id && c.col === col ? null : c)), 1800);
  };

  const isEditing = (id: string, col: ReqField) => editingCell?.id === id && editingCell.col === col;
  const isSaved   = (id: string, col: ReqField) => savedCell?.id === id && savedCell.col === col;
  const isSaving  = (id: string, col: ReqField) => savingCell?.id === id && savingCell.col === col;
  const cellCls   = (id: string, col: ReqField) =>
    `p-2 align-top border-l-2 relative transition-colors ${isSaved(id, col) ? 'border-emerald-500 bg-emerald-950/20' : 'border-transparent'}`;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
          <p className="text-xs uppercase text-slate-400 mb-1">Open</p>
          <p className="text-2xl font-semibold text-slate-50">{open}</p>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
          <p className="text-xs uppercase text-slate-400 mb-1">Filled</p>
          <p className="text-2xl font-semibold text-emerald-400">{hired}</p>
        </div>
        <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
          <p className="text-xs uppercase text-slate-400 mb-1">Closed</p>
          <p className="text-2xl font-semibold text-slate-50">{closed}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-end mb-3">
        <button type="button" onClick={onAddReq} className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-sm font-semibold">
          + Create New Job
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Department</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-800/20 transition-colors">

                {/* Title */}
                <td className={cellCls(r.id, 'title')}>
                  {isEditing(r.id, 'title') ? (
                    <input
                      className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onBlur={() => commitEdit(r.id, 'title', editDraft)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitEdit(r.id, 'title', editDraft); } }}
                      autoFocus
                    />
                  ) : (
                    <div className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1"
                      onClick={() => startEdit(r.id, 'title', r.title ?? '')}
                    >
                      <span className="text-slate-200">{r.title || '—'}</span>
                      {isSaved(r.id, 'title') && <span className="text-emerald-400 text-xs">✓</span>}
                    </div>
                  )}
                  {isSaving(r.id, 'title') && <span className="absolute top-1 right-1 text-[10px] text-slate-500 animate-pulse">Saving…</span>}
                </td>

                <td className="p-2 text-slate-400">{r.department || '—'}</td>

                {/* Status */}
                <td className={cellCls(r.id, 'status')}>
                  {isEditing(r.id, 'status') ? (
                    <select
                      className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                      value={editDraft}
                      onChange={(e) => commitEdit(r.id, 'status', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      autoFocus
                    >
                      {REQ_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <div className="min-h-[28px] cursor-pointer rounded px-1 -mx-1 hover:bg-slate-800/50 inline-flex items-center gap-1"
                      onClick={() => startEdit(r.id, 'status', r.status ?? 'Open')}
                    >
                      <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-full text-xs">{r.status || 'Open'}</span>
                      {isSaved(r.id, 'status') && <span className="text-emerald-400 text-xs">✓</span>}
                    </div>
                  )}
                  {isSaving(r.id, 'status') && <span className="absolute top-1 right-1 text-[10px] text-slate-500 animate-pulse">Saving…</span>}
                </td>

                <td className="p-2 text-right">
                  {r.status !== 'Hired' && r.status !== 'Closed' && (
                    <button type="button" onClick={() => onOpenCloseModal(r)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-600 text-slate-200 bg-slate-900 hover:bg-slate-800"
                    >
                      Close
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">No requisitions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
