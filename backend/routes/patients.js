/**
 * Patient Routes
 * 
 * API routes for patient management operations.
 */

const express = require('express');
const router = express.Router();
const {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  addTherapistNote,
  getPatientSessions
} = require('../controllers/patientController');

// GET /api/patients - Get all patients (with filtering and pagination)
router.get('/', getAllPatients);

// GET /api/patients/:id - Get single patient by ID
router.get('/:id', getPatientById);

// POST /api/patients - Create new patient
router.post('/', createPatient);

// PUT /api/patients/:id - Update patient
router.put('/:id', updatePatient);

// DELETE /api/patients/:id - Delete patient (soft or hard delete)
router.delete('/:id', deletePatient);

// POST /api/patients/:id/notes - Add therapist note
router.post('/:id/notes', addTherapistNote);

// GET /api/patients/:id/sessions - Get patient's session history
router.get('/:id/sessions', getPatientSessions);

module.exports = router;
