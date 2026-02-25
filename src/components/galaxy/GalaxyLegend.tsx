export function GalaxyLegend() {
  return (
    <div className="flex flex-wrap gap-6 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-slate-500" />
        <span className="text-slate-700">Learning (0-30%)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-amber-500" />
        <span className="text-slate-700">Developing (30-70%)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />
        <span className="text-slate-700">Mastered (70-100%)</span>
      </div>
    </div>
  );
}
