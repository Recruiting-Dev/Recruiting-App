'use client';
import type { UserPermissions } from '@/lib/types';

interface Props {
  onSelect: (category: 'commercial' | 'non-commercial') => void;
  onJobsClick: () => void;
  permissions: UserPermissions;
}

const TILE_CLS =
  'w-56 h-40 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.2)] text-slate-100 font-semibold text-xl transition-all duration-150 px-4 text-center';

export default function LandingScreen({ onSelect, onJobsClick, permissions }: Props) {
  const { role, allowedCategories } = permissions;
  const isAdmin = role === 'admin';
  const showCommercial    = allowedCategories.includes('Commercial');
  const showNonCommercial = allowedCategories.includes('Non-Commercial');
  const bothVisible       = showCommercial && showNonCommercial;

  // Label for each tile: admins see category names, others see personalised labels.
  const commercialLabel    = isAdmin ? 'Commercial'     : (bothVisible ? 'Your Commercial Pipeline'     : 'Your Candidate Pipeline');
  const nonCommercialLabel = isAdmin ? 'Non-Commercial' : 'Your Non-Commercial Pipeline';

  return (
    <div className="relative min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <div className="absolute top-10 right-16">
        <button
          onClick={onJobsClick}
          className="px-8 py-3.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-blue-500 text-slate-200 text-base font-semibold shadow-md hover:shadow-lg hover:scale-[1.03] transition-all duration-200"
        >
          Jobs
        </button>
      </div>

      <h1 className="text-4xl font-bold text-slate-100 mb-2">Recruiting</h1>
      {isAdmin && <p className="text-slate-500 text-sm mb-8">Select a pipeline to continue</p>}

      {/* ── No categories assigned ── */}
      {!showCommercial && !showNonCommercial ? (
        <p className="text-slate-500 text-sm text-center max-w-xs mt-4">
          Welcome! You haven&apos;t been assigned to any active pipelines yet.
          Please contact your Admin.
        </p>
      ) : (
        <div className={`flex justify-center gap-6${isAdmin ? '' : ' mt-4'}`}>
          {showCommercial && (
            <button onClick={() => onSelect('commercial')} className={TILE_CLS}>
              {commercialLabel}
            </button>
          )}
          {showNonCommercial && (
            <button onClick={() => onSelect('non-commercial')} className={TILE_CLS}>
              {nonCommercialLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
