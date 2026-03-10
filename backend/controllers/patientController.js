/**
 * Patient Controller
 * 
 * Handles all patient-related operations including CRUD operations,
 * searching, and session management.
 */

const Patient = require('../models/Patient');
const Session = require('../models/Session');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

/**
 * Get all patients
 * GET /api/patients
 */
const getAllPatients = asyncHandler(async (req, res) => {
  const { 
    status, 
    phobia, 
    search, 
    page = 1, 
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = {};
  
  if (status) {
    query.status = status;
  }
  
  if (phobia) {
    query.phobia = phobia;
  }
  
  if (search) {
    query.$text = { $search: search };
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  // Execute query
  const [patients, total] = await Promise.all([
    Patient.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v'),
    Patient.countDocuments(query)
  ]);

  res.json({
    data: patients,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    }
  });
});

/**
 * Get single patient by ID
 * GET /api/patients/:id
 */
const getPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id)
    .populate({
      path: 'sessions',
      options: { sort: { date: -1 }, limit: 10 },
      select: 'date phobia intensity status previewURL'
    });

  if (!patient) {
    throw new ApiError('Patient not found', 404);
  }

  res.json({ data: patient });
});

/**
 * Create new patient
 * POST /api/patients
 */
const createPatient = asyncHandler(async (req, res) => {
  const {
    name,
    age,
    gender,
    phobia,
    phobiaDescription,
    email,
    phone,
    medicalNotes,
    emergencyContact
  } = req.body;

  // Validate required fields
  if (!name || !age || !gender || !phobia) {
    throw new ApiError('Name, age, gender, and phobia are required fields', 400);
  }

  const patient = new Patient({
    name,
    age,
    gender,
    phobia,
    phobiaDescription,
    email,
    phone,
    medicalNotes,
    emergencyContact,
    status: 'active',
    sessions: []
  });

  await patient.save();

  res.status(201).json({
    message: 'Patient created successfully',
    data: patient
  });
});

/**
 * Update patient
 * PUT /api/patients/:id
 */
const updatePatient = asyncHandler(async (req, res) => {
  const allowedUpdates = [
    'name', 'age', 'gender', 'phobia', 'phobiaDescription',
    'email', 'phone', 'medicalNotes', 'emergencyContact', 'status'
  ];
  
  const updates = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!patient) {
    throw new ApiError('Patient not found', 404);
  }

  res.json({
    message: 'Patient updated successfully',
    data: patient
  });
});

/**
 * Delete patient
 * DELETE /api/patients/:id
 */
const deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    throw new ApiError('Patient not found', 404);
  }

  // Option: soft delete (change status to inactive)
  if (req.query.soft === 'true') {
    patient.status = 'inactive';
    await patient.save();
    return res.json({
      message: 'Patient deactivated successfully',
      data: patient
    });
  }

  // Hard delete - also delete associated sessions
  await Session.deleteMany({ patientId: patient._id });
  await Patient.findByIdAndDelete(req.params.id);

  res.json({
    message: 'Patient and associated sessions deleted successfully'
  });
});

/**
 * Add therapist note to patient
 * POST /api/patients/:id/notes
 */
const addTherapistNote = asyncHandler(async (req, res) => {
  const { note } = req.body;

  if (!note || note.trim() === '') {
    throw new ApiError('Note content is required', 400);
  }

  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        therapistNotes: {
          note: note.trim(),
          createdAt: new Date()
        }
      }
    },
    { new: true }
  );

  if (!patient) {
    throw new ApiError('Patient not found', 404);
  }

  res.json({
    message: 'Note added successfully',
    data: patient.therapistNotes
  });
});

/**
 * Get patient session history
 * GET /api/patients/:id/sessions
 */
const getPatientSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const patient = await Patient.findById(req.params.id);
  
  if (!patient) {
    throw new ApiError('Patient not found', 404);
  }

  const [sessions, total] = await Promise.all([
    Session.find({ patientId: req.params.id })
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-sceneJSON'),
    Session.countDocuments({ patientId: req.params.id })
  ]);

  res.json({
    data: sessions,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalItems: total
    }
  });
});

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  addTherapistNote,
  getPatientSessions
};
