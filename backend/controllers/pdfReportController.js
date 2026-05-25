/**
 * PDF Report Controller
 *
 * Handles upload, listing, and download of therapeutic session PDF reports.
 */

const fs = require('fs/promises');
const path = require('path');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const {
  reportsUploadDir,
  isPdfBuffer,
  storeUploadedReport,
  listUploadedReports,
  getUploadedReportById
} = require('../services/pdfReportService');

/**
 * POST /upload-pdf
 */
const uploadPdfReport = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError('Missing file. Upload a PDF using multipart/form-data field "pdf".', 400);
  }

  if (!isPdfBuffer(req.file.buffer)) {
    throw new ApiError('Invalid PDF file. The uploaded content is not a valid PDF.', 400);
  }

  const saved = await storeUploadedReport(req, req.file);

  return res.status(201).json({
    status: 'success',
    message: 'PDF report uploaded successfully',
    fileUrl: saved.fileUrl,
    downloadUrl: saved.downloadUrl,
    reportId: saved.reportId,
    uploadedAt: saved.uploadedAt
  });
});

/**
 * GET /api/reports/uploads
 */
const getUploadedReports = asyncHandler(async (req, res) => {
  const reports = await listUploadedReports(req, req.query.limit);

  return res.json({
    status: 'success',
    message: 'Uploaded reports fetched successfully',
    data: reports
  });
});

/**
 * GET /api/reports/uploads/:reportId/download
 */
const downloadUploadedReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const report = await getUploadedReportById(reportId);

  if (!report) {
    throw new ApiError('Report not found', 404);
  }

  const absolutePath = path.join(reportsUploadDir, report.storedFileName);

  try {
    await fs.access(absolutePath);
  } catch (err) {
    throw new ApiError('Stored PDF file not found on server', 404);
  }

  res.setHeader('Content-Type', 'application/pdf');
  return res.download(absolutePath, report.originalName || `${report.reportId}.pdf`);
});

module.exports = {
  uploadPdfReport,
  getUploadedReports,
  downloadUploadedReport
};