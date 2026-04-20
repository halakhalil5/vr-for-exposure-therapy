/**
 * Navbar Component
 * 
 * Top navigation bar with branding and user actions.
 */

import { useState, useEffect } from 'react';
import { FiMenu, FiBell, FiUser, FiSettings, FiActivity } from 'react-icons/fi';
import { healthAPI } from '../services/api';

const Navbar = ({ onToggleSidebar }) => {
  const [serverStatus, setServerStatus] = useState('checking');

  // Check server health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await healthAPI.check();
        setServerStatus(health.status === 'healthy' ? 'connected' : 'error');
      } catch (error) {
        setServerStatus('disconnected');
      }
    };

    checkHealth();
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusColors = {
    checking: 'bg-gray-400',
    connected: 'bg-success-500',
    disconnected: 'bg-danger-500',
    error: 'bg-warning-500'
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/60 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side - Brand */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <FiMenu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30">
              <FiActivity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-900 sm:text-lg">VR Therapy Dashboard</h1>
              <p className="text-[11px] text-slate-500 sm:text-xs">Exposure Therapy Management</p>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Server Status Indicator */}
          <div className="hidden items-center space-x-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm sm:flex">
            <span className={`h-2 w-2 rounded-full ${statusColors[serverStatus]}`}></span>
            <span className="text-slate-600 capitalize">
              {serverStatus === 'checking' ? 'Checking...' : serverStatus}
            </span>
          </div>

          {/* Notifications */}
          <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            <FiBell className="w-5 h-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger-500"></span>
          </button>

          {/* Settings */}
          <button className="hidden rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:block">
            <FiSettings className="w-5 h-5" />
          </button>

          {/* User Menu */}
          <div className="flex items-center space-x-3 border-l border-slate-200 pl-2 sm:pl-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">Dr. Therapist</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-cyan-100 ring-2 ring-white shadow">
              <FiUser className="w-5 h-5 text-cyan-700" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
