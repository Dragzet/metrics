import { useId } from 'react';

type ChartPoint = {
  label: string;
  value: number;
  hint?: string;
  color?: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 1,
  }).format(value);
}

function getNiceRange(points: ChartPoint[]) {
  const values = points.map((point) => point.value);
  if (values.length === 0) return { min: 0, max: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  return { min, max };
}

function buildLinePath(points: ChartPoint[], width: number, height: number, padding: number) {
  if (points.length === 0) return '';
  const { min, max } = getNiceRange(points);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = padding + (points.length === 1 ? usableWidth / 2 : (usableWidth * index) / (points.length - 1));
      const normalized = (point.value - min) / range;
      const y = padding + usableHeight - normalized * usableHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildAreaPath(points: ChartPoint[], width: number, height: number, padding: number) {
  if (points.length === 0) return '';
  const { min, max } = getNiceRange(points);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const range = max - min || 1;
  const line = points
    .map((point, index) => {
      const x = padding + (points.length === 1 ? usableWidth / 2 : (usableWidth * index) / (points.length - 1));
      const normalized = (point.value - min) / range;
      const y = padding + usableHeight - normalized * usableHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const endX = padding + (points.length === 1 ? usableWidth / 2 : usableWidth);
  const startX = padding + (points.length === 1 ? usableWidth / 2 : 0);
  const baseY = padding + usableHeight;

  return `${line} L ${endX.toFixed(1)} ${baseY.toFixed(1)} L ${startX.toFixed(1)} ${baseY.toFixed(1)} Z`;
}

export function LineChartCard({
  title,
  subtitle,
  points,
  unit,
  emptyText = 'No data to display',
}: {
  title: string;
  subtitle?: string;
  points: ChartPoint[];
  unit?: string;
  emptyText?: string;
}) {
  const width = 520;
  const height = 220;
  const padding = 24;
  const gradientId = `line-fill-${useId().replace(/:/g, '')}`;
  const { min, max } = getNiceRange(points);
  const path = buildLinePath(points, width, height, padding);
  const area = buildAreaPath(points, width, height, padding);
  const range = max - min || 1;

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-white font-medium">{title}</h3>
          {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>min: {formatNumber(min)}{unit ? ` ${unit}` : ''}</p>
          <p>max: {formatNumber(max)}{unit ? ` ${unit}` : ''}</p>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center rounded-lg border border-dashed border-slate-700/70 text-slate-500 text-sm">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-3">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px] overflow-visible">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3].map((step) => {
              const y = padding + ((height - padding * 2) * step) / 3;
              return (
                <g key={step}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={width - padding}
                    y2={y}
                    stroke="#334155"
                    strokeDasharray="4 4"
                    opacity="0.7"
                  />
                </g>
              );
            })}

            <path d={area} fill={`url(#${gradientId})`} />
            <path d={path} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {points.map((point, index) => {
              const usableWidth = width - padding * 2;
              const usableHeight = height - padding * 2;
              const x = padding + (points.length === 1 ? usableWidth / 2 : (usableWidth * index) / (points.length - 1));
              const normalized = (point.value - min) / range;
              const y = padding + usableHeight - normalized * usableHeight;
              return (
                <g key={`${point.label}-${index}`}>
                  <circle cx={x} cy={y} r="4.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                </g>
              );
            })}
          </svg>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400">
            <div className="rounded-lg bg-slate-900/50 border border-slate-700/40 px-3 py-2">
              <p className="uppercase tracking-wide text-slate-500">Last point</p>
              <p className="text-white font-medium mt-1">
                {points[points.length - 1]?.hint ?? points[points.length - 1]?.label ?? '-'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/50 border border-slate-700/40 px-3 py-2">
              <p className="uppercase tracking-wide text-slate-500">Average</p>
              <p className="text-white font-medium mt-1">
                {formatNumber(points.reduce((sum, point) => sum + point.value, 0) / points.length)}{unit ? ` ${unit}` : ''}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/50 border border-slate-700/40 px-3 py-2">
              <p className="uppercase tracking-wide text-slate-500">Points</p>
              <p className="text-white font-medium mt-1">{points.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BarChartCard({
  title,
  subtitle,
  bars,
  emptyText = 'No data to display',
}: {
  title: string;
  subtitle?: string;
  bars: ChartPoint[];
  emptyText?: string;
}) {
  const width = 520;
  const height = 220;
  const padding = 24;
  const maxValue = Math.max(...bars.map((bar) => bar.value), 0);

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <div className="mb-4">
        <h3 className="text-white font-medium">{title}</h3>
        {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
      </div>

      {bars.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center rounded-lg border border-dashed border-slate-700/70 text-slate-500 text-sm">
          {emptyText}
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px] overflow-visible">
          {[0, 1, 2, 3].map((step) => {
            const y = padding + ((height - padding * 2) * step) / 3;
            return (
              <line
                key={step}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#334155"
                strokeDasharray="4 4"
                opacity="0.7"
              />
            );
          })}

          {bars.map((bar, index) => {
            const availableWidth = width - padding * 2;
            const barWidth = availableWidth / bars.length;
            const barHeight = maxValue === 0 ? 0 : ((height - padding * 2) * bar.value) / maxValue;
            const x = padding + index * barWidth + barWidth * 0.16;
            const y = height - padding - barHeight;
            return (
              <g key={`${bar.label}-${index}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth * 0.68}
                  height={barHeight}
                  rx="10"
                  fill={bar.color ?? '#38bdf8'}
                  fillOpacity="0.8"
                />
                <text
                  x={x + (barWidth * 0.34)}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-slate-400"
                  fontSize="11"
                >
                  {bar.label}
                </text>
                <text
                  x={x + (barWidth * 0.34)}
                  y={Math.max(y - 8, 18)}
                  textAnchor="middle"
                  className="fill-white"
                  fontSize="11"
                  fontWeight="600"
                >
                  {formatNumber(bar.value)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

