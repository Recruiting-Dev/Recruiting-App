'use client';

interface Props {
  onSelect: (category: 'commercial' | 'non-commercial') => void;
}

export default function LandingScreen({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-slate-100 mb-2">Recruiting</h1>
      <p className="text-slate-500 text-sm mb-8">Select a pipeline to continue</p>
      <div className="flex gap-6">
        <button
          onClick={() => onSelect('commercial')}
          className="w-56 h-40 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.2)] text-slate-100 font-semibold text-xl transition-all duration-150"
        >
          Commercial
        </button>
        <button
          onClick={() => onSelect('non-commercial')}
          className="w-56 h-40 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.2)] text-slate-100 font-semibold text-xl transition-all duration-150"
        >
          Non-Commercial
        </button>
      </div>
    </div>
  );
}
