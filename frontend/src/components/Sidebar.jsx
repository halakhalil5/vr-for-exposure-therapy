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

const Sidebar = () => {
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
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 space-y-6">
        {navItems.map((section) => (
          <div key={section.section}>
            {/* Section Header */}
            <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {section.section}
            </h3>
            
            {/* Section Items */}
            <nav className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
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
          <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Quick Actions
          </h3>
          
          <NavLink
            to="/sessions/new"
            className="flex items-center px-4 py-3 bg-primary-600 text-white rounded-lg 
                       hover:bg-primary-700 transition-colors duration-200"
          >
            <FiVideo className="w-5 h-5 mr-3" />
            <span className="font-medium">New VR Session</span>
          </NavLink>
        </div>

        {/* Unity Status Card */}
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Unity Status</span>
            <span className="w-2 h-2 bg-warning-500 rounded-full"></span>
          </div>
          <p className="text-xs text-gray-500">
            Check if Unity scene builder is running to generate VR previews.
          </p>
          <button className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium">
            View Connection Guide →
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
