/**
 * Layout Component
 * 
 * Main application layout with sidebar navigation and content area.
 */

import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen app-shell">
      {/* Top Navigation Bar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />
      
      <div className="relative flex">
        {/* Sidebar Navigation */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-[1px] lg:hidden"
          />
        )}
        
        {/* Main Content Area */}
        <main className="flex-1 pt-20 px-4 pb-8 sm:px-6 lg:px-8 lg:ml-72">
          <div className="mx-auto max-w-7xl animate-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
