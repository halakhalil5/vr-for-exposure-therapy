/**
 * SessionForm Component
 * 
 * Form for creating and configuring VR therapy sessions.
 */

import { useState, useEffect } from 'react';
import { FiX, FiPlay, FiPlus, FiMinus } from 'react-icons/fi';

// Environment options
const ENVIRONMENT_OPTIONS = [
  { value: 'indoor-room', label: 'Indoor Room', description: 'Simple room environment' },
  { value: 'outdoor-park', label: 'Outdoor Park', description: 'Park or garden setting' },
  { value: 'office', label: 'Office', description: 'Office building interior' },
  { value: 'elevator', label: 'Elevator', description: 'Elevator/small space' },
  { value: 'rooftop', label: 'Rooftop', description: 'High building rooftop' },
  { value: 'bridge', label: 'Bridge', description: 'Bridge or overpass' },
  { value: 'airplane', label: 'Airplane', description: 'Airplane cabin' },
  { value: 'forest', label: 'Forest', description: 'Forest environment' },
  { value: 'beach', label: 'Beach', description: 'Beach setting' },
  { value: 'city-street', label: 'City Street', description: 'Urban street scene' },
  { value: 'medical-office', label: 'Medical Office', description: 'Doctor\'s office' },
  { value: 'presentation-room', label: 'Presentation Room', description: 'Conference/auditorium' }
];

// Phobia options
const PHOBIA_OPTIONS = [
  { value: 'arachnophobia', label: 'Arachnophobia (Spiders)' },
  { value: 'acrophobia', label: 'Acrophobia (Heights)' },
  { value: 'claustrophobia', label: 'Claustrophobia (Confined Spaces)' },
  { value: 'agoraphobia', label: 'Agoraphobia (Open Spaces)' },
  { value: 'social-anxiety', label: 'Social Anxiety' },
  { value: 'glossophobia', label: 'Glossophobia (Public Speaking)' },
  { value: 'aviophobia', label: 'Aviophobia (Flying)' },
  { value: 'cynophobia', label: 'Cynophobia (Dogs)' },
  { value: 'ophidiophobia', label: 'Ophidiophobia (Snakes)' },
  { value: 'trypanophobia', label: 'Trypanophobia (Needles)' },
  { value: 'dentophobia', label: 'Dentophobia (Dentists)' },
  { value: 'other', label: 'Other' }
];

