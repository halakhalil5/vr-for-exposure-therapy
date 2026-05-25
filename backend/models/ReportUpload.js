/**
 * Report Upload Model
 *
 * Stores metadata for uploaded therapeutic session PDF reports.
 */

const mongoose = require('mongoose');

const reportUploadSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  storedFileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true,
    default: 'application/pdf'
  },
  sizeBytes: {
    type: Number,
    required: true,
    min: 1
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  versionKey: false
});

module.exports = mongoose.model('ReportUpload', reportUploadSchema);