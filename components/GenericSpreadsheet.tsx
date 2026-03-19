'use client';
import { memo } from 'react';
import type React from 'react';
import { useState } from 'react';
import { TrashIcon } from '@/components/icons';
import ContextMenu from '@/components/ContextMenu';
import type { ColumnConfig } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

type Row = Record<string, string | null | undefined> & { id: string };
type CellRef = { id: string; col: string };
type ContextMenuState = { x: number; y: number };

interface Props {
  columns: ColumnConfig[];
  rows: Row[];
  onSaveCell: (id: string, field: string, value: string) => Promise<void>;
  onInsertRow: (data: Record<string, string>) => Promise<void>;
  onDeleteRow: (id: string) => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors';

const editInputCls =
  'w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200';

// ── Component ────────────────────────────────────────────────────────────────

function GenericSpreadsheetInner({ columns, rows, onSaveCell, onInsertRow, onDeleteRow }: Props) {
  // ── Existing-row edit state ──────────────────────────────────────────────

  const [editingCell, setEditingCell] = useState<CellRef | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savedCell, setSavedCell] = useState<CellRef | null>(null);
  const [savingCell, setSavingCell] = useState<CellRef | null>(null);

  // ── Context menu ─────────────────────────────────────────────────────────

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // ── Insert-row state ─────────────────────────────────────────────────────

  const makeEmptyDraft = (): Record<string, string> =>
    Object.fromEntries(
      columns.map((c) => [c.key, c.type === 'select' && c.options ? c.options[0] : ''])
    );

  const [isInserting, setIsInserting] = useState(false);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [newRow, setNewRow] = useState<Record<string, string>>(makeEmptyDraft);

  const openInsertRow = () => {
    setContextMenu(null);
    setEditingCell(null);
    setIsInserting(true);
    setNewRow(makeEmptyDraft());
  };

  const cancelInsertRow = () => {
    setIsInserting(false);
    setNewRow(makeEmptyDraft());
  };

  const commitInsertRow = async () => {
    const firstCol = columns[0];
    if (firstCol && !newRow[firstCol.key]?.trim()) {
      alert(`${firstCol.label} is required.`);
      return;
    }
    setIsSavingNew(true);
    try {
      await onInsertRow(
        Object.fromEntries(columns.map((c) => [c.key, newRow[c.key]?.trim() ?? '']))
      );
      setIsInserting(false);
      setNewRow(makeEmptyDraft());
    } finally {
      setIsSavingNew(false);
    }
  };

  const newRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitInsertRow(); }
    if (e.key === 'Escape') cancelInsertRow();
  };

  // ── Existing-row editing ─────────────────────────────────────────────────

  const startEdit = (id: string, col: string, value: string) => {
    setEditingCell({ id, col });
    setEditDraft(value);
  };

  const commitEdit = async (id: string, col: string, value: string) => {
    setEditingCell(null);
    setSavingCell({ id, col });
    await onSaveCell(id, col, value);
    setSavingCell(null);
    setSavedCell({ id, col });
    setTimeout(() => setSavedCell((c) => (c?.id === id && c.col === col ? null : c)), 1800);
  };

  const isEditing = (id: string, col: string) => editingCell?.id === id && editingCell.col === col;
  const isSaved   = (id: string, col: string) => savedCell?.id === id && savedCell.col === col;
  const isSaving  = (id: string, col: string) => savingCell?.id === id && savingCell.col === col;

  const cellCls = (id: string, col: string) =>
    `p-2 align-top border-l-2 relative transition-colors ${
      isSaved(id, col) ? 'border-green-500 bg-green-950/20' : 'border-transparent'
    }`;

  const displayVal = (row: Row, col: string) => (row[col] ?? '') as string;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div onContextMenu={handleContextMenu}>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[{ label: 'Insert Row', onClick: openInsertRow }]}
          onClose={() => setContextMenu(null)}
        />
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wide">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="p-3">{col.label}</th>
              ))}
              <th className="p-3 w-12" />
            </tr>
          </thead>

          <tbody>
            {/* ── Inline insert row ── */}
            {isInserting && (
              <tr className="border-b border-blue-500/20 bg-blue-950/10">
                {columns.map((col, i) => (
                  <td key={col.key} className="p-2">
                    {col.type === 'select' && col.options ? (
                      <select
                        className={inputCls}
                        value={newRow[col.key] ?? ''}
                        onChange={(e) =>
                          setNewRow((prev) => ({ ...prev, [col.key]: e.target.value }))
                        }
                      >
                        <option value="">—</option>
                        {col.options.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={`${inputCls}${i === 0 ? ' border-blue-500' : ''}`}
                        value={newRow[col.key] ?? ''}
                        onChange={(e) =>
                          setNewRow((prev) => ({ ...prev, [col.key]: e.target.value }))
                        }
                        onKeyDown={newRowKeyDown}
                        placeholder={i === 0 ? `${col.label} *` : col.label}
                        autoFocus={i === 0}
                      />
                    )}
                  </td>
                ))}
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
            {rows.map((row) => (
              <tr key={row.id} className="group border-t border-slate-800 hover:bg-slate-800/20 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={cellCls(row.id, col.key)}>
                    {col.type === 'select' && col.options ? (
                      isEditing(row.id, col.key) ? (
                        <select
                          className={editInputCls}
                          value={editDraft}
                          onChange={(e) => commitEdit(row.id, col.key, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                        >
                          <option value="">—</option>
                          {col.options.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <div
                          className="min-h-[28px] cursor-pointer rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1"
                          onClick={() => startEdit(row.id, col.key, displayVal(row, col.key))}
                        >
                          <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-full text-xs">
                            {displayVal(row, col.key) || '—'}
                          </span>
                          {isSaved(row.id, col.key) && (
                            <span className="text-green-400 text-xs">✓</span>
                          )}
                        </div>
                      )
                    ) : (
                      isEditing(row.id, col.key) ? (
                        <input
                          className={editInputCls}
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onBlur={() => commitEdit(row.id, col.key, editDraft)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitEdit(row.id, col.key, editDraft); }
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <div
                          className="min-h-[28px] cursor-text rounded px-1 -mx-1 hover:bg-slate-800/50 flex items-center gap-1 max-w-[200px] truncate"
                          onClick={() => startEdit(row.id, col.key, displayVal(row, col.key))}
                          title={displayVal(row, col.key) || undefined}
                        >
                          {displayVal(row, col.key) || '—'}
                          {isSaved(row.id, col.key) && (
                            <span className="text-green-400 text-xs shrink-0">✓</span>
                          )}
                        </div>
                      )
                    )}

                    {isSaving(row.id, col.key) && (
                      <span className="absolute top-1 right-1 text-[10px] text-slate-500 animate-pulse">
                        Saving…
                      </span>
                    )}
                  </td>
                ))}

                <td className="p-2 align-middle text-center">
                  <button
                    type="button"
                    onClick={() => onDeleteRow(row.id)}
                    className="inline-flex items-center justify-center rounded-full p-1.5 text-rose-500/70 hover:text-rose-400 hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete row"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}

            {!isInserting && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="p-8 text-center text-slate-500"
                >
                  No rows yet. Right-click anywhere to insert a row.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// memo prevents re-renders when a parent state change doesn't affect
// columns, rows, or the (useCallback-stabilised) handler refs.
export default memo(GenericSpreadsheetInner) as typeof GenericSpreadsheetInner;
