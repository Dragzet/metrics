import { useEffect, useMemo, useState } from 'react';
import { Radio, BarChart3, Activity, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { sensorsApi } from '../api/sensors';
import { readingsApi } from '../api/readings';
import type { Sensor, Reading } from '../types';
import { BarChartCard, LineChartCard } from '../components/Charts';

export default function DashboardPage() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [recentReadings, setRecentReadings] = useState<Reading[]>([]);
  const [sensorTrendReadings, setSensorTrendReadings] = useState<Reading[]>([]);
  const [chartSensorId, setChartSensorId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    Promise.all([sensorsApi.list(), readingsApi.list({ limit: 20 })])
      .then(([s, r]) => {
        const nextSensors = s ?? [];
        setSensors(nextSensors);
        setRecentReadings(r ?? []);
        setChartSensorId((current) => {
          if (current !== '' && nextSensors.some((sensor) => sensor.id === current)) {
            return current;
          }
          return nextSensors[0]?.id ?? '';
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (chartSensorId === '') {
      setChartLoading(false);
      setSensorTrendReadings([]);
      return;
    }

    setChartLoading(true);
    readingsApi
      .list({ sensor_id: chartSensorId, limit: 12 })
      .then((data) => setSensorTrendReadings(data ?? []))
      .finally(() => setChartLoading(false));
  }, [chartSensorId]);

  const activeSensors = sensors.filter((s) => s.status === 'active').length;
  const maintenanceSensors = sensors.filter((s) => s.status === 'maintenance').length;
  const inactiveSensors = sensors.filter((s) => s.status === 'inactive').length;
  const sensorMap = useMemo(() => Object.fromEntries(sensors.map((sensor) => [sensor.id, sensor])), [sensors]);
  const chartSensor = chartSensorId !== '' ? sensorMap[chartSensorId] : undefined;
  const chartPoints = useMemo(
    () =>
      [...sensorTrendReadings]
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
        .map((reading) => ({
          label: new Date(reading.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hint: new Date(reading.recorded_at).toLocaleString(),
          value: reading.value,
        })),
    [sensorTrendReadings]
  );
  const activityBars = useMemo(() => {
    const counts = new Map<number, number>();
    for (const reading of recentReadings) {
      counts.set(reading.sensor_id, (counts.get(reading.sensor_id) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([sensorId, count], index) => ({
        label: sensorMap[sensorId]?.name ?? `Sensor #${sensorId}`,
        value: count,
        color: ['#38bdf8', '#22c55e', '#f59e0b', '#a78bfa', '#f97316', '#64748b'][index % 6],
      }));
  }, [recentReadings, sensorMap]);

  const stats = [
    {
      label: 'Total Sensors',
      value: sensors.length,
      icon: Radio,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Active Sensors',
      value: activeSensors,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Maintenance',
      value: maintenanceSensors,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Recent Readings',
      value: recentReadings.length,
      icon: BarChart3,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Activity className="w-5 h-5 animate-pulse" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">System overview and recent activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border ${stat.bg} mb-3`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-400 text-sm mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-white font-medium">Reading Trend</h2>
              <p className="text-slate-400 text-sm mt-0.5">Line chart for the selected sensor</p>
            </div>
            <div className="min-w-[220px]">
              <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Sensor for chart</label>
              <select
                value={chartSensorId}
                onChange={(e) => setChartSensorId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {sensors.map((sensor) => (
                  <option key={sensor.id} value={sensor.id}>
                    {sensor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {chartLoading ? (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 h-[320px] flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-400">
                <Activity className="w-5 h-5 animate-pulse" />
                <span className="text-sm">Loading chart...</span>
              </div>
            </div>
          ) : (
            <LineChartCard
              title={chartSensor ? `Trend: ${chartSensor.name}` : 'Trend'}
              subtitle="Latest readings ordered by time"
              points={chartPoints}
              unit={sensorTrendReadings[0]?.unit}
              emptyText="No readings for the selected sensor"
            />
          )}
        </div>

        <BarChartCard
          title="Recent Activity by Sensor"
          subtitle="How many readings are present in the latest feed"
          bars={activityBars}
          emptyText="No recent readings yet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <h2 className="text-white font-medium mb-4 flex items-center gap-2">
            <Radio className="w-4 h-4 text-slate-400" />
            Sensor Status
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Active', count: activeSensors, total: sensors.length, color: 'bg-emerald-500' },
              { label: 'Maintenance', count: maintenanceSensors, total: sensors.length, color: 'bg-amber-500' },
              { label: 'Inactive', count: inactiveSensors, total: sensors.length, color: 'bg-slate-600' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="text-slate-400">{item.count} / {item.total}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: item.total ? `${(item.count / item.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <h2 className="text-white font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            Recent Readings
          </h2>
          {recentReadings.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No readings yet</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-auto">
              {recentReadings.slice(0, 8).map((r) => {
                const sensor = sensors.find((s) => s.id === r.sensor_id);
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {sensor?.name ?? `Sensor #${r.sensor_id}`}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {new Date(r.recorded_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-cyan-400 font-mono font-semibold text-sm">
                      {r.value} {r.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <h2 className="text-white font-medium mb-4 flex items-center gap-2">
          <Radio className="w-4 h-4 text-slate-400" />
          All Sensors
        </h2>
        {sensors.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">No sensors configured</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2 pr-4 font-medium">Name</th>
                  <th className="text-left py-2 pr-4 font-medium">Location</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sensors.map((sensor) => (
                  <tr key={sensor.id} className="border-b border-slate-700/40 last:border-0">
                    <td className="py-2.5 pr-4 text-white font-medium">{sensor.name}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{sensor.location}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                          sensor.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : sensor.status === 'maintenance'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-slate-500/15 text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            sensor.status === 'active'
                              ? 'bg-emerald-400'
                              : sensor.status === 'maintenance'
                              ? 'bg-amber-400'
                              : 'bg-slate-500'
                          }`}
                        />
                        {sensor.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
