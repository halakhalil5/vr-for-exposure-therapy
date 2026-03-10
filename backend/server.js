/**
 * VR Therapy Dashboard - Main Server Entry Point
 * 
 * This Express server provides REST API endpoints for managing patients,
 * VR therapy sessions, scene generation via LLM, and Unity integration.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import routes
const patientRoutes = require('./routes/patients');
const sessionRoutes = require('./routes/sessions');
const sceneRoutes = require('./routes/scenes');
const reportRoutes = require('./routes/reports');

// Import error handling middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ============================================
// Middleware Configuration
// ============================================

// Parse JSON request bodies
app.use(express.json({ limit: '50mb' }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure CORS for frontend access
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));

// Serve static files from uploads directory (for preview images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// Database Connection
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vr_therapy_dashboard';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

// ============================================
// API Routes
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Patient management routes
app.use('/api/patients', patientRoutes);

// Session management routes
app.use('/api/sessions', sessionRoutes);

// Scene generation and Unity communication routes
app.use('/api', sceneRoutes);

// Report routes
app.use('/api/reports', reportRoutes);

// ============================================
// Error Handling
// ============================================

// 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ 
    error: 'Not Found', 
    message: `Route ${req.originalUrl} not found` 
  });
});

// Global error handler
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   VR Therapy Dashboard API Server          ║
║   Running on port ${PORT}                      ║
╚════════════════════════════════════════════╝
  
📡 API Endpoints:
   - GET  /api/health          - Health check
   - POST /api/patients        - Add new patient
   - GET  /api/patients        - List all patients
   - POST /api/sessions        - Create VR session
   - POST /api/generate-scene  - Generate scene via LLM
   - POST /api/scene-preview   - Receive Unity preview
   - GET  /api/reports/:id     - Get patient reports
  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
