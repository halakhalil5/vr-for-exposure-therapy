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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome to VR Therapy Dashboard</p>
        </div>
        <div className="flex space-x-3">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Patients */}
        <div className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Patients</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.totalPatients || 0}
              </p>
              <p className="text-xs text-success-600 mt-2">
                {stats?.activePatients || 0} active
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Total Sessions */}
        <div className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.totalSessions || 0}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                All time
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <FiCalendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Completed Sessions */}
        <div className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.completedSessions || 0}
              </p>
              <p className="text-xs text-success-600 mt-2">
                {stats?.completionRate} completion rate
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FiActivity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">This Week</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {recentSessions.filter(s => {
                  const sessionDate = new Date(s.date);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return sessionDate > weekAgo;
                }).length}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Sessions conducted
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
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
            <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
            <Link 
              to="/sessions" 
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
            >
              <span>View all</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <FiCalendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No sessions yet</p>
              <Link 
                to="/sessions/new" 
                className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
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
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg 
                             hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FiActivity className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {session.patientId?.name || 'Unknown Patient'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {session.phobia} • Intensity {session.intensity}/10
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${getStatusStyle(session.status)}`}>
                      {session.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          
          <div className="space-y-3">
            <Link
              to="/patients"
              className="flex items-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 
                         transition-colors group"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center 
                              group-hover:bg-primary-200 transition-colors">
                <FiUsers className="w-5 h-5 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="font-medium text-primary-900">Add New Patient</p>
                <p className="text-sm text-primary-600">Register a patient</p>
              </div>
            </Link>

            <Link
              to="/scene-builder"
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 
                         transition-colors group"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center 
                              group-hover:bg-green-200 transition-colors">
                <FiActivity className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="font-medium text-green-900">Scene Builder</p>
                <p className="text-sm text-green-600">Create VR scenes</p>
              </div>
            </Link>

            <Link
              to="/reports"
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 
                         transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center 
                              group-hover:bg-purple-200 transition-colors">
                <FiTrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="font-medium text-purple-900">View Reports</p>
                <p className="text-sm text-purple-600">Analytics & insights</p>
              </div>
            </Link>
          </div>

          {/* Unity Status */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-2 h-2 bg-warning-500 rounded-full"></span>
              <span className="text-sm font-medium text-gray-700">Unity Status</span>
            </div>
            <p className="text-xs text-gray-500">
              Ensure Unity scene builder is running to generate VR previews
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
