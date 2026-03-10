/**
 * Report Routes
 * 
 * API routes for therapy reports and analytics.
 */

const express = require('express');
const router = express.Router();
const {
  getPatientReports,
  getSessionReport,
  getSummaryReport
} = require('../controllers/reportController');

// GET /api/reports/summary - Get overall summary report
router.get('/summary', getSummaryReport);

// GET /api/reports/:patientId - Get all reports for a patient
router.get('/:patientId', getPatientReports);

// GET /api/reports/session/:sessionId - Get single session report
router.get('/session/:sessionId', getSessionReport);

module.exports = router;
