/**
 * PatientForm Component
 * 
 * Form for creating and editing patient records.
 */

import { useState, useEffect } from 'react';
import { FiX, FiSave, FiUser } from 'react-icons/fi';

// Phobia options for the dropdown
const PHOBIA_OPTIONS = [
  { value: 'arachnophobia', label: 'Arachnophobia (Spiders)' },
  { value: 'acrophobia', label: 'Acrophobia (Heights)' },
  { value: 'claustrophobia', label: 'Claustrophobia (Confined Spaces)' },
  { value: 'agoraphobia', label: 'Agoraphobia (Open Spaces)' },
  { value: 'social-anxiety', label: 'Social Anxiety Disorder' },
  { value: 'glossophobia', label: 'Glossophobia (Public Speaking)' },
  { value: 'aviophobia', label: 'Aviophobia (Flying)' },
  { value: 'cynophobia', label: 'Cynophobia (Dogs)' },
  { value: 'ophidiophobia', label: 'Ophidiophobia (Snakes)' },
  { value: 'trypanophobia', label: 'Trypanophobia (Needles)' },
  { value: 'dentophobia', label: 'Dentophobia (Dentists)' },
  { value: 'other', label: 'Other' }
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' }
];

const PatientForm = ({ patient = null, onSave, onCancel, isLoading = false }) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    phobia: '',
    phobiaDescription: '',
    email: '',
    phone: '',
    medicalNotes: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  const [errors, setErrors] = useState({});

  // Load patient data when editing
  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || '',
        age: patient.age || '',
        gender: patient.gender || '',
        phobia: patient.phobia || '',
        phobiaDescription: patient.phobiaDescription || '',
        email: patient.email || '',
        phone: patient.phone || '',
        medicalNotes: patient.medicalNotes || '',
        emergencyContact: patient.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        }
      });
    }
  }, [patient]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested emergency contact fields
    if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.age || formData.age < 1 || formData.age > 150) {
      newErrors.age = 'Please enter a valid age (1-150)';
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select a gender';
    }

    if (!formData.phobia) {
      newErrors.phobia = 'Please select a phobia type';
    }

    if (formData.phobia === 'other' && !formData.phobiaDescription.trim()) {
      newErrors.phobiaDescription = 'Please describe the phobia';
    }

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      onSave({
        ...formData,
        age: parseInt(formData.age)
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <FiUser className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {patient ? 'Edit Patient' : 'Add New Patient'}
            </h2>
            <p className="text-sm text-gray-500">
              {patient ? 'Update patient information' : 'Enter patient details'}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiX className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`form-input ${errors.name ? 'border-danger-500' : ''}`}
                placeholder="Enter patient's full name"
              />
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>

            {/* Age */}
            <div>
              <label className="form-label">Age *</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className={`form-input ${errors.age ? 'border-danger-500' : ''}`}
                placeholder="Age"
                min="1"
                max="150"
              />
              {errors.age && <p className="form-error">{errors.age}</p>}
            </div>

            {/* Gender */}
            <div>
              <label className="form-label">Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`form-select ${errors.gender ? 'border-danger-500' : ''}`}
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.gender && <p className="form-error">{errors.gender}</p>}
            </div>
          </div>
        </div>

        {/* Phobia Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Phobia Information
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Primary Phobia */}
            <div>
              <label className="form-label">Primary Phobia *</label>
              <select
                name="phobia"
                value={formData.phobia}
                onChange={handleChange}
                className={`form-select ${errors.phobia ? 'border-danger-500' : ''}`}
              >
                <option value="">Select phobia type</option>
                {PHOBIA_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.phobia && <p className="form-error">{errors.phobia}</p>}
            </div>

            {/* Phobia Description (shown for 'other' or as additional info) */}
            {(formData.phobia === 'other' || formData.phobia) && (
              <div>
                <label className="form-label">
                  {formData.phobia === 'other' ? 'Phobia Description *' : 'Additional Details'}
                </label>
                <textarea
                  name="phobiaDescription"
                  value={formData.phobiaDescription}
                  onChange={handleChange}
                  className={`form-textarea h-20 ${errors.phobiaDescription ? 'border-danger-500' : ''}`}
                  placeholder="Describe the phobia or provide additional details..."
                />
                {errors.phobiaDescription && (
                  <p className="form-error">{errors.phobiaDescription}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Contact Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'border-danger-500' : ''}`}
                placeholder="patient@email.com"
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div>
              <label className="form-label">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </div>

        {/* Medical Notes */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Medical Notes
          </h3>
          
          <div>
            <label className="form-label">Medical History & Notes</label>
            <textarea
              name="medicalNotes"
              value={formData.medicalNotes}
              onChange={handleChange}
              className="form-textarea h-24"
              placeholder="Enter relevant medical history, medications, or notes..."
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Emergency Contact
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Name</label>
              <input
                type="text"
                name="emergencyContact.name"
                value={formData.emergencyContact.name}
                onChange={handleChange}
                className="form-input"
                placeholder="Contact name"
              />
            </div>

            <div>
              <label className="form-label">Phone</label>
              <input
                type="tel"
                name="emergencyContact.phone"
                value={formData.emergencyContact.phone}
                onChange={handleChange}
                className="form-input"
                placeholder="Contact phone"
              />
            </div>

            <div>
              <label className="form-label">Relationship</label>
              <input
                type="text"
                name="emergencyContact.relationship"
                value={formData.emergencyContact.relationship}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Spouse, Parent"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={isLoading}
          >
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
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                <span>{patient ? 'Update Patient' : 'Add Patient'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;
