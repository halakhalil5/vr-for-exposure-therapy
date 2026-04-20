/**
 * Dashboard Page
 * 
 * Main dashboard with overview stats, recent sessions,
 * and quick actions for the VR therapy system.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiUsers, 
  FiCalendar, 
  FiActivity, 
  FiTrendingUp,
  FiArrowRight,
  FiPlus,
  FiClock
} from 'react-icons/fi';
import { format } from 'date-fns';
import { patientAPI, sessionAPI, reportAPI } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        
        // Fetch data in parallel
        const [patientsRes, sessionsRes, summaryRes] = await Promise.all([
          patientAPI.getAll({ limit: 5 }),
          sessionAPI.getAll({ limit: 5 }),
          reportAPI.getSummary().catch(() => ({ data: null }))
        ]);

        setRecentSessions(sessionsRes.data || []);
        
        // Build stats
        setStats({
          totalPatients: patientsRes.pagination?.totalItems || 0,
          activePatients: summaryRes.data?.overview?.activePatients || 0,
          totalSessions: summaryRes.data?.overview?.totalSessions || 0,
          completedSessions: summaryRes.data?.overview?.completedSessions || 0,
          completionRate: summaryRes.data?.overview?.completionRate || '0%'
        });

      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // Status badge styling
  const getStatusStyle = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-600',
      scheduled: 'bg-blue-100 text-blue-600',
      'in-progress': 'bg-yellow-100 text-yellow-600',
      completed: 'bg-green-100 text-green-600',
      cancelled: 'bg-red-100 text-red-600'
    };
    return styles[status] || 'bg-gray-100 text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="card relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-100/60 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-amber-100/60 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-600">Live operational overview for therapy planning, execution, and outcomes.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/patients" className="btn-secondary flex items-center space-x-2">
            <FiUsers className="w-4 h-4" />
            <span>View Patients</span>
          </Link>
          <Link to="/sessions/new" className="btn-primary flex items-center space-x-2">
            <FiPlus className="w-4 h-4" />
            <span>New Session</span>
          </Link>
        </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Patients */}
        <div className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Patients</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {stats?.totalPatients || 0}
              </p>
              <p className="mt-2 text-xs text-success-600">
                {stats?.activePatients || 0} active
              </p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-cyan-100">
              <FiUsers className="w-6 h-6 text-cyan-700" />
            </div>
          </div>
        </div>

        {/* Total Sessions */}
        <div className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Sessions</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {stats?.totalSessions || 0}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                All time
              </p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100">
              <FiCalendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Completed Sessions */}
        <div className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {stats?.completedSessions || 0}
              </p>
              <p className="mt-2 text-xs text-success-600">
                {stats?.completionRate} completion rate
              </p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100">
              <FiActivity className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">This Week</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {recentSessions.filter(s => {
                  const sessionDate = new Date(s.date);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return sessionDate > weekAgo;
                }).length}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Sessions conducted
              </p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-100">
              <FiTrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sessions */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Sessions</h2>
            <Link 
              to="/sessions" 
              className="flex items-center space-x-1 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
            >
              <span>View all</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <FiCalendar className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-500">No sessions yet</p>
              <Link 
                to="/sessions/new" 
                className="mt-2 inline-block text-sm font-semibold text-cyan-700 hover:text-cyan-800"
              >
                Create your first session →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map(session => (
                <Link
                  key={session._id}
                  to={`/sessions/${session._id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-cyan-100 hover:bg-cyan-50/50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-100">
                      <FiActivity className="w-5 h-5 text-cyan-700" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {session.patientId?.name || 'Unknown Patient'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {session.phobia} • Intensity {session.intensity}/10
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${getStatusStyle(session.status)}`}>
                      {session.status}
                    </span>
                    <p className="mt-1 text-xs text-slate-400">
                      {format(new Date(session.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
          
          <div className="space-y-3">
            <Link
              to="/patients"
              className="group flex items-center rounded-xl border border-cyan-100 bg-cyan-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-100 transition-colors group-hover:bg-cyan-200">
                <FiUsers className="w-5 h-5 text-cyan-700" />
              </div>
              <div className="ml-4">
                <p className="font-semibold text-cyan-900">Add New Patient</p>
                <p className="text-sm text-cyan-700">Register a patient</p>
              </div>
            </Link>

            <Link
              to="/scene-builder"
              className="group flex items-center rounded-xl border border-emerald-100 bg-emerald-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-green-100 transition-colors group-hover:bg-green-200">
                <FiActivity className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="font-semibold text-green-900">Scene Builder</p>
                <p className="text-sm text-green-600">Create VR scenes</p>
              </div>
            </Link>

            <Link
              to="/reports"
              className="group flex items-center rounded-xl border border-amber-100 bg-amber-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-100 transition-colors group-hover:bg-amber-200">
                <FiTrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="font-semibold text-amber-900">View Reports</p>
                <p className="text-sm text-amber-700">Analytics & insights</p>
              </div>
            </Link>
          </div>

          {/* Unity Status */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-2 h-2 bg-warning-500 rounded-full"></span>
              <span className="text-sm font-medium text-slate-700">Unity Status</span>
            </div>
            <p className="text-xs text-slate-600">
              Ensure Unity scene builder is running to generate VR previews
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
