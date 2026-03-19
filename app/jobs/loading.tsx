// Shown immediately when navigating to /jobs while the page resolves.

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <div className="h-10 w-20 bg-slate-800 rounded animate-pulse mb-4" />
      <div className="h-4 w-48 bg-slate-800/60 rounded animate-pulse mb-6" />
      <div className="flex gap-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-56 h-40 rounded-2xl border border-slate-800 bg-slate-900 animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
