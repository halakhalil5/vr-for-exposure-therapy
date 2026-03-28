/**
 * Session Controller
 * 
 * Handles VR therapy session operations including creation,
 * configuration, biofeedback data, and session management.
 */

const Session = require('../models/Session');
const Patient = require('../models/Patient');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const TEMPLATE_TO_ENVIRONMENT = {
  'living-room': 'indoor-room',
  'road-with-skyscrappers': 'city-street',
  rooftop: 'rooftop',
  'cliff-edge': 'cliff-edge',
  cave: 'cave',
  elevator: 'elevator',
  airplane: 'airplane',
  airport: 'airport'
};

/**
 * Get all sessions
 * GET /api/sessions
 */
const getAllSessions = asyncHandler(async (req, res) => {
  const {
    status,
    phobia,
    patientId,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = req.query;

  // Build query
  const query = {};
  
  if (status) query.status = status;
  if (phobia) query.phobia = phobia;
  if (patientId) query.patientId = patientId;
  
  // Date range filter
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [sessions, total] = await Promise.all([
    Session.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('patientId', 'name age phobia')
      .select('-sceneJSON.objects'), // Exclude large object arrays for list view
    Session.countDocuments(query)
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

/**
 * Get single session by ID
 * GET /api/sessions/:id
 */
const getSessionById = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id)
    .populate('patientId', 'name age gender phobia medicalNotes');

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  res.json({ data: session });
});

/**
 * Create new VR session
 * POST /api/sessions
 */
const createSession = asyncHandler(async (req, res) => {
  const {
    patientId,
    phobia,
    intensity,
    sceneTemplate,
    environment,
    sceneDescription,
    sceneJSON,
    scheduledDate,
    therapistNotes
  } = req.body;

  // Validate required fields
  if (!patientId || !intensity) {
    throw new ApiError('Patient ID and intensity are required', 400);
  }

  // Verify patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ApiError('Patient not found', 404);
  }

  const resolvedEnvironment = sceneTemplate
    ? TEMPLATE_TO_ENVIRONMENT[sceneTemplate]
    : environment;

  if (!resolvedEnvironment) {
    throw new ApiError('A valid scene template or environment is required', 400);
  }

  // Phobia is always taken from patient registration to avoid mismatches.
  const resolvedPhobia = patient.phobia || phobia;
  if (!resolvedPhobia) {
    throw new ApiError('Patient phobia is required before creating a session', 400);
  }

  // Create session with initial configuration
  const session = new Session({
    patientId,
    phobia: resolvedPhobia,
    intensity: parseInt(intensity),
    environment: resolvedEnvironment,
    sceneTemplate,
    sceneDescription,
    sceneJSON: sceneJSON || {
      environment: resolvedEnvironment,
      objects: [],
      triggers: [],
      camera: {
        startPosition: { x: 0, y: 1.6, z: 0 },
        allowMovement: true
      }
    },
    status: 'draft',
    scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
    therapistNotes: {
      preSession: therapistNotes?.preSession || ''
    }
  });

  await session.save();

  // Add session reference to patient
  await patient.addSession(session._id);

  res.status(201).json({
    message: 'Session created successfully',
    data: session
  });
});

/**
 * Update session
 * PUT /api/sessions/:id
 */
const updateSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  // Prevent updates to completed sessions (unless explicitly allowed)
  if (session.status === 'completed' && !req.query.force) {
    throw new ApiError('Cannot update a completed session', 400);
  }

  const allowedUpdates = [
    'intensity', 'environment', 'sceneTemplate', 'sceneDescription', 'sceneJSON',
    'scheduledDate', 'status', 'therapistNotes', 'duration'
  ];

  if (req.body.sceneTemplate && TEMPLATE_TO_ENVIRONMENT[req.body.sceneTemplate]) {
    session.environment = TEMPLATE_TO_ENVIRONMENT[req.body.sceneTemplate];
  }

  const patient = await Patient.findById(session.patientId).select('phobia');
  if (patient?.phobia) {
    session.phobia = patient.phobia;
  }

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      session[key] = req.body[key];
    }
  }

  await session.save();

  res.json({
    message: 'Session updated successfully',
    data: session
  });
});

