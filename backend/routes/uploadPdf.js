/**
 * Upload PDF Route
 */

const express = require('express');
const { uploadSinglePdf } = require('../middleware/uploadPdf');
const { uploadPdfReport } = require('../controllers/pdfReportController');

const router = express.Router();

// POST /upload-pdf - Unity/React upload endpoint
router.post('/upload-pdf', uploadSinglePdf, uploadPdfReport);

module.exports = router;