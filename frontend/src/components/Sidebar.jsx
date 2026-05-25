/**
 * Sidebar Component
 * 
 * Side navigation with links to main application sections.
 */

import { NavLink } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiCalendar, 
  FiBox, 
  FiBarChart2,
  FiHelpCircle,
  FiVideo
} from 'react-icons/fi';

const Sidebar = ({ isOpen = false, onClose }) => {
  // Navigation items
  const navItems = [
    {
      section: 'Main',
      items: [
        { path: '/', icon: FiHome, label: 'Dashboard' },
        { path: '/patients', icon: FiUsers, label: 'Patients' },
        { path: '/sessions', icon: FiCalendar, label: 'Sessions' },
      ]
    },
    {
      section: 'VR Tools',
      items: [
        { path: '/scene-builder', icon: FiBox, label: 'Scene Builder' },
        { path: '/reports', icon: FiBarChart2, label: 'Reports' },
        { path: '/reports/files', icon: FiBarChart2, label: 'Session PDFs' },
      ]
    },
    {
      section: 'Support',
      items: [
        { path: '/help', icon: FiHelpCircle, label: 'Help & Docs' },
      ]
    }
  ];

  return (
    <aside className={`fixed left-0 top-16 bottom-0 z-40 w-72 border-r border-slate-200 bg-white/95 shadow-xl backdrop-blur transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="scrollbar-thin h-full space-y-6 overflow-y-auto p-4">
        {navItems.map((section) => (
          <div key={section.section}>
            {/* Section Header */}
            <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              {section.section}
            </h3>
            
            {/* Section Items */}
            <nav className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onClose?.()}
                  className={({ isActive }) =>
                    isActive ? 'nav-link-active' : 'nav-link'
                  }
                  end={item.path === '/'}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Quick Actions
          </h3>
          
          <NavLink
            to="/sessions/new"
            onClick={() => onClose?.()}
            className="flex items-center rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-3 text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-500 hover:to-teal-500"
          >
            <FiVideo className="w-5 h-5 mr-3" />
            <span className="font-medium">New VR Session</span>
          </NavLink>
        </div>

        {/* Unity Status Card */}
        <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Unity Status</span>
            <span className="h-2 w-2 animate-pulse rounded-full bg-warning-500"></span>
          </div>
          <p className="text-xs text-slate-600">
            Check if Unity scene builder is running to generate VR previews.
          </p>
          <button className="mt-3 text-xs font-semibold text-cyan-700 hover:text-cyan-800">
            View Connection Guide →
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