const SessionForm = ({ 
  patient = null, 
  session = null, 
  onSubmit, 
  onCancel,
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    patientId: '',
    phobia: '',
    intensity: 5,
    environment: '',
    objectCounts: {
      triggers: 3,
      ambient: 5
    },
    customInstructions: '',
    scheduledDate: '',
    therapistNotes: ''
  });

  const [errors, setErrors] = useState({});

  // Initialize form with patient data if provided
  useEffect(() => {
    if (patient) {
      setFormData(prev => ({
        ...prev,
        patientId: patient._id,
        phobia: patient.phobia
      }));
    }
    
    if (session) {
      setFormData(prev => ({
        ...prev,
        patientId: session.patientId?._id || session.patientId,
        phobia: session.phobia,
        intensity: session.intensity,
        environment: session.environment,
        scheduledDate: session.scheduledDate?.split('T')[0] || '',
        therapistNotes: session.therapistNotes?.preSession || ''
      }));
    }
  }, [patient, session]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleObjectCountChange = (field, delta) => {
    setFormData(prev => ({
      ...prev,
      objectCounts: {
        ...prev.objectCounts,
        [field]: Math.max(0, Math.min(20, prev.objectCounts[field] + delta))
      }
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.patientId) {
      newErrors.patientId = 'Please select a patient';
    }

    if (!formData.phobia) {
      newErrors.phobia = 'Please select a phobia type';
    }

    if (!formData.environment) {
      newErrors.environment = 'Please select an environment';
    }

    if (formData.intensity < 1 || formData.intensity > 10) {
      newErrors.intensity = 'Intensity must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit({
        ...formData,
        therapistNotes: {
          preSession: formData.therapistNotes
        }
      });
    }
  };

  // Get intensity label
  const getIntensityLabel = (value) => {
    if (value <= 3) return { text: 'Low', color: 'text-success-600' };
    if (value <= 6) return { text: 'Medium', color: 'text-warning-600' };
    return { text: 'High', color: 'text-danger-600' };
  };

  const intensityInfo = getIntensityLabel(formData.intensity);

  return (
    <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {session ? 'Edit VR Session' : 'Create New VR Session'}
          </h2>
          <p className="text-sm text-gray-500">
            Configure the VR environment for exposure therapy
          </p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
          <FiX className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Patient Info (if selected) */}
        {patient && (
          <div className="bg-primary-50 rounded-lg p-4">
            <p className="text-sm text-primary-700">
              <span className="font-medium">Patient:</span> {patient.name}
            </p>
            <p className="text-xs text-primary-600 mt-1">
              Primary phobia: {patient.phobia}
            </p>
          </div>
        )}

        {/* Phobia Selection */}
        <div>
          <label className="form-label">Phobia Type *</label>
          <select
            name="phobia"
            value={formData.phobia}
            onChange={handleChange}
            className={`form-select ${errors.phobia ? 'border-danger-500' : ''}`}
          >
            <option value="">Select phobia to address</option>
            {PHOBIA_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.phobia && <p className="form-error">{errors.phobia}</p>}
        </div>

        {/* Environment Selection */}
        <div>
          <label className="form-label">VR Environment *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {ENVIRONMENT_OPTIONS.map(env => (
              <button
                key={env.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, environment: env.value }))}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  formData.environment === env.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-sm text-gray-900">{env.label}</p>
                <p className="text-xs text-gray-500 mt-1">{env.description}</p>
              </button>
            ))}
          </div>
          {errors.environment && <p className="form-error mt-2">{errors.environment}</p>}
        </div>

        {/* Intensity Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="form-label mb-0">Exposure Intensity</label>
            <span className={`text-sm font-medium ${intensityInfo.color}`}>
              {formData.intensity}/10 ({intensityInfo.text})
            </span>
          </div>
          <input
            type="range"
            name="intensity"
            min="1"
            max="10"
            value={formData.intensity}
            onChange={handleChange}
            className="intensity-slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Minimal</span>
            <span>Moderate</span>
            <span>Maximum</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Higher intensity means more triggers, closer proximity, and more dynamic scenarios.
          </p>
        </div>

        {/* Object Counts */}
        <div>
          <label className="form-label">Scene Configuration</label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {/* Trigger Count */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Trigger Objects</p>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleObjectCountChange('triggers', -1)}
                  className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-100"
                >
                  <FiMinus className="w-4 h-4" />
                </button>
                <span className="text-2xl font-semibold text-gray-900">
                  {formData.objectCounts.triggers}
                </span>
                <button
                  type="button"
                  onClick={() => handleObjectCountChange('triggers', 1)}
                  className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-100"
                >
                  <FiPlus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ambient Objects */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Ambient Objects</p>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleObjectCountChange('ambient', -1)}
                  className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-100"
                >
                  <FiMinus className="w-4 h-4" />
                </button>
                <span className="text-2xl font-semibold text-gray-900">
                  {formData.objectCounts.ambient}
                </span>
                <button
                  type="button"
                  onClick={() => handleObjectCountChange('ambient', 1)}
                  className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-100"
                >
                  <FiPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Instructions */}
        <div>
          <label className="form-label">Custom Scene Instructions</label>
          <textarea
            name="customInstructions"
            value={formData.customInstructions}
            onChange={handleChange}
            placeholder="Add any specific instructions for scene generation (e.g., 'Include a window with city view', 'Add calming music')..."
            className="form-textarea h-20"
          />
        </div>

        {/* Scheduled Date */}
        <div>
          <label className="form-label">Scheduled Date (Optional)</label>
          <input
            type="date"
            name="scheduledDate"
            value={formData.scheduledDate}
            onChange={handleChange}
            className="form-input"
          />
        </div>

        {/* Therapist Notes */}
        <div>
          <label className="form-label">Pre-Session Notes</label>
          <textarea
            name="therapistNotes"
            value={formData.therapistNotes}
            onChange={handleChange}
            placeholder="Notes to review before starting the session..."
            className="form-textarea h-20"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn-primary flex items-center space-x-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <FiPlay className="w-4 h-4" />
                <span>{session ? 'Update Session' : 'Create Session'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionForm;
