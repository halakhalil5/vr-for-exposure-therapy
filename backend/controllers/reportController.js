/**
 * Report Controller
 * 
 * Handles generation and retrieval of patient therapy reports,
 * session summaries, and biofeedback analytics.
 */

const Session = require('../models/Session');
const Patient = require('../models/Patient');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

/**
 * Get all reports for a patient
 * GET /api/reports/:patientId
 */
const getPatientReports = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { startDate, endDate, detailed } = req.query;

  // Verify patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ApiError('Patient not found', 404);
  }

  // Build query for sessions
  const query = { patientId };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Get all sessions for patient
  const sessions = await Session.find(query)
    .sort({ date: -1 })
    .select(detailed === 'true' ? undefined : '-sceneJSON');

  // Calculate summary statistics
  const completedSessions = sessions.filter(s => s.status === 'completed');
  
  // Biofeedback averages across all sessions
  const biofeedbackStats = calculateBiofeedbackStats(completedSessions);
  
  // Anxiety reduction trend
  const anxietyTrend = calculateAnxietyTrend(completedSessions);
  
  // Session frequency
  const sessionFrequency = calculateSessionFrequency(sessions);

  const report = {
    patient: {
      id: patient._id,
      name: patient.name,
      age: patient.age,
      phobia: patient.phobia,
      status: patient.status
    },
    summary: {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      scheduledSessions: sessions.filter(s => s.status === 'scheduled').length,
      averageIntensity: calculateAverageIntensity(sessions),
      totalDuration: completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      averageSessionDuration: completedSessions.length > 0 
        ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length 
        : 0
    },
    biofeedback: biofeedbackStats,
    anxietyTrend,
    sessionFrequency,
    sessions: sessions.map(s => ({
      id: s._id,
      date: s.date,
      phobia: s.phobia,
      intensity: s.intensity,
      environment: s.environment,
      status: s.status,
      duration: s.duration,
      previewURL: s.previewURL,
      anxietyBefore: s.patientFeedback?.anxietyLevelBefore,
      anxietyAfter: s.patientFeedback?.anxietyLevelAfter,
      avgHeartRate: s.biofeedback?.avgHeartRate,
      avgStressLevel: s.biofeedback?.avgStressLevel
    })),
    generatedAt: new Date().toISOString()
  };

  res.json({ data: report });
});

/**
 * Get session report
 * GET /api/reports/session/:sessionId
 */
const getSessionReport = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await Session.findById(sessionId)
    .populate('patientId', 'name age gender phobia');

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  const report = {
    session: {
      id: session._id,
      date: session.date,
      duration: session.duration,
      status: session.status,
      phobia: session.phobia,
      intensity: session.intensity,
      environment: session.environment,
      previewURL: session.previewURL,
      sceneApproved: session.sceneApproved,
      approvedBy: session.approvedBy,
      approvedAt: session.approvedAt
    },
    patient: session.patientId,
    biofeedback: {
      summary: {
        avgHeartRate: session.biofeedback?.avgHeartRate,
        maxHeartRate: session.biofeedback?.maxHeartRate,
        minHeartRate: session.biofeedback?.minHeartRate,
        avgStressLevel: session.biofeedback?.avgStressLevel,
        maxStressLevel: session.biofeedback?.maxStressLevel
      },
      dataPoints: session.biofeedback?.dataPoints || []
    },
    patientFeedback: session.patientFeedback,
    therapistNotes: session.therapistNotes,
    anxietyReduction: session.patientFeedback?.anxietyLevelBefore && session.patientFeedback?.anxietyLevelAfter
      ? session.patientFeedback.anxietyLevelBefore - session.patientFeedback.anxietyLevelAfter
      : null,
    generatedAt: new Date().toISOString()
  };

  res.json({ data: report });
});

/**
 * Get summary report for all patients
 * GET /api/reports/summary
 */
const getSummaryReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Build date query
  const dateQuery = {};
  if (startDate || endDate) {
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);
  }

  // Get counts
  const [
    totalPatients,
    activePatients,
    totalSessions,
    completedSessions,
    phobiaDistribution
  ] = await Promise.all([
    Patient.countDocuments(),
    Patient.countDocuments({ status: 'active' }),
    Session.countDocuments(dateQuery.hasOwnProperty('$gte') ? { date: dateQuery } : {}),
    Session.countDocuments({ 
      status: 'completed',
      ...(dateQuery.hasOwnProperty('$gte') ? { date: dateQuery } : {})
    }),
    Patient.aggregate([
      { $group: { _id: '$phobia', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  // Get average metrics from completed sessions
  const sessionMetrics = await Session.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$duration' },
        avgIntensity: { $avg: '$intensity' },
        avgHeartRate: { $avg: '$biofeedback.avgHeartRate' },
        avgStressLevel: { $avg: '$biofeedback.avgStressLevel' }
      }
    }
  ]);

  const report = {
    overview: {
      totalPatients,
      activePatients,
      totalSessions,
      completedSessions,
      completionRate: totalSessions > 0 
        ? ((completedSessions / totalSessions) * 100).toFixed(1) + '%' 
        : '0%'
    },
    phobiaDistribution: phobiaDistribution.map(p => ({
      phobia: p._id,
      count: p.count
    })),
    averageMetrics: sessionMetrics[0] || {
      avgDuration: 0,
      avgIntensity: 0,
      avgHeartRate: 0,
      avgStressLevel: 0
    },
    generatedAt: new Date().toISOString()
  };

  res.json({ data: report });
});

// Helper Functions

/**
 * Calculate biofeedback statistics across sessions
 */
function calculateBiofeedbackStats(sessions) {
  const sessionsWithData = sessions.filter(s => s.biofeedback?.avgHeartRate);
  
  if (sessionsWithData.length === 0) {
    return null;
  }

  const heartRates = sessionsWithData.map(s => s.biofeedback.avgHeartRate);
  const stressLevels = sessionsWithData
    .filter(s => s.biofeedback?.avgStressLevel)
    .map(s => s.biofeedback.avgStressLevel);

  return {
    avgHeartRate: heartRates.reduce((a, b) => a + b, 0) / heartRates.length,
    maxHeartRate: Math.max(...heartRates),
    minHeartRate: Math.min(...heartRates),
    avgStressLevel: stressLevels.length > 0
      ? stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length
      : null,
    dataPoints: sessionsWithData.length
  };
}

/**
 * Calculate anxiety trend over sessions
 */
function calculateAnxietyTrend(sessions) {
  const sessionsWithFeedback = sessions
    .filter(s => s.patientFeedback?.anxietyLevelBefore != null && 
                 s.patientFeedback?.anxietyLevelAfter != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sessionsWithFeedback.length === 0) {
    return null;
  }

  return sessionsWithFeedback.map(s => ({
    date: s.date,
    sessionId: s._id,
    anxietyBefore: s.patientFeedback.anxietyLevelBefore,
    anxietyAfter: s.patientFeedback.anxietyLevelAfter,
    reduction: s.patientFeedback.anxietyLevelBefore - s.patientFeedback.anxietyLevelAfter
  }));
}

/**
 * Calculate session frequency
 */
function calculateSessionFrequency(sessions) {
  if (sessions.length < 2) {
    return null;
  }

  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstSession = new Date(sortedSessions[0].date);
  const lastSession = new Date(sortedSessions[sortedSessions.length - 1].date);
  const daysDiff = (lastSession - firstSession) / (1000 * 60 * 60 * 24);

  return {
    totalDays: Math.round(daysDiff),
    sessionsPerWeek: daysDiff > 0 ? ((sessions.length / daysDiff) * 7).toFixed(2) : 0,
    firstSession: firstSession.toISOString(),
    lastSession: lastSession.toISOString()
  };
}

/**
 * Calculate average intensity across sessions
 */
function calculateAverageIntensity(sessions) {
  if (sessions.length === 0) return 0;
  return sessions.reduce((sum, s) => sum + s.intensity, 0) / sessions.length;
}

module.exports = {
  getPatientReports,
  getSessionReport,
  getSummaryReport
};
