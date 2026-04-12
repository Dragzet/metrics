import { Activity, LayoutDashboard, Radio, BarChart3, Users, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Page = 'dashboard' | 'sensors' | 'readings' | 'users';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: React.FC<{ className?: string }>; roles?: string[] }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sensors', label: 'Sensors', icon: Radio },
  { id: 'readings', label: 'Readings', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users, roles: ['admin'] },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();

  const roleColors = {
    admin: 'bg-blue-500/20 text-blue-300',
    operator: 'bg-emerald-500/20 text-emerald-300',
    viewer: 'bg-slate-500/20 text-slate-300',
  };

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">SensorHub</p>
            <p className="text-slate-500 text-xs mt-0.5">Monitoring Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems
          .filter((item) => !item.roles || item.roles.includes(user?.role ?? ''))
          .map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              </button>
            );
          })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="px-3 py-2.5 mb-1">
          <p className="text-white text-sm font-medium truncate">{user?.username}</p>
          <span
            className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
              roleColors[user?.role ?? 'viewer']
            }`}
          >
            {user?.role}
          </span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
