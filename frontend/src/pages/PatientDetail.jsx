/**
 * Patient Detail Page
 * 
 * View detailed patient information, session history, and notes.
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiEdit2, 
  FiCalendar, 
  FiPlus,
  FiActivity,
  FiMessageSquare,
  FiUser
} from 'react-icons/fi';
import { format } from 'date-fns';
import { patientAPI } from '../services/api';
import PatientForm from '../components/PatientForm';
import Modal from '../components/Modal';

// Phobia labels
const PHOBIA_LABELS = {
  'arachnophobia': 'Arachnophobia (Spiders)',
  'acrophobia': 'Acrophobia (Heights)',
  'claustrophobia': 'Claustrophobia (Confined Spaces)',
  'social-anxiety': 'Social Anxiety',
  'other': 'Other'
};

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Load patient data
  useEffect(() => {
    const loadPatient = async () => {
      try {
        setIsLoading(true);
        const [patientRes, sessionsRes] = await Promise.all([
          patientAPI.getById(id),
          patientAPI.getSessions(id)
        ]);
        setPatient(patientRes.data);
        setSessions(sessionsRes.data || []);
      } catch (error) {
        console.error('Error loading patient:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPatient();
  }, [id]);

  // Handle add note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      setIsAddingNote(true);
      await patientAPI.addNote(id, newNote);
      
      // Reload patient to get updated notes
      const patientRes = await patientAPI.getById(id);
      setPatient(patientRes.data);
      setNewNote('');
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsAddingNote(false);
    }
  };

  // Handle edit save
  const handleEditSave = async (data) => {
    try {
      await patientAPI.update(id, data);
      const patientRes = await patientAPI.getById(id);
      setPatient(patientRes.data);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded"></div>
        <div className="card h-48"></div>
        <div className="card h-64"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Patient not found</p>
        <Link to="/patients" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          ← Back to patients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link 
        to="/patients" 
        className="inline-flex items-center text-gray-600 hover:text-gray-900"
      >
        <FiArrowLeft className="w-4 h-4 mr-2" />
        Back to Patients
      </Link>

      {/* Patient Header Card */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-700">
                {patient.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
              <p className="text-gray-500">
                {patient.age} years old • {patient.gender}
              </p>
              <div className="flex items-center space-x-3 mt-2">
                <span className="badge-primary">
                  {PHOBIA_LABELS[patient.phobia] || patient.phobia}
                </span>
                <span className={`badge ${patient.status === 'active' ? 'badge-success' : 'bg-gray-100 text-gray-600'}`}>
                  {patient.status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button 
              onClick={() => setShowEditModal(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <FiEdit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <Link 
              to="/scene-builder" 
              state={{ patient }}
              className="btn-primary flex items-center space-x-2"
            >
              <FiPlus className="w-4 h-4" />
              <span>New Session</span>
            </Link>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
            <p className="text-gray-900 mt-1">{patient.email || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
            <p className="text-gray-900 mt-1">{patient.phone || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Emergency Contact</p>
            <p className="text-gray-900 mt-1">
              {patient.emergencyContact?.name 
                ? `${patient.emergencyContact.name} (${patient.emergencyContact.relationship})`
                : 'Not provided'}
            </p>
          </div>
        </div>

        {/* Medical Notes */}
        {patient.medicalNotes && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Medical Notes</p>
            <p className="text-gray-700 text-sm">{patient.medicalNotes}</p>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session History */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiCalendar className="w-5 h-5 mr-2 text-primary-500" />
              Session History
            </h2>
            <span className="text-sm text-gray-500">{sessions.length} sessions</span>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <FiActivity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No sessions recorded</p>
              <Link 
                to="/scene-builder" 
                state={{ patient }}
                className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
              >
                Create first session →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <Link
                  key={session._id}
                  to={`/sessions/${session._id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {session.environment} - Intensity {session.intensity}/10
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(session.date), 'MMMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                    <span className={`badge ${
                      session.status === 'completed' ? 'badge-success' :
                      session.status === 'in-progress' ? 'badge-warning' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  {session.previewURL && (
                    <img 
                      src={session.previewURL} 
                      alt="Session preview" 
                      className="mt-3 w-full h-24 object-cover rounded"
                    />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Therapist Notes */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
            <FiMessageSquare className="w-5 h-5 mr-2 text-primary-500" />
            Therapist Notes
          </h2>

          {/* Add Note Form */}
          <div className="mb-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="form-textarea h-20 text-sm"
            />
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || isAddingNote}
              className="btn-primary w-full mt-2 text-sm"
            >
              {isAddingNote ? 'Adding...' : 'Add Note'}
            </button>
          </div>

          {/* Notes List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {patient.therapistNotes?.length > 0 ? (
              patient.therapistNotes.slice().reverse().map((note, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{note.note}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No notes yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} size="lg">
        <PatientForm
          patient={patient}
          onSave={handleEditSave}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
};

export default PatientDetail;