/**
 * Update scene configuration
 * PATCH /api/sessions/:id/scene
 */
const updateSceneConfig = asyncHandler(async (req, res) => {
  const { sceneJSON } = req.body;

  if (!sceneJSON) {
    throw new ApiError('Scene configuration is required', 400);
  }

  const session = await Session.findByIdAndUpdate(
    req.params.id,
    { 
      $set: { 
        sceneJSON,
        sceneApproved: false // Reset approval when scene changes
      } 
    },
    { new: true }
  );

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  res.json({
    message: 'Scene configuration updated',
    data: session
  });
});

/**
 * Approve scene for VR session
 * POST /api/sessions/:id/approve
 */
const approveScene = asyncHandler(async (req, res) => {
  const { approverName } = req.body;

  const session = await Session.findById(req.params.id);

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  if (!session.sceneJSON || Object.keys(session.sceneJSON).length === 0) {
    throw new ApiError('Cannot approve session without scene configuration', 400);
  }

  await session.approveScene(approverName || 'Therapist');
  session.status = 'scheduled';
  await session.save();

  res.json({
    message: 'Scene approved successfully',
    data: session
  });
});

/**
 * Delete session
 * DELETE /api/sessions/:id
 */
const deleteSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  // Remove session reference from patient
  await Patient.findByIdAndUpdate(
    session.patientId,
    { $pull: { sessions: session._id } }
  );

  await Session.findByIdAndDelete(req.params.id);

  res.json({
    message: 'Session deleted successfully'
  });
});

/**
 * Add biofeedback data to session
 * POST /api/sessions/:id/biofeedback
 */
const addBiofeedbackData = asyncHandler(async (req, res) => {
  const { heartRate, stressLevel, skinConductance, respirationRate } = req.body;

  const session = await Session.findById(req.params.id);

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  await session.addBiofeedbackData({
    heartRate,
    stressLevel,
    skinConductance,
    respirationRate
  });

  res.json({
    message: 'Biofeedback data added',
    data: session.biofeedback
  });
});

/**
 * Update patient feedback for session
 * POST /api/sessions/:id/feedback
 */
const updatePatientFeedback = asyncHandler(async (req, res) => {
  const { anxietyLevelBefore, anxietyLevelAfter, comments } = req.body;

  const session = await Session.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        'patientFeedback.anxietyLevelBefore': anxietyLevelBefore,
        'patientFeedback.anxietyLevelAfter': anxietyLevelAfter,
        'patientFeedback.comments': comments
      }
    },
    { new: true }
  );

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  res.json({
    message: 'Patient feedback updated',
    data: session.patientFeedback
  });
});

/**
 * Start session (change status to in-progress)
 * POST /api/sessions/:id/start
 */
const startSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  if (!session.sceneApproved) {
    throw new ApiError('Scene must be approved before starting session', 400);
  }

  session.status = 'in-progress';
  session.date = new Date();
  await session.save();

  res.json({
    message: 'Session started',
    data: session
  });
});

/**
 * Complete session
 * POST /api/sessions/:id/complete
 */
const completeSession = asyncHandler(async (req, res) => {
  const { duration, therapistNotes } = req.body;

  const session = await Session.findById(req.params.id);

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  session.status = 'completed';
  if (duration) session.duration = duration;
  if (therapistNotes) {
    session.therapistNotes.postSession = therapistNotes;
  }
  
  await session.save();

  res.json({
    message: 'Session completed',
    data: session
  });
});

module.exports = {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  updateSceneConfig,
  approveScene,
  deleteSession,
  addBiofeedbackData,
  updatePatientFeedback,
  startSession,
  completeSession
};
