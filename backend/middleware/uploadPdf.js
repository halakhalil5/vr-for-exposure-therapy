/**
 * Upload PDF Middleware
 *
 * Handles multipart/form-data parsing for Unity/React PDF uploads.
 */

const multer = require('multer');

const MAX_FILE_SIZE_BYTES = Number(process.env.PDF_MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024);
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'application/x-pdf']);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const isPdfMime = ALLOWED_MIME_TYPES.has((file.mimetype || '').toLowerCase());

  if (!isPdfMime) {
    const err = new Error('Invalid file type. Only PDF files are allowed.');
    err.code = 'INVALID_FILE_TYPE';
    return cb(err);
  }

  return cb(null, true);
};

const uploader = multer({
  storage,
  fileFilter,
  limits: {
    files: 1,
    fileSize: MAX_FILE_SIZE_BYTES
  }
});

const uploadSinglePdf = (req, res, next) => {
  uploader.single('pdf')(req, res, next);
};

module.exports = {
  uploadSinglePdf,
  MAX_FILE_SIZE_BYTES
};