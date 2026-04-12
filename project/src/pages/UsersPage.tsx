import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Activity } from 'lucide-react';
import { usersApi } from '../api/users';
import { useAuth } from '../contexts/AuthContext';
import type { User, CreateUserRequest } from '../types';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { ApiError } from '../api/client';

const roleOptions = ['admin', 'operator', 'viewer'] as const;

function CreateUserForm({
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  onSubmit: (data: CreateUserRequest) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'operator' | 'viewer'>('viewer');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ username, password, role });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="Enter username"
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Password <span className="text-slate-500 font-normal">(min 6 chars)</span>
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="Enter password"
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
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
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

function EditRoleModal({
  targetUser,
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  targetUser: User;
  onSubmit: (role: 'admin' | 'operator' | 'viewer') => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  const [role, setRole] = useState<'admin' | 'operator' | 'viewer'>(targetUser.role);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(role);
      }}
      className="space-y-4"
    >
      <p className="text-slate-300 text-sm">
        Change role for <span className="text-white font-medium">{targetUser.username}</span>
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all"
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
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
          {loading ? 'Saving...' : 'Update Role'}
        </button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  function loadUsers() {
    setLoading(true);
    usersApi
      .list()
      .then((data) => setUsers(data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(data: CreateUserRequest) {
    setFormLoading(true);
    setFormError('');
    try {
      await usersApi.create(data);
      setShowCreate(false);
      loadUsers();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEditRole(role: 'admin' | 'operator' | 'viewer') {
    if (!editUser) return;
    setFormLoading(true);
    setFormError('');
    try {
      await usersApi.updateRole(editUser.id, { role });
      setEditUser(null);
      loadUsers();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update role');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      await usersApi.delete(deleteUser.id);
      setDeleteUser(null);
      loadUsers();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Users</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setFormError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Activity className="w-5 h-5 text-slate-400 animate-pulse" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl py-16 flex flex-col items-center gap-3">
          <Users className="w-10 h-10 text-slate-600" />
          <p className="text-slate-400 font-medium">No users found</p>
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr className="text-slate-400">
                <th className="text-left px-5 py-3 font-medium">ID</th>
                <th className="text-left px-5 py-3 font-medium">Username</th>
                <th className="text-left px-5 py-3 font-medium">Role</th>
                <th className="text-left px-5 py-3 font-medium">Created</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="border-b border-slate-700/40 last:border-0 hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 font-mono">#{u.id}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{u.username}</span>
                        {isSelf && (
                          <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">you</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={u.role} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditUser(u); setFormError(''); }}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                          title="Edit role"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteUser(u)}
                          disabled={isSelf}
                          title={isSelf ? 'Cannot delete yourself' : 'Delete user'}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <Modal title="Create User" onClose={() => setShowCreate(false)}>
          <CreateUserForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            loading={formLoading}
            error={formError}
          />
        </Modal>
      )}

      {editUser && (
        <Modal title="Edit User Role" onClose={() => setEditUser(null)}>
          <EditRoleModal
            targetUser={editUser}
            onSubmit={handleEditRole}
            onCancel={() => setEditUser(null)}
            loading={formLoading}
            error={formError}
          />
        </Modal>
      )}

      {deleteUser && (
        <Modal title="Delete User" onClose={() => setDeleteUser(null)}>
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">{deleteUser.username}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUser(null)}
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
