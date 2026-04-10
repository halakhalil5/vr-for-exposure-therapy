/**
 * API Service
 * 
 * Centralized API client for communicating with the backend.
 * Handles all HTTP requests and error handling.
 */

import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for logging and auth
api.interceptors.request.use(
  (config) => {
    // Add timestamp to requests
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || error.response.statusText;
      
      switch (error.response.status) {
        case 400:
          toast.error(`Invalid request: ${message}`);
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(message);
      }
    } else if (error.request) {
      // Request made but no response
      toast.error('Unable to connect to server. Please check your connection.');
    } else {
      // Request setup error
      toast.error('An error occurred. Please try again.');
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// Patient API
// ============================================

export const patientAPI = {
  /**
   * Get all patients with optional filtering
   */
  getAll: async (params = {}) => {
    const response = await api.get('/patients', { params });
    return response.data;
  },

  /**
   * Get single patient by ID
   */
  getById: async (id) => {
    const response = await api.get(`/patients/${id}`);
    return response.data;
  },

  /**
   * Create new patient
   */
  create: async (patientData) => {
    const response = await api.post('/patients', patientData);
    toast.success('Patient created successfully');
    return response.data;
  },

  /**
   * Update patient
   */
  update: async (id, patientData) => {
    const response = await api.put(`/patients/${id}`, patientData);
    toast.success('Patient updated successfully');
    return response.data;
  },

  /**
   * Delete patient
   */
  delete: async (id, soft = true) => {
    const response = await api.delete(`/patients/${id}`, { 
      params: { soft: soft.toString() } 
    });
    toast.success('Patient deleted successfully');
    return response.data;
  },

  /**
   * Add therapist note to patient
   */
  addNote: async (id, note) => {
    const response = await api.post(`/patients/${id}/notes`, { note });
    toast.success('Note added successfully');
    return response.data;
  },

  /**
   * Get patient's sessions
   */
  getSessions: async (id, params = {}) => {
    const response = await api.get(`/patients/${id}/sessions`, { params });
    return response.data;
  }
};

// ============================================
// Session API
// ============================================

export const sessionAPI = {
  /**
   * Get all sessions with optional filtering
   */
  getAll: async (params = {}) => {
    const response = await api.get('/sessions', { params });
    return response.data;
  },

  /**
   * Get single session by ID
   */
  getById: async (id) => {
    const response = await api.get(`/sessions/${id}`);
    return response.data;
  },

  /**
   * Create new session
   */
  create: async (sessionData) => {
    const response = await api.post('/sessions', sessionData);
    toast.success('Session created successfully');
    return response.data;
  },

  /**
   * Update session
   */
  update: async (id, sessionData) => {
    const response = await api.put(`/sessions/${id}`, sessionData);
    toast.success('Session updated successfully');
    return response.data;
  },

  /**
   * Update scene configuration
   */
  updateScene: async (id, sceneJSON) => {
    const response = await api.patch(`/sessions/${id}/scene`, { sceneJSON });
    return response.data;
  },

  /**
   * Approve scene
   */
  approveScene: async (id, approverName = 'Therapist') => {
    const response = await api.post(`/sessions/${id}/approve`, { approverName });
    toast.success('Scene approved successfully');
    return response.data;
  },

  /**
   * Delete session
   */
  delete: async (id) => {
    const response = await api.delete(`/sessions/${id}`);
    toast.success('Session deleted successfully');
    return response.data;
  },

  /**
   * Add biofeedback data
   */
  addBiofeedback: async (id, data) => {
    const response = await api.post(`/sessions/${id}/biofeedback`, data);
    return response.data;
  },

  /**
   * Update patient feedback
   */
  updateFeedback: async (id, feedback) => {
    const response = await api.post(`/sessions/${id}/feedback`, feedback);
    toast.success('Feedback saved');
    return response.data;
  },

  /**
   * Start session
   */
  start: async (id) => {
    const response = await api.post(`/sessions/${id}/start`);
    toast.success('Session started');
    return response.data;
  },

  /**
   * Complete session
   */
  complete: async (id, data = {}) => {
    const response = await api.post(`/sessions/${id}/complete`, data);
    toast.success('Session completed');
    return response.data;
  }
};

// ============================================
// Scene API
// ============================================

export const sceneAPI = {
  /**
   * Build scene in Unity
   */
  build: async (data) => {
    const loadingToast = toast.loading('Building scene in Unity...');
    try {
      const response = await api.post('/build-scene', data);
      toast.dismiss(loadingToast);
      toast.success('Scene sent to Unity');
      return response.data;
    } catch (error) {
      toast.dismiss(loadingToast);
      throw error;
    }
  },

  /**
   * Get scene templates
   */
  getTemplates: async (phobia = null) => {
    const params = phobia ? { phobia } : {};
    const response = await api.get('/scene-templates', { params });
    return response.data;
  },

  /**
   * Validate scene configuration
   */
  validate: async (sceneJSON) => {
    const response = await api.post('/validate-scene', { sceneJSON });
    return response.data;
  }
};

// ============================================
// Report API
// ============================================

export const reportAPI = {
  /**
   * Get patient reports
   */
  getPatientReports: async (patientId, params = {}) => {
    const response = await api.get(`/reports/${patientId}`, { params });
    return response.data;
  },

  /**
   * Get session report
   */
  getSessionReport: async (sessionId) => {
    const response = await api.get(`/reports/session/${sessionId}`);
    return response.data;
  },

  /**
   * Get summary report
   */
  getSummary: async (params = {}) => {
    const response = await api.get('/reports/summary', { params });
    return response.data;
  }
};

// ============================================
// Health Check API
// ============================================

export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

export default api;
