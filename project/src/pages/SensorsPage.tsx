import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Radio, Activity } from 'lucide-react';
import { sensorsApi } from '../api/sensors';
import { useAuth } from '../contexts/AuthContext';
import type { Sensor, CreateSensorRequest, UpdateSensorRequest } from '../types';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { ApiError } from '../api/client';

const statusOptions = ['active', 'inactive', 'maintenance'] as const;

function SensorForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  initial?: Sensor;
  onSubmit: (data: CreateSensorRequest) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [status, setStatus] = useState<'active' | 'inactive' | 'maintenance'>(
    initial?.status ?? 'active'
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, location, status });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Temperature Sensor #1"
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Location</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          placeholder="e.g. Zone A"
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
          {loading ? 'Saving...' : initial ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

export default function SensorsPage() {
  const { user } = useAuth();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editSensor, setEditSensor] = useState<Sensor | null>(null);
  const [deleteSensor, setDeleteSensor] = useState<Sensor | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'operator';
  const canDelete = user?.role === 'admin';

  function loadSensors() {
    setLoading(true);
    sensorsApi
      .list()
      .then((data) => setSensors(data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSensors();
  }, []);

  async function handleCreate(data: CreateSensorRequest) {
    setFormLoading(true);
    setFormError('');
    try {
      await sensorsApi.create(data);
      setShowCreate(false);
      loadSensors();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create sensor');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdate(data: UpdateSensorRequest) {
    if (!editSensor) return;
    setFormLoading(true);
    setFormError('');
    try {
      await sensorsApi.update(editSensor.id, data);
      setEditSensor(null);
      loadSensors();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update sensor');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteSensor) return;
    setDeleteLoading(true);
    try {
      await sensorsApi.delete(deleteSensor.id);
      setDeleteSensor(null);
      loadSensors();
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Sensors</h1>
          <p className="text-slate-400 text-sm mt-0.5">{sensors.length} sensor{sensors.length !== 1 ? 's' : ''} configured</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setShowCreate(true); setFormError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Sensor
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Activity className="w-5 h-5 text-slate-400 animate-pulse" />
        </div>
      ) : sensors.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl py-16 flex flex-col items-center gap-3">
          <Radio className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 font-medium">No sensors yet</p>
          {canEdit && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Add your first sensor
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr className="text-slate-400">
                <th className="text-left px-5 py-3 font-medium">ID</th>
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Location</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Created</th>
                {(canEdit || canDelete) && (
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sensors.map((sensor) => (
                <tr key={sensor.id} className="border-b border-slate-700/40 last:border-0 hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3.5 text-slate-500 font-mono">#{sensor.id}</td>
                  <td className="px-5 py-3.5 text-white font-medium">{sensor.name}</td>
                  <td className="px-5 py-3.5 text-slate-300">{sensor.location}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={sensor.status} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">
                    {new Date(sensor.created_at).toLocaleDateString()}
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            onClick={() => { setEditSensor(sensor); setFormError(''); }}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteSensor(sensor)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <Modal title="Add Sensor" onClose={() => setShowCreate(false)}>
          <SensorForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            loading={formLoading}
            error={formError}
          />
        </Modal>
      )}

      {editSensor && (
        <Modal title="Edit Sensor" onClose={() => setEditSensor(null)}>
          <SensorForm
            initial={editSensor}
            onSubmit={handleUpdate}
            onCancel={() => setEditSensor(null)}
            loading={formLoading}
            error={formError}
          />
        </Modal>
      )}

      {deleteSensor && (
        <Modal title="Delete Sensor" onClose={() => setDeleteSensor(null)}>
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">{deleteSensor.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteSensor(null)}
                className="flex-1 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
