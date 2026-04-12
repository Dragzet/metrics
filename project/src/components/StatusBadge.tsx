interface StatusBadgeProps {
  status: string;
}

const config: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  maintenance: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  admin: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  operator: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  viewer: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = config[status] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
      {status}
    </span>
  );
}
