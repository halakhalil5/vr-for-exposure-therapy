/**
 * Patient Management Page
 * 
 * List, add, edit, and manage patients in the VR therapy system.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiDownload } from 'react-icons/fi';
import { patientAPI } from '../services/api';
import PatientList from '../components/PatientList';
import PatientForm from '../components/PatientForm';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const PatientManagement = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [deletingPatient, setDeletingPatient] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load patients
  const loadPatients = async () => {
    try {
      setIsLoading(true);
      const response = await patientAPI.getAll();
      setPatients(response.data || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  // Handle add patient
  const handleAddPatient = async (patientData) => {
    try {
      setIsSaving(true);
      await patientAPI.create(patientData);
      setShowAddModal(false);
      loadPatients();
    } catch (error) {
      console.error('Error creating patient:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit patient
  const handleEditPatient = async (patientData) => {
    try {
      setIsSaving(true);
      await patientAPI.update(editingPatient._id, patientData);
      setEditingPatient(null);
      loadPatients();
    } catch (error) {
      console.error('Error updating patient:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete patient
  const handleDeletePatient = async () => {
    if (!deletingPatient) return;
    
    try {
      await patientAPI.delete(deletingPatient._id, true); // Soft delete
      setDeletingPatient(null);
      loadPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  // Navigate to create session for patient
  const handleCreateSession = (patient) => {
    navigate('/scene-builder', { state: { patient } });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
          <p className="text-gray-500 mt-1">
            Manage patients enrolled in VR exposure therapy
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <FiDownload className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Patient</span>
          </button>
        </div>
      </div>

      {/* Patient List */}
      <PatientList
        patients={patients}
        isLoading={isLoading}
        onEdit={setEditingPatient}
        onDelete={setDeletingPatient}
        onCreateSession={handleCreateSession}
      />

      {/* Pagination Info */}
      {pagination && (
        <div className="text-sm text-gray-500 text-center">
          Page {pagination.currentPage} of {pagination.totalPages}
          {' • '}{pagination.totalItems} total patients
        </div>
      )}

      {/* Add Patient Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="lg">
        <PatientForm
          onSave={handleAddPatient}
          onCancel={() => setShowAddModal(false)}
          isLoading={isSaving}
        />
      </Modal>

      {/* Edit Patient Modal */}
      <Modal 
        isOpen={!!editingPatient} 
        onClose={() => setEditingPatient(null)} 
        size="lg"
      >
        <PatientForm
          patient={editingPatient}
          onSave={handleEditPatient}
          onCancel={() => setEditingPatient(null)}
          isLoading={isSaving}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deletingPatient} 
        onClose={() => setDeletingPatient(null)}
        title="Delete Patient"
        size="sm"
      >
        <div className="p-6">
          <p className="text-gray-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{deletingPatient?.name}</span>?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This will deactivate the patient record. Associated sessions will be preserved.
          </p>
          
          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => setDeletingPatient(null)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleDeletePatient}
              className="btn-danger flex-1"
            >
              Delete Patient
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PatientManagement;
