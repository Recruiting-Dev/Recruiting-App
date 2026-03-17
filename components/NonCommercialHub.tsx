'use client';
import type React from 'react';
import { useState, useMemo, useCallback } from 'react';
import type { Candidate, CandidateInsert } from '@/lib/types';
import CandidateSheet from '@/components/CandidateSheet';
import ContextMenu from '@/components/ContextMenu';

interface Props {
  candidates: Candidate[];
  selectedRole: string | null;
  onSelectRole: (role: string | null) => void;
  onSaveCell: (id: string, field: keyof CandidateInsert, value: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onInsertRow?: (data: Omit<CandidateInsert, 'category'>) => Promise<void>;
  onGoHome: () => void;
}

export default function NonCommercialHub({
  candidates, selectedRole, onSelectRole, onSaveCell, onDelete, onInsertRow, onGoHome,
}: Props) {
  // Context menu state — only used in the role-grid / empty-state view.
  // CandidateSheet owns its own context menu when a role is selected.
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // When true, renders a pre-opened CandidateSheet below the role grid for inserting
  // a candidate without navigating into a specific role first.
  const [showInsertSheet, setShowInsertSheet] = useState(false);

  const roles = useMemo(() =>
    Array.from(new Set(
      candidates.map((c) => c.role?.trim()).filter(Boolean) as string[]
    )).sort(),
    [candidates],
  );

  const roleCandidates = useMemo(() =>
    selectedRole ? candidates.filter((c) => c.role?.trim() === selectedRole) : [],
    [candidates, selectedRole],
  );

  // Only fires in the role-grid view. CandidateSheet handles right-click when a role is selected.
  const handleGridContextMenu = useCallback((e: React.MouseEvent) => {
    if (!onInsertRow || showInsertSheet) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [onInsertRow, showInsertSheet]);

  const openInsertSheet = () => {
    setContextMenu(null);
    setShowInsertSheet(true);
  };

  // ── Role-detail view ───────────────────────────────────────────────────────

  if (selectedRole) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onGoHome}
            className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            ← Home
          </button>
          <span className="text-slate-600 text-sm">/</span>
          <button
            onClick={() => onSelectRole(null)}
            className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            Non-Commercial
          </button>
          <span className="text-slate-600 text-sm">/</span>
          <span className="text-slate-200 text-sm font-medium">{selectedRole}</span>
        </div>
        <CandidateSheet
          candidates={roleCandidates}
          onSaveCell={onSaveCell}
          onDelete={onDelete}
          onInsertRow={onInsertRow}
          defaultRole={selectedRole}
        />
      </div>
    );
  }

  // ── Role-grid / empty-state view ───────────────────────────────────────────

  return (
    <div onContextMenu={handleGridContextMenu} className="min-h-[60vh]">
      {contextMenu && onInsertRow && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[{ label: 'Insert Row', onClick: openInsertSheet }]}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* ── Toolbar ── */}
      {onInsertRow && (
        <div className="flex justify-end mb-4">
          <button
            onClick={openInsertSheet}
            disabled={showInsertSheet}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            + Add New Candidate
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {roles.length === 0 && !showInsertSheet && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-slate-500 text-sm">No non-commercial candidates yet. Use the button above to add the first one.</p>
        </div>
      )}

      {/* ── Role grid ── */}
      {roles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {roles.map((role) => {
            const count = candidates.filter((c) => c.role?.trim() === role).length;
            return (
              <button
                key={role}
                onClick={() => onSelectRole(role)}
                className="p-6 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.15)] text-left transition-all duration-150"
              >
                <p className="text-slate-100 font-semibold text-base mb-1">{role}</p>
                <p className="text-slate-500 text-xs">{count} candidate{count !== 1 ? 's' : ''}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Insert sheet (shown after "Insert Row" from context menu or "+ Add First Candidate") ── */}
      {showInsertSheet && onInsertRow && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-400">New candidate — fill in the row below and press Enter to save</p>
            <button
              onClick={() => setShowInsertSheet(false)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ✕ Cancel
            </button>
          </div>
          <CandidateSheet
            candidates={[]}
            onSaveCell={() => Promise.resolve()}
            onDelete={() => Promise.resolve()}
            onInsertRow={async (data) => {
              await onInsertRow(data);
              setShowInsertSheet(false);
            }}
            initialInserting
          />
        </div>
      )}
    </div>
  );
}
