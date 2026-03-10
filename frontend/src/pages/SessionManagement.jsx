/**
 * Session Management Page
 * 
 * List and manage all VR therapy sessions.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiPlus, 
  FiFilter, 
  FiSearch,
  FiCalendar,
  FiActivity,
  FiEye,
  FiTrash2
} from 'react-icons/fi';
import { format } from 'date-fns';
import { sessionAPI } from '../services/api';
import Modal from '../components/Modal';

const SessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deletingSession, setDeletingSession] = useState(null);

  // Load sessions
  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      
      const response = await sessionAPI.getAll(params);
      setSessions(response.data || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [statusFilter]);

  // Delete session
  const handleDelete = async () => {
    if (!deletingSession) return;
    
    try {
      await sessionAPI.delete(deletingSession._id);
      setDeletingSession(null);
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  // Filter sessions by search
  const filteredSessions = sessions.filter(session => {
    const patientName = session.patientId?.name?.toLowerCase() || '';
    return patientName.includes(searchTerm.toLowerCase()) ||
           session.phobia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           session.environment?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Status badge styling
  const getStatusStyle = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-600',
      scheduled: 'bg-blue-100 text-blue-600',
      'in-progress': 'bg-yellow-100 text-yellow-600',
      completed: 'bg-green-100 text-green-600',
      cancelled: 'bg-red-100 text-red-600'
    };
    return `badge ${styles[status] || 'bg-gray-100 text-gray-600'}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="text-gray-500 mt-1">
            Manage VR therapy sessions
          </p>
        </div>
        
        <Link 
          to="/scene-builder"
          className="btn-primary flex items-center space-x-2"
        >
          <FiPlus className="w-4 h-4" />
          <span>New Session</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="relative sm:w-48">
          <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select pl-9"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Sessions Count */}
      <p className="text-sm text-gray-500">
        Showing {filteredSessions.length} sessions
      </p>

      {/* Sessions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100"></div>
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="card text-center py-12">
          <FiCalendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No sessions found</p>
          <p className="text-sm text-gray-400 mt-1">
            {searchTerm || statusFilter 
              ? 'Try adjusting your filters'
              : 'Create a new session to get started'}
          </p>
          <Link 
            to="/scene-builder" 
            className="btn-primary mt-4 inline-flex items-center space-x-2"
          >
            <FiPlus className="w-4 h-4" />
            <span>Create Session</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map(session => (
            <div 
              key={session._id}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Session Info */}
                <div className="flex items-start space-x-4">
                  {/* Preview Thumbnail */}
                  <div className="w-24 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {session.previewURL ? (
                      <img 
                        src={session.previewURL} 
                        alt="Session preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiActivity className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {session.patientId?.name || 'Unknown Patient'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {session.phobia} • {session.environment} • 
                      Intensity {session.intensity}/10
                    </p>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={getStatusStyle(session.status)}>
                        {session.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(session.date), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/sessions/${session._id}`}
                    className="btn-secondary flex items-center space-x-2 text-sm"
                  >
                    <FiEye className="w-4 h-4" />
                    <span>View</span>
                  </Link>
                  <button
                    onClick={() => setDeletingSession(session)}
                    className="p-2 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Info */}
      {pagination && (
        <div className="text-sm text-gray-500 text-center">
          Page {pagination.currentPage} of {pagination.totalPages}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deletingSession} 
        onClose={() => setDeletingSession(null)}
        title="Delete Session"
        size="sm"
      >
        <div className="p-6">
          <p className="text-gray-600">
            Are you sure you want to delete this session?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This action cannot be undone.
          </p>
          
          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => setDeletingSession(null)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="btn-danger flex-1"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SessionManagement;
