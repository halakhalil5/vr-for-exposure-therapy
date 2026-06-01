/**
 * Session Model
 * 
 * Represents a VR therapy session with scene configuration,
 * biofeedback data, and session outcomes.
 */

const mongoose = require('mongoose');

// Sub-schema for biofeedback data points
const biofeedbackDataSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  heartRate: {
    type: Number,
    min: 0,
    max: 300
  },
  stressLevel: {
    type: Number,
    min: 0,
    max: 100  // 0-100 scale
  },
  skinConductance: {
    type: Number,
    min: 0
  },
  respirationRate: {
    type: Number,
    min: 0,
    max: 60
  }
}, { _id: false });

// Sub-schema for scene objects
const sceneObjectSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  name: String,
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    z: { type: Number, default: 0 }
  },
  rotation: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    z: { type: Number, default: 0 }
  },
  scale: {
    x: { type: Number, default: 1 },
    y: { type: Number, default: 1 },
    z: { type: Number, default: 1 }
  },
  properties: {
    type: mongoose.Schema.Types.Mixed // Flexible properties for different object types
  }
}, { _id: false });

// Main Session Schema
const sessionSchema = new mongoose.Schema({
  // Reference to the patient
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required']
  },
  
  // Phobia being addressed in this session
  phobia: {
    type: String,
    required: [true, 'Phobia type is required'],
    enum: [
      'arachnophobia', 'acrophobia', 'claustrophobia', 'agoraphobia',
      'social-anxiety', 'glossophobia', 'aviophobia', 'cynophobia',
      'ophidiophobia', 'trypanophobia', 'dentophobia', 'other'
    ]
  },
  
  // Intensity level of the exposure (1-10 scale)
  intensity: {
    type: Number,
    required: [true, 'Intensity level is required'],
    min: [1, 'Intensity must be at least 1'],
    max: [10, 'Intensity cannot exceed 10']
  },
  
  // VR Environment type
  environment: {
    type: String,
    required: [true, 'Environment is required'],
    enum: {
      values: [
        'living-room',      // Living room environment
        'indoor-room',       // Simple room
        'outdoor-park',      // Park or garden
        'office',            // Office building
        'building',          // Generic building interior
        'house',             // House living room
        'elevator',          // Elevator/small space
        'rooftop',           // High building rooftop
        'bridge',            // Bridge or overpass
        'cliff-edge',        // Cliff edge environment
        'cliff',             // Glass bridge / cliff environment
        'cave',              // Cave environment
        'airplane',          // Inside airplane
        'airport',           // Airport terminal
        'picture-room',      // Picture prompt environment
        'picture_room',      // Picture prompt environment (Unity key)
        'forest',            // Forest environment
        'beach',             // Beach setting
        'city-street',       // Urban street
        'medical-office',    // Doctor's office
        'presentation-room', // Conference/presentation room
        'bedroom',           // Bedroom environment
        'custom'             // Custom environment
      ]
    }
  },

  // Therapist-selected scene template
  sceneTemplate: {
    type: String,
    enum: [
      'living-room',
      'road-with-skyscrappers',
      'rooftop',
      'cliff-edge',
      'glass-bridge',
      'word-room',
      'building',
      'house',
      'cave',
      'elevator',
      'airplane',
      'airport',
      'picture-room',
      'bedroom'
    ]
  },

  // Therapist-written scene description for LLM guidance
  sceneDescription: {
    type: String,
    maxlength: [1000, 'Scene description cannot exceed 1000 characters']
  },
  
  // Complete scene configuration in JSON format
  sceneJSON: {
    // Environment settings
    environment: {
      type: String,
      skybox: String,
      lighting: {
        type: { type: String, default: 'natural' },
        intensity: { type: Number, default: 1 },
        color: { type: String, default: '#FFFFFF' },
        timeOfDay: { type: String, default: 'day' }
      },
      weather: {
        type: { type: String, default: 'clear' },
        intensity: { type: Number, default: 0 }
      },
      ambientSounds: [String]
    },
    
    // Array of objects in the scene
    objects: [sceneObjectSchema],
    
    // Trigger objects (phobia-related)
    triggers: [{
      type: { type: String },
      count: Number,
      behavior: String,
      position: mongoose.Schema.Types.Mixed
    }],
    
    // Camera/VR settings
    camera: {
      startPosition: {
        x: Number,
        y: Number,
        z: Number
      },
      allowMovement: { type: Boolean, default: true },
      movementBounds: mongoose.Schema.Types.Mixed
    }
  },
  
  // URL to the Unity-generated preview image
  previewURL: {
    type: String,
    default: null
  },
  
  // Multiple preview images (if available)
  previewImages: [{
    url: String,
    type: { type: String, enum: ['main', 'angle1', 'angle2', 'thumbnail'] },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Session date and time
  date: {
    type: Date,
    default: Date.now
  },
  
  // Scheduled session time (if different from creation date)
  scheduledDate: {
    type: Date
  },
  
  // Session duration in minutes
  duration: {
    type: Number,
    min: 0
  },
  
  // Session status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Biofeedback data collected during session
  biofeedback: {
    // Summary statistics
    avgHeartRate: Number,
    maxHeartRate: Number,
    minHeartRate: Number,
    avgStressLevel: Number,
    maxStressLevel: Number,
    
    // Detailed data points
    dataPoints: [biofeedbackDataSchema]
  },
  
  // Therapist notes for the session
  therapistNotes: {
    preSession: String, // Notes before session
    during: String,     // Notes during session
    postSession: String // Notes after session
  },
  
  // Patient reported outcomes
  patientFeedback: {
    anxietyLevelBefore: { type: Number, min: 0, max: 10 },
    anxietyLevelAfter: { type: Number, min: 0, max: 10 },
    comments: String
  },
  
  // Scene approval status
  sceneApproved: {
    type: Boolean,
    default: false
  },
  
  // Who approved the scene
  approvedBy: {
    type: String
  },
  
  // Approval timestamp
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
sessionSchema.index({ patientId: 1, date: -1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ phobia: 1 });

// Virtual to calculate session effectiveness
sessionSchema.virtual('anxietyReduction').get(function() {
  if (this.patientFeedback?.anxietyLevelBefore && this.patientFeedback?.anxietyLevelAfter) {
    return this.patientFeedback.anxietyLevelBefore - this.patientFeedback.anxietyLevelAfter;
  }
  return null;
});

// Method to add biofeedback data point
sessionSchema.methods.addBiofeedbackData = async function(data) {
  this.biofeedback.dataPoints.push({
    timestamp: new Date(),
    heartRate: data.heartRate,
    stressLevel: data.stressLevel,
    skinConductance: data.skinConductance,
    respirationRate: data.respirationRate
  });
  
  // Update summary statistics
  const heartRates = this.biofeedback.dataPoints
    .map(d => d.heartRate)
    .filter(hr => hr != null);
  
  if (heartRates.length > 0) {
    this.biofeedback.avgHeartRate = heartRates.reduce((a, b) => a + b, 0) / heartRates.length;
    this.biofeedback.maxHeartRate = Math.max(...heartRates);
    this.biofeedback.minHeartRate = Math.min(...heartRates);
  }
  
  const stressLevels = this.biofeedback.dataPoints
    .map(d => d.stressLevel)
    .filter(sl => sl != null);
  
  if (stressLevels.length > 0) {
    this.biofeedback.avgStressLevel = stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length;
    this.biofeedback.maxStressLevel = Math.max(...stressLevels);
  }
  
  await this.save();
  return this;
};

// Method to approve the scene
sessionSchema.methods.approveScene = async function(approverName) {
  this.sceneApproved = true;
  this.approvedBy = approverName;
  this.approvedAt = new Date();
  await this.save();
  return this;
};

// Static method to find sessions by patient
sessionSchema.statics.findByPatient = function(patientId) {
  return this.find({ patientId }).sort({ date: -1 });
};

// Static method to find recent sessions
sessionSchema.statics.findRecent = function(limit = 10) {
  return this.find()
    .sort({ date: -1 })
    .limit(limit)
    .populate('patientId', 'name phobia');
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
