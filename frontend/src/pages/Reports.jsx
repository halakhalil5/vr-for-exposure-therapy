/**
 * Reports Page
 * 
 * View analytics and generate reports for therapy sessions.
 */

import { useState, useEffect } from 'react';
import { 
  FiDownload, 
  FiFilter,
  FiUsers,
  FiActivity,
  FiTrendingUp,
  FiCalendar
} from 'react-icons/fi';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { reportAPI, patientAPI } from '../services/api';

const Reports = () => {
  const [summary, setSummary] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patientReport, setPatientReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load summary data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [summaryRes, patientsRes] = await Promise.all([
          reportAPI.getSummary(),
          patientAPI.getAll()
        ]);
        setSummary(summaryRes.data);
        setPatients(patientsRes.data || []);
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Load patient report when selected
  useEffect(() => {
    if (selectedPatient) {
      const loadPatientReport = async () => {
        try {
          const response = await reportAPI.getPatientReport(selectedPatient);
          setPatientReport(response.data);
        } catch (error) {
          console.error('Error loading patient report:', error);
        }
      };
      loadPatientReport();
    } else {
      setPatientReport(null);
    }
  }, [selectedPatient]);

  // Chart colors
  const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Mock data for charts (would come from API in production)
  const sessionTrends = [
    { month: 'Jan', sessions: 12 },
    { month: 'Feb', sessions: 19 },
    { month: 'Mar', sessions: 15 },
    { month: 'Apr', sessions: 22 },
    { month: 'May', sessions: 28 },
    { month: 'Jun', sessions: 25 }
  ];

  const phobiaDistribution = [
    { name: 'Arachnophobia', value: 35 },
    { name: 'Acrophobia', value: 25 },
    { name: 'Social Anxiety', value: 20 },
    { name: 'Claustrophobia', value: 12 },
    { name: 'Other', value: 8 }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">
            View therapy statistics and generate reports
          </p>
        </div>

        <button className="btn-secondary flex items-center space-x-2">
          <FiDownload className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-100 rounded-lg">
              <FiUsers className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Patients</p>
              <p className="text-2xl font-bold">{summary?.totalPatients || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <FiActivity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sessions</p>
              <p className="text-2xl font-bold">{summary?.totalSessions || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FiTrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completion Rate</p>
              <p className="text-2xl font-bold">{summary?.completionRate || 0}%</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FiCalendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-2xl font-bold">{summary?.sessionsThisMonth || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Trends */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Session Trends
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sessionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Phobia Distribution */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Phobia Distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={phobiaDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {phobiaDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Patient Report */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Individual Patient Report
          </h2>
          
          <div className="flex items-center space-x-2">
            <FiFilter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="form-select w-64"
            >
              <option value="">Select a patient...</option>
              {patients.map(patient => (
                <option key={patient._id} value={patient._id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedPatient && patientReport ? (
          <div className="space-y-6">
            {/* Patient Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Sessions</p>
                <p className="text-xl font-bold">{patientReport.totalSessions || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-xl font-bold">{patientReport.completedSessions || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Avg Intensity</p>
                <p className="text-xl font-bold">{patientReport.avgIntensity || '-'}/10</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Progress</p>
                <p className="text-xl font-bold">{patientReport.progress || '-'}%</p>
              </div>
            </div>

            {/* Session History Chart */}
            {patientReport.sessionHistory && patientReport.sessionHistory.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Anxiety Level Progress</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={patientReport.sessionHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Bar dataKey="anxietyBefore" fill="#ef4444" name="Before" />
                      <Bar dataKey="anxietyAfter" fill="#22c55e" name="After" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            Select a patient to view their detailed report
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
