export default function DailyExtremes({ title, rows }) {
  return (
    <div className="mt-8 pt-6 border-t border-sky-100">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-mute font-bold mb-3">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {rows.map(({ label, value, unit }) => (
          <div key={label} className="bg-sky-50/60 rounded-lg px-3 py-2 border border-sky-100">
            <p className="text-[10px] uppercase tracking-wider text-ink-mute font-semibold">{label}</p>
            <p className="text-sm font-bold text-ink mt-0.5">
              {value ?? '—'} {unit && <span className="text-[10px] font-medium text-ink-mute">{unit}</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
