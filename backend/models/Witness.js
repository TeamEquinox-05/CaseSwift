const mongoose = require('mongoose');

const WitnessSchema = new mongoose.Schema({
  // Reference to Case
  caseId: {
    type: String,
    required: true,
    index: true
  },
  caseRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case'
  },
  
  // Witness Personal Information
  name: {
    type: String,
    required: true
  },
  age: String,
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  
  // Contact Information
  address: {
    street: String,
    area: String,
    city: String,
    district: String,
    state: String,
    pincode: String,
    fullAddress: String
  },
  contactNumber: String,
  alternateNumber: String,
  email: String,
  
  // Identification
  identificationDoc: {
    type: {
      type: String,
      enum: ['Aadhaar', 'PAN', 'Voter ID', 'Passport', 'Driving License', 'Other']
    },
    number: String
  },
  
  // Witness Details
  occupation: String,
  relationToVictim: String,
  relationToAccused: String,
  
  // Statement
  statement: {
    summary: String,
    detailedStatement: String,
    recordedBy: String,
    recordedDate: Date,
    recordedAt: String, // Location where statement was recorded
    language: String,
    translator: String
  },
  
  // Witness Type
  witnessType: {
    type: String,
    enum: ['Eye Witness', 'Character Witness', 'Expert Witness', 'Material Witness', 'Other'],
    default: 'Eye Witness'
  },
  
  // Credibility
  credibilityScore: {
    type: Number,
    min: 0,
    max: 10,
    default: 5
  },
  credibilityNotes: String,
  
  // Availability
  isAvailableForCourt: {
    type: Boolean,
    default: true
  },
  availabilityNotes: String,
  
  // Legal Status
  statementRecorded: {
    type: Boolean,
    default: false
  },
  statementUnderSection: String, // e.g., "161 CrPC", "164 CrPC"
  courtAppearances: [{
    date: Date,
    courtName: String,
    purpose: String,
    notes: String
  }],
  
  // Protection Details (if witness needs protection)
  needsProtection: {
    type: Boolean,
    default: false
  },
  protectionLevel: {
    type: String,
    enum: ['None', 'Low', 'Medium', 'High', 'Critical'],
    default: 'None'
  },
  protectionNotes: String,
  
  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['Statement', 'ID Proof', 'Address Proof', 'Court Order', 'Other']
    },
    url: String,
    uploadedAt: Date,
    uploadedBy: String
  }],
  
  // Status
  status: {
    type: String,
    enum: ['Identified', 'Contacted', 'Statement Recorded', 'Court Witness', 'Unavailable', 'Hostile'],
    default: 'Identified'
  },
  
  // Added By
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Activity Log
  activityLog: [{
    action: String,
    performedBy: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String
  }],
  
  // Metadata
  notes: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: String,
  verifiedAt: Date
}, {
  timestamps: true
});

// Indexes
WitnessSchema.index({ caseId: 1, status: 1 });
WitnessSchema.index({ contactNumber: 1 });
WitnessSchema.index({ witnessType: 1 });

// Methods
WitnessSchema.methods.recordStatement = function(statement, recordedBy) {
  this.statement = {
    ...this.statement,
    ...statement,
    recordedBy,
    recordedDate: new Date()
  };
  this.statementRecorded = true;
  this.status = 'Statement Recorded';
  
  this.activityLog.push({
    action: 'Statement Recorded',
    performedBy: recordedBy,
    timestamp: new Date()
  });
  
  return this.save();
};

WitnessSchema.methods.updateStatus = function(newStatus, performedBy, details = '') {
  this.status = newStatus;
  this.activityLog.push({
    action: `Status changed to ${newStatus}`,
    performedBy,
    timestamp: new Date(),
    details
  });
  return this.save();
};

WitnessSchema.methods.addCourtAppearance = function(appearance) {
  this.courtAppearances.push(appearance);
  return this.save();
};

WitnessSchema.methods.verify = function(verifiedBy) {
  this.isVerified = true;
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  return this.save();
};

// Static methods
WitnessSchema.statics.getByCaseId = function(caseId) {
  return this.find({ caseId })
    .sort({ createdAt: 1 })
    .populate('addedBy', 'name email');
};

WitnessSchema.statics.getByStatus = function(status) {
  return this.find({ status })
    .sort({ createdAt: -1 });
};

WitnessSchema.statics.getCourtWitnesses = function(caseId) {
  return this.find({ 
    caseId,
    statementRecorded: true,
    isAvailableForCourt: true,
    status: { $ne: 'Hostile' }
  });
};

module.exports = mongoose.model('Witness', WitnessSchema);
