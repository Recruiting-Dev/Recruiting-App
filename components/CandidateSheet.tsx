'use client';
import type React from 'react';
import { useState, useMemo, useCallback } from 'react';
import {
  STAGES, STATUS_OPTIONS, STAGE_WEIGHT,
  type Candidate, type CandidateInsert, type StageValue, type StatusValue,
  getStatusColor,
} from '@/lib/types';
import { LinkedInIcon, ResumeIcon, TrashIcon } from '@/components/icons';
import ContextMenu from '@/components/ContextMenu';

// ── Types ───────────────────────────────────────────────────────────────────

type CellKey = keyof CandidateInsert;
type CellRef = { id: string; col: CellKey };
type ContextMenuState = { x: number; y: number };

type NewRowDraft = {
  name: string;
  role: string;
  stage: StageValue;
  stage_details: string;
  status: StatusValue;
  notes: string;
  linkedin_url: string;
};

const EMPTY_DRAFT: NewRowDraft = {
  name: '',
  role: '',
  stage: 'Recruiting Screen',
  stage_details: '',
  status: 'Active',
  notes: '',
  linkedin_url: '',
};

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  candidates: Candidate[];
  onSaveCell: (id: string, field: CellKey, value: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** When provided, right-clicking the table shows an "Insert Row" option. */
  onInsertRow?: (data: Omit<CandidateInsert, 'category'>) => Promise<void>;
  /** Pre-fills the Role field in the insert row (e.g. when scoped to a specific role view). */
  defaultRole?: string;
  /** When true, the insert row opens immediately on mount. */
  initialInserting?: boolean;
  /** When provided, the Role column renders as a dropdown instead of a free-text field.
   *  Should contain only open-job role names, sorted A–Z. */
  roleOptions?: string[];
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CandidateSheet({ candidates, onSaveCell, onDelete, onInsertRow, defaultRole, initialInserting, roleOptions }: Props) {
  // Existing-row editing state
  const [editingCell, setEditingCell] = useState<CellRef | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savedCell, setSavedCell] = useState<CellRef | null>(null);
  const [savingCell, setSavingCell] = useState<CellRef | null>(null);

  // Filter state
  const [selectedStatuses, setSelectedStatuses] = useState<Set<StatusValue>>(() => new Set<StatusValue>(['Active']));
  const [filterOpen, setFilterOpen] = useState(false);

  const toggleStatus = (s: StatusValue) =>
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) { next.delete(s); } else { next.add(s); }
      return next;
    });

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Inline new-row state (insert row: adds to Supabase + optimistically updates local state)
  const [isInserting, setIsInserting] = useState(initialInserting ?? false);
  const emptyDraft = (): NewRowDraft => ({ ...EMPTY_DRAFT, role: defaultRole ?? '' });
  const [newRow, setNewRow] = useState<NewRowDraft>(emptyDraft);
  const [isSavingNew, setIsSavingNew] = useState(false);

  // ── Filtered / sorted list ─────────────────────────────────────────────

  const visibleCandidates = useMemo(() => {
    const list = candidates.filter((c) => {
      const status = (c.status ?? '') as string;
      return Array.from(selectedStatuses).some((s) => s.toLowerCase() === status.toLowerCase());
    });
    // Reverse-funnel: candidates closest to hire appear first.
    // Unknown/null stage → weight 50 (below active funnel, above Offer Declined).
    return [...list].sort(
      (a, b) =>
        (STAGE_WEIGHT[a.stage ?? ''] ?? 50) - (STAGE_WEIGHT[b.stage ?? ''] ?? 50),
    );
  }, [candidates, selectedStatuses]);

  // ── Right-click handler ────────────────────────────────────────────────

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!onInsertRow) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [onInsertRow]);

  // ── Inline new-row handlers ────────────────────────────────────────────

  const openInsertRow = () => {
    // 1. Kill the menu first so it doesn't block the UI
    setContextMenu(null); 
    // 2. Clear any active editing cells to prevent focus bugs
    setEditingCell(null); 
    // 3. Open the blue row
    setIsInserting(true);
    setNewRow(emptyDraft());
  };

  const cancelInsertRow = () => {
    setIsInserting(false);
    setNewRow(emptyDraft());
  };

  const commitInsertRow = async () => {
    if (!newRow.name.trim()) { alert('Name is required.'); return; }
    if (!onInsertRow) return;
    setIsSavingNew(true);
    try {
      await onInsertRow({
        name: newRow.name.trim(),
        role: newRow.role.trim(),
        stage: newRow.stage,
        stage_details: newRow.stage_details.trim(),
        status: newRow.status,
        notes: newRow.notes.trim(),
        linkedin_url: newRow.linkedin_url.trim(),
        resume_url: '',
      });
      setIsInserting(false);
      setNewRow(emptyDraft());
    } finally {
      setIsSavingNew(false);
    }
  };

  const setNewField = <K extends keyof NewRowDraft>(k: K, v: NewRowDraft[K]) =>
    setNewRow((prev) => ({ ...prev, [k]: v }));

  const newRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitInsertRow(); }
    if (e.key === 'Escape') cancelInsertRow();
  };

  // ── Existing-row editing ───────────────────────────────────────────────

  const startEdit = (id: string, col: CellKey, value: string) => {
    setEditingCell({ id, col });
    setEditDraft(value);
  };

  const commitEdit = async (id: string, col: CellKey, value: string) => {
    setEditingCell(null);
    setSavingCell({ id, col });
    await onSaveCell(id, col, value);
    setSavingCell(null);
    setSavedCell({ id, col });
    setTimeout(() => setSavedCell((c) => (c?.id === id && c.col === col ? null : c)), 1800);
  };

  const isEditing = (id: string, col: CellKey) => editingCell?.id === id && editingCell.col === col;
  const isSaved   = (id: string, col: CellKey) => savedCell?.id === id && savedCell.col === col;
  const isSaving  = (id: string, col: CellKey) => savingCell?.id === id && savingCell.col === col;

  const cellCls = (id: string, col: CellKey) =>
    `p-2 align-top border-l-2 relative transition-colors ${isSaved(id, col) ? 'border-green-500 bg-green-950/20' : 'border-transparent'}`;

  const displayVal = (c: Candidate, col: CellKey) => (c[col] ?? '') as string;

  // ── Cell renderers ─────────────────────────────────────────────────────

  const TextCell = ({ c, col }: { c: Candidate; col: CellKey }) => (
    <td className={cellCls(c.id, col)}>
      {isEditing(c.id, col) ? (
        <input
          className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
          value={editDraft}
          onChange={(e) => setEditDraft(e.target.value)}
          onBlur={() => commitEdit(c.id, col, editDraft)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitEdit(c.id, col, editDraft); } }}
          autoFocus
        />
      ) : (
        <div
          className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1 max-w-[200px] truncate"
          onClick={() => startEdit(c.id, col, displayVal(c, col))}
          title={displayVal(c, col) || undefined}
        >
          {displayVal(c, col) || '—'}
          {isSaved(c.id, col) && <span className="text-green-400 text-xs shrink-0">✓</span>}
        </div>
      )}
      {isSaving(c.id, col) && (
        <span className="absolute top-1 right-1 text-[10px] text-slate-500 animate-pulse">Saving…</span>
      )}
    </td>
  );

  const SelectCell = ({
    c, col, options, renderDisplay,
  }: { c: Candidate; col: CellKey; options: readonly string[]; renderDisplay?: (v: string) => React.ReactNode }) => (
    <td className={cellCls(c.id, col)}>
      {isEditing(c.id, col) ? (
        <select
          className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
          value={editDraft}
          onChange={(e) => commitEdit(c.id, col, e.target.value)}
          onBlur={() => setEditingCell(null)}
          autoFocus
        >
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <div
          className="min-h-[28px] cursor-pointer rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1"
          onClick={() => startEdit(c.id, col, displayVal(c, col))}
        >
          {renderDisplay
            ? renderDisplay(displayVal(c, col))
            : <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-full text-xs">{displayVal(c, col) || '—'}</span>}
          {isSaved(c.id, col) && <span className="text-green-400 text-xs">✓</span>}
        </div>
      )}
      {isSaving(c.id, col) && (
        <span className="absolute top-1 right-1 text-[10px] text-slate-500 animate-pulse">Saving…</span>
      )}
    </td>
  );

  const LinkedInCell = ({ c }: { c: Candidate }) => (
    <td className={`${cellCls(c.id, 'linkedin_url')} align-middle`}>
      {isEditing(c.id, 'linkedin_url') ? (
        <input
          className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
          value={editDraft}
          onChange={(e) => setEditDraft(e.target.value)}
          onBlur={() => commitEdit(c.id, 'linkedin_url', editDraft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit(c.id, 'linkedin_url', editDraft); }
            if (e.key === 'Escape') setEditingCell(null);
          }}
          placeholder="https://linkedin.com/in/..."
          autoFocus
        />
      ) : (
        <div className="flex items-center justify-center gap-1">
          {c.linkedin_url ? (
            <>
              <a
                href={c.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                title={c.linkedin_url}
              >
                <LinkedInIcon />
              </a>
              <button
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-opacity text-xs"
                onClick={() => startEdit(c.id, 'linkedin_url', c.linkedin_url ?? '')}
                title="Edit LinkedIn URL"
              >
                ✎
              </button>
            </>
          ) : (
            <button
              className="px-2 py-0.5 rounded text-slate-600 hover:text-slate-400 hover:bg-slate-800 text-xs transition-colors"
              onClick={() => startEdit(c.id, 'linkedin_url', '')}
              title="Add LinkedIn URL"
            >
              + Add
            </button>
          )}
          {c.resume_url && (
            <a href={c.resume_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800" title="Resume">
              <ResumeIcon />
            </a>
          )}
          {isSaved(c.id, 'linkedin_url') && <span className="text-green-400 text-xs">✓</span>}
        </div>
      )}
      {isSaving(c.id, 'linkedin_url') && (
        <span className="absolute top-1 right-1 text-[10px] text-slate-500 animate-pulse">Saving…</span>
      )}
    </td>
  );

  // ── Shared input style for new row ─────────────────────────────────────

  const newCellInput = 'w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors';

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div onContextMenu={handleContextMenu}>
      {contextMenu && onInsertRow && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[{ label: 'Insert Row', onClick: openInsertRow }]}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Filter bar */}
      <div className="flex justify-end mb-3">
        <div className="relative">
          {/* Dismiss overlay */}
          {filterOpen && (
            <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
          )}

          <button
            onClick={() => setFilterOpen((o) => !o)}
            className={`relative z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
              filterOpen || selectedStatuses.size !== 1 || !selectedStatuses.has('Active')
                ? 'bg-slate-700 text-slate-200'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title="Filter by status"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 5a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm3 5a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Filter
            {(selectedStatuses.size !== 1 || !selectedStatuses.has('Active')) && (
              <span className="flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 leading-none">
                {selectedStatuses.size}
              </span>
            )}
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full mt-1 z-40 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 min-w-[160px]">
              {STATUS_OPTIONS.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-700/60 cursor-pointer text-sm text-slate-200 transition-colors select-none"
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.has(s)}
                    onChange={() => toggleStatus(s)}
                    className="accent-blue-500 w-3.5 h-3.5"
                  />
                  {s}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Role</th>
              <th className="p-3">Stage</th>
              <th className="p-3">Stage Details</th>
              <th className="p-3">Status</th>
              <th className="p-3">Notes</th>
              <th className="p-3 w-20 text-center">Links</th>
              <th className="p-3 w-20" />
            </tr>
          </thead>
          <tbody>

            {/* ── Inline new row ── */}
            {isInserting && (
              <tr className="border-b border-blue-500/20 bg-blue-950/10">
                <td className="p-2">
                  <input
                    className={newCellInput + ' border-blue-500'}
                    value={newRow.name}
                    onChange={(e) => setNewField('name', e.target.value)}
                    onKeyDown={newRowKeyDown}
                    placeholder="Name *"
                    autoFocus
                  />
                </td>
                <td className="p-2">
                  {roleOptions && roleOptions.length > 0 ? (
                    <select
                      className={newCellInput}
                      value={newRow.role}
                      onChange={(e) => setNewField('role', e.target.value)}
                    >
                      <option value="">— Select role —</option>
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={newCellInput}
                      value={newRow.role}
                      onChange={(e) => setNewField('role', e.target.value)}
                      onKeyDown={newRowKeyDown}
                      placeholder="Role"
                    />
                  )}
                </td>
                <td className="p-2">
                  <select
                    className={newCellInput}
                    value={newRow.stage}
                    onChange={(e) => setNewField('stage', e.target.value as StageValue)}
                  >
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    className={newCellInput}
                    value={newRow.stage_details}
                    onChange={(e) => setNewField('stage_details', e.target.value)}
                    onKeyDown={newRowKeyDown}
                    placeholder="Details"
                  />
                </td>
                <td className="p-2">
                  <select
                    className={newCellInput}
                    value={newRow.status}
                    onChange={(e) => setNewField('status', e.target.value as StatusValue)}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    className={newCellInput}
                    value={newRow.notes}
                    onChange={(e) => setNewField('notes', e.target.value)}
                    onKeyDown={newRowKeyDown}
                    placeholder="Notes"
                  />
                </td>
                <td className="p-2">
                  <input
                    className={newCellInput}
                    value={newRow.linkedin_url}
                    onChange={(e) => setNewField('linkedin_url', e.target.value)}
                    onKeyDown={newRowKeyDown}
                    placeholder="LinkedIn URL"
                  />
                </td>
                <td className="p-2">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={commitInsertRow}
                      disabled={isSavingNew}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-emerald-400 hover:bg-emerald-950/50 disabled:opacity-40 transition-colors text-base"
                      title="Save (Enter)"
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelInsertRow}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors text-base"
                      title="Cancel (Esc)"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* ── Existing rows ── */}
            {visibleCandidates.map((c) => (
              <tr key={c.id} className="group border-t border-slate-800 hover:bg-slate-800/20 transition-colors">
                <TextCell c={c} col="name" />
                {roleOptions && roleOptions.length > 0
                  ? <SelectCell c={c} col="role" options={roleOptions} />
                  : <TextCell c={c} col="role" />}
                <SelectCell c={c} col="stage" options={STAGES} renderDisplay={(v) => (
                  <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-full text-xs">{v || 'Recruiting Screen'}</span>
                )} />
                <TextCell c={c} col="stage_details" />
                <SelectCell c={c} col="status" options={STATUS_OPTIONS as unknown as string[]} renderDisplay={(v) => (
                  <span className={`${getStatusColor(v || 'Active')} px-2 py-0.5 rounded-full text-xs`}>{v || 'Active'}</span>
                )} />
                <TextCell c={c} col="notes" />

                <LinkedInCell c={c} />

                <td className="p-2 align-middle text-center">
                  <button
                    type="button"
                    onClick={() => onDelete(c.id)}
                    className="inline-flex items-center justify-center rounded-full p-1.5 text-rose-500/70 hover:text-rose-400 hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete candidate"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}

            {!isInserting && visibleCandidates.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">No candidates.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
