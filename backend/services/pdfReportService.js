/**
 * PDF Report Service
 *
 * Business logic for validating, storing, and retrieving uploaded PDF reports.
 */

const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ReportUpload = require('../models/ReportUpload');

const reportsUploadDir = path.join(__dirname, '..', 'uploads', 'reports');

const ensureReportsUploadDir = async () => {
  await fs.mkdir(reportsUploadDir, { recursive: true });
};

const isPdfBuffer = (buffer) => {
  if (!buffer || buffer.length < 5) {
    return false;
  }

  // PDF files start with "%PDF-"
  return buffer.subarray(0, 5).toString('utf8') === '%PDF-';
};

const sanitizeFileName = (name) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const buildBaseUrl = (req) => {
  if (process.env.PUBLIC_API_BASE_URL) {
    return process.env.PUBLIC_API_BASE_URL.replace(/\/$/, '');
  }

  return `${req.protocol}://${req.get('host')}`;
};

const createStoredFileName = (reportId, originalName) => {
  const parsed = path.parse(originalName || 'report.pdf');
  const safeBase = sanitizeFileName(parsed.name || 'report');
  return `${reportId}-${safeBase}.pdf`;
};

const storeUploadedReport = async (req, file) => {
  await ensureReportsUploadDir();

  const reportId = uuidv4();
  const storedFileName = createStoredFileName(reportId, file.originalname);
  const absolutePath = path.join(reportsUploadDir, storedFileName);
  const relativePath = path.posix.join('uploads', 'reports', storedFileName);

  await fs.writeFile(absolutePath, file.buffer);

  const uploadedAt = new Date();

  await ReportUpload.create({
    reportId,
    originalName: file.originalname,
    storedFileName,
    filePath: relativePath,
    mimeType: 'application/pdf',
    sizeBytes: file.size,
    uploadedAt
  });

  const baseUrl = buildBaseUrl(req);

  return {
    reportId,
    uploadedAt: uploadedAt.toISOString(),
    fileUrl: `${baseUrl}/${relativePath}`,
    downloadUrl: `${baseUrl}/api/reports/uploads/${reportId}/download`
  };
};

const listUploadedReports = async (req, limit = 100) => {
  const cappedLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const baseUrl = buildBaseUrl(req);

  const docs = await ReportUpload.find({})
    .sort({ uploadedAt: -1 })
    .limit(cappedLimit)
    .lean();

  return docs.map((doc) => ({
    reportId: doc.reportId,
    fileName: doc.originalName,
    sizeBytes: doc.sizeBytes,
    uploadedAt: doc.uploadedAt,
    fileUrl: `${baseUrl}/${doc.filePath}`,
    downloadUrl: `${baseUrl}/api/reports/uploads/${doc.reportId}/download`
  }));
};

const getUploadedReportById = async (reportId) => {
  return ReportUpload.findOne({ reportId }).lean();
};

module.exports = {
  reportsUploadDir,
  isPdfBuffer,
  storeUploadedReport,
  listUploadedReports,
  getUploadedReportById
};