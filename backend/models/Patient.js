/**
 * Patient Model
 * 
 * Represents a patient in the VR exposure therapy system.
 * Contains personal information, phobia details, and session references.
 */

const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  // Basic patient information
  name: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  age: {
    type: Number,
    required: [true, 'Patient age is required'],
    min: [1, 'Age must be at least 1'],
    max: [150, 'Age cannot exceed 150']
  },
  
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: {
      values: ['male', 'female', 'other', 'prefer-not-to-say'],
      message: '{VALUE} is not a valid gender option'
    }
  },
  
  // Primary phobia being treated
  phobia: {
    type: String,
    required: [true, 'Primary phobia is required'],
    enum: {
      values: [
        'arachnophobia',      // Fear of spiders
        'acrophobia',         // Fear of heights
        'claustrophobia',     // Fear of confined spaces
        'agoraphobia',        // Fear of open spaces
        'social-anxiety',     // Social anxiety disorder
        'glossophobia',       // Fear of public speaking
        'aviophobia',         // Fear of flying
        'cynophobia',         // Fear of dogs
        'ophidiophobia',      // Fear of snakes
        'trypanophobia',      // Fear of needles
        'dentophobia',        // Fear of dentists
        'other'               // Other phobias
      ],
      message: '{VALUE} is not a supported phobia type'
    }
  },
  
  // Additional phobia description (for 'other' or more details)
  phobiaDescription: {
    type: String,
    maxlength: [500, 'Phobia description cannot exceed 500 characters']
  },
  
  // Contact information
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  
  phone: {
    type: String,
    trim: true
  },
  
  // Medical notes and history
  medicalNotes: {
    type: String,
    maxlength: [2000, 'Medical notes cannot exceed 2000 characters']
  },
  
  // Emergency contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  
  // Array of session references
  sessions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  }],
  
  // Patient status
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'on-hold'],
    default: 'active'
  },
  
  // Therapist notes about the patient
  therapistNotes: [{
    note: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  // Schema options
  timestamps: true // Adds createdAt and updatedAt fields
});

// Index for searching patients
patientSchema.index({ name: 'text', phobia: 1 });

// Virtual for full display name with age
patientSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.age} years old)`;
});

// Method to add a session to the patient
patientSchema.methods.addSession = async function(sessionId) {
  if (!this.sessions.includes(sessionId)) {
    this.sessions.push(sessionId);
    await this.save();
  }
  return this;
};

// Static method to find patients by phobia type
patientSchema.statics.findByPhobia = function(phobiaType) {
  return this.find({ phobia: phobiaType, status: 'active' });
};

// Pre-save middleware to validate data
patientSchema.pre('save', function(next) {
  // Ensure phobiaDescription is provided for 'other' phobia type
  if (this.phobia === 'other' && !this.phobiaDescription) {
    this.phobiaDescription = 'Unspecified phobia';
  }
  next();
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
