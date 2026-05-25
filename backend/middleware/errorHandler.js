/**
 * Error Handler Middleware
 * 
 * Centralized error handling for the Express application.
 * Formats errors consistently and logs them for debugging.
 */

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'The provided ID is not valid'
    });
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      error: 'Duplicate Entry',
      message: `A record with this ${field} already exists`
    });
  }

  // Handle JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'The request body contains invalid JSON'
    });
  }

  // Handle file upload errors (Multer)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File Too Large',
      message: 'The uploaded file exceeds the size limit'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Invalid File Field',
      message: 'Unexpected upload field. Use multipart/form-data field "pdf".'
    });
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: 'Invalid File Type',
      message: err.message || 'Only PDF files are allowed'
    });
  }

  // Handle custom API errors
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      error: err.name || 'Error',
      message: err.message
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  res.status(statusCode).json({
    error: 'Server Error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = errorHandler;
module.exports.ApiError = ApiError;
module.exports.asyncHandler = asyncHandler;
