import { useEffect, useState } from 'react';
import { Plus, BarChart3, Activity, Filter } from 'lucide-react';
import { readingsApi } from '../api/readings';
import { sensorsApi } from '../api/sensors';
import { useAuth } from '../contexts/AuthContext';
import type { Reading, Sensor, CreateReadingRequest } from '../types';
import Modal from '../components/Modal';
import { ApiError } from '../api/client';

function ReadingForm({
  sensors,
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  sensors: Sensor[];
  onSubmit: (data: CreateReadingRequest) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  const [sensorId, setSensorId] = useState<number>(sensors[0]?.id ?? 0);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('C');
  const [recordedAt, setRecordedAt] = useState(
    () => new Date().toISOString().slice(0, 16)
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          sensor_id: sensorId,
          value: parseFloat(value),
          unit,
          recorded_at: new Date(recordedAt).toISOString(),
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Sensor</label>
        <select
          value={sensorId}
          onChange={(e) => setSensorId(Number(e.target.value))}
          required
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
        >
          {sensors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.location})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Value</label>
          <input
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            placeholder="e.g. 21.5"
            className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Unit</label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
            placeholder="e.g. C, %, Pa"
            className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Recorded At</label>
        <input
          type="datetime-local"
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          required
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
        />
      </div>
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 rounded-lg text-sm font-medium transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
        >
          {loading ? 'Saving...' : 'Add Reading'}
        </button>
      </div>
    </form>
  );
}

export default function ReadingsPage() {
  const { user } = useAuth();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSensorId, setFilterSensorId] = useState<number | ''>('');
  const [limit, setLimit] = useState(50);
  const [showCreate, setShowCreate] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const canCreate = user?.role === 'admin' || user?.role === 'operator';

  function loadData() {
    setLoading(true);
    Promise.all([
      readingsApi.list({
        sensor_id: filterSensorId !== '' ? filterSensorId : undefined,
        limit,
      }),
      sensorsApi.list(),
    ])
      .then(([r, s]) => {
        setReadings(r ?? []);
        setSensors(s ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [filterSensorId, limit]);

  async function handleCreate(data: CreateReadingRequest) {
    setFormLoading(true);
    setFormError('');
    try {
      await readingsApi.create(data);
      setShowCreate(false);
      loadData();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create reading');
    } finally {
      setFormLoading(false);
    }
  }

  const sensorMap = Object.fromEntries(sensors.map((s) => [s.id, s]));

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Readings</h1>
          <p className="text-slate-400 text-sm mt-0.5">{readings.length} reading{readings.length !== 1 ? 's' : ''} found</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setShowCreate(true); setFormError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Reading
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterSensorId}
            onChange={(e) => setFilterSensorId(e.target.value === '' ? '' : Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">All Sensors</option>
            {sensors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Limit:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {[20, 50, 100, 200].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Activity className="w-5 h-5 text-slate-400 animate-pulse" />
        </div>
      ) : readings.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl py-16 flex flex-col items-center gap-3">
          <BarChart3 className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 font-medium">No readings found</p>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} className="text-blue-400 hover:text-blue-300 text-sm">
              Add your first reading
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr className="text-slate-400">
                <th className="text-left px-5 py-3 font-medium">ID</th>
                <th className="text-left px-5 py-3 font-medium">Sensor</th>
                <th className="text-left px-5 py-3 font-medium">Value</th>
                <th className="text-left px-5 py-3 font-medium">Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r.id} className="border-b border-slate-700/40 last:border-0 hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3.5 text-slate-500 font-mono">#{r.id}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-white font-medium">{sensorMap[r.sensor_id]?.name ?? `Sensor #${r.sensor_id}`}</p>
                    <p className="text-slate-500 text-xs">{sensorMap[r.sensor_id]?.location}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-semibold text-cyan-400">{r.value}</span>
                    <span className="text-slate-400 ml-1 text-xs">{r.unit}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">
                    {new Date(r.recorded_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && sensors.length > 0 && (
        <Modal title="Add Reading" onClose={() => setShowCreate(false)}>
          <ReadingForm
            sensors={sensors}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            loading={formLoading}
            error={formError}
          />
        </Modal>
      )}

      {showCreate && sensors.length === 0 && (
        <Modal title="No Sensors" onClose={() => setShowCreate(false)}>
          <p className="text-slate-300 text-sm">
            You need to add at least one sensor before creating readings.
          </p>
          <button
            onClick={() => setShowCreate(false)}
            className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
          >
            OK
          </button>
        </Modal>
      )}
    </div>
  );
}
