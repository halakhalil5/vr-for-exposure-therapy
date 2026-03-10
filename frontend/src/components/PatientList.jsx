/**
 * PatientList Component
 * 
 * Displays a list of patients with search, filter, and actions.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiSearch, 
  FiFilter, 
  FiMoreVertical, 
  FiEdit2, 
  FiTrash2, 
  FiEye,
  FiCalendar 
} from 'react-icons/fi';
import { format } from 'date-fns';

// Phobia display labels
const PHOBIA_LABELS = {
  'arachnophobia': 'Spiders',
  'acrophobia': 'Heights',
  'claustrophobia': 'Confined Spaces',
  'agoraphobia': 'Open Spaces',
  'social-anxiety': 'Social Anxiety',
  'glossophobia': 'Public Speaking',
  'aviophobia': 'Flying',
  'cynophobia': 'Dogs',
  'ophidiophobia': 'Snakes',
  'trypanophobia': 'Needles',
  'dentophobia': 'Dentists',
  'other': 'Other'
};

// Status badge colors
const STATUS_STYLES = {
  active: 'badge-success',
  inactive: 'badge bg-gray-100 text-gray-600',
  completed: 'badge-primary',
  'on-hold': 'badge-warning'
};

const PatientList = ({ 
  patients = [], 
  onEdit, 
  onDelete, 
  onCreateSession,
  isLoading = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhobia, setSelectedPhobia] = useState('');
  const [openMenu, setOpenMenu] = useState(null);

  // Filter patients based on search and filters
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhobia = !selectedPhobia || patient.phobia === selectedPhobia;
    return matchesSearch && matchesPhobia;
  });

  // Get unique phobias for filter dropdown
  const uniquePhobias = [...new Set(patients.map(p => p.phobia))];

  // Toggle action menu
  const toggleMenu = (patientId) => {
    setOpenMenu(openMenu === patientId ? null : patientId);
  };

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
        </div>

        {/* Phobia Filter */}
        <div className="relative sm:w-48">
          <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={selectedPhobia}
            onChange={(e) => setSelectedPhobia(e.target.value)}
            className="form-select pl-9"
          >
            <option value="">All Phobias</option>
            {uniquePhobias.map(phobia => (
              <option key={phobia} value={phobia}>
                {PHOBIA_LABELS[phobia] || phobia}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient Count */}
      <p className="text-sm text-gray-500">
        Showing {filteredPatients.length} of {patients.length} patients
      </p>

      {/* Patients Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No patients found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm || selectedPhobia 
                ? 'Try adjusting your search or filters' 
                : 'Add a new patient to get started'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Patient</th>
                <th className="table-header">Phobia</th>
                <th className="table-header hidden md:table-cell">Sessions</th>
                <th className="table-header hidden lg:table-cell">Last Visit</th>
                <th className="table-header">Status</th>
                <th className="table-header w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPatients.map((patient) => (
                <tr key={patient._id} className="hover:bg-gray-50 transition-colors">
                  {/* Patient Info */}
                  <td className="table-cell">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-medium">
                          {patient.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <Link 
                          to={`/patients/${patient._id}`}
                          className="font-medium text-gray-900 hover:text-primary-600"
                        >
                          {patient.name}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {patient.age} years • {patient.gender}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Phobia */}
                  <td className="table-cell">
                    <span className="badge-primary">
                      {PHOBIA_LABELS[patient.phobia] || patient.phobia}
                    </span>
                  </td>

                  {/* Sessions Count */}
                  <td className="table-cell hidden md:table-cell">
                    <span className="text-gray-600">
                      {patient.sessions?.length || 0} sessions
                    </span>
                  </td>

                  {/* Last Visit */}
                  <td className="table-cell hidden lg:table-cell text-gray-500">
                    {patient.updatedAt 
                      ? format(new Date(patient.updatedAt), 'MMM d, yyyy')
                      : 'Never'}
                  </td>

                  {/* Status */}
                  <td className="table-cell">
                    <span className={STATUS_STYLES[patient.status] || 'badge'}>
                      {patient.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="table-cell">
                    <div className="relative">
                      <button
                        onClick={() => toggleMenu(patient._id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <FiMoreVertical className="w-4 h-4 text-gray-500" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenu === patient._id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg 
                                        border border-gray-100 py-1 z-50 animate-fade-in">
                          <Link
                            to={`/patients/${patient._id}`}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 
                                       hover:bg-gray-50"
                          >
                            <FiEye className="w-4 h-4 mr-3" />
                            View Details
                          </Link>
                          <button
                            onClick={() => {
                              onEdit(patient);
                              setOpenMenu(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 
                                       hover:bg-gray-50"
                          >
                            <FiEdit2 className="w-4 h-4 mr-3" />
                            Edit Patient
                          </button>
                          <button
                            onClick={() => {
                              onCreateSession(patient);
                              setOpenMenu(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 
                                       hover:bg-gray-50"
                          >
                            <FiCalendar className="w-4 h-4 mr-3" />
                            New Session
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => {
                              onDelete(patient);
                              setOpenMenu(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-danger-500 
                                       hover:bg-danger-50"
                          >
                            <FiTrash2 className="w-4 h-4 mr-3" />
                            Delete Patient
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Click outside to close menu */}
      {openMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setOpenMenu(null)} 
        />
      )}
    </div>
  );
};

export default PatientList;
