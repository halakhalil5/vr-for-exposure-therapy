/**
 * Navbar Component
 * 
 * Top navigation bar with branding and user actions.
 */

import { useState, useEffect } from 'react';
import { FiMenu, FiBell, FiUser, FiSettings, FiActivity } from 'react-icons/fi';
import { healthAPI } from '../services/api';

const Navbar = () => {
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
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left side - Brand */}
        <div className="flex items-center space-x-4">
          <button className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            <FiMenu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <FiActivity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">VR Therapy Dashboard</h1>
              <p className="text-xs text-gray-500">Exposure Therapy Management</p>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-4">
          {/* Server Status Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-full">
            <span className={`w-2 h-2 rounded-full ${statusColors[serverStatus]}`}></span>
            <span className="text-xs text-gray-600 capitalize">
              {serverStatus === 'checking' ? 'Checking...' : serverStatus}
            </span>
          </div>

          {/* Notifications */}
          <button className="p-2 hover:bg-gray-100 rounded-lg relative">
            <FiBell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
          </button>

          {/* Settings */}
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <FiSettings className="w-5 h-5 text-gray-600" />
          </button>

          {/* User Menu */}
          <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">Dr. Therapist</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <button className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <FiUser className="w-5 h-5 text-primary-600" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
