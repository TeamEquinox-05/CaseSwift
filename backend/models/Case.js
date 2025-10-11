const mongoose = require('mongoose');

const CaseSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  caseTitle: {
    type: String,
    required: true
  },
  caseType: {
    type: String,
    required: true,
    enum: ['Rape', 'Murder', 'Theft', 'Assault', 'Domestic Violence', 'Kidnapping', 'Other']
  },
  caseStatus: {
    type: String,
    enum: ['Draft', 'Under Investigation', 'Filed', 'Closed', 'Archived'],
    default: 'Draft'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  
  // Victim Information
  victim: {
    name: String,
    age: String,
    gender: String,
    address: String,
    contactNumber: String,
    occupation: String,
    relationToAccused: String
  },
  
  // Accused Information
  accused: {
    name: String,
    age: String,
    gender: String,
    address: String,
    occupation: String,
    previousRecords: String
  },
  
  // Incident Details
  incident: {
    description: String,
    date: String,
    time: String,
    location: String,
    exactLocation: String,
    witnesses: [String] // Array of witness IDs
  },
  
  // Medical & Evidence
  medicalExam: {
    status: {
      type: String,
      enum: ['Not Done', 'Scheduled', 'Completed', 'Pending'],
      default: 'Not Done'
    },
    date: String,
    hospital: String,
    findings: String,
    medicalReportUrl: String
  },
  
  evidence: {
    collected: Boolean,
    items: [{
      type: String,
      description: String,
      collectedBy: String,
      collectedDate: Date,
      storageLocation: String
    }],
    forensicReports: [String] // URLs or IDs
  },
  
  // Legal Compliance
  compliance: {
    ipc_sections: [String],
    fir_filed: Boolean,
    fir_number: String,
    fir_date: String,
    investigation_officer: String,
    court_assigned: String
  },
  
  // Officer Details
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  policeStation: String,
  district: String,
  state: String,
  
  // Case Documents
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  
  // Conversation Reference
  conversationSessionId: String,
  
  // Final FIR Data
  finalFIR: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Metadata
  isComplete: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  filedAt: Date,
  
  // Activity Log
  activityLog: [{
    action: String,
    performedBy: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String
  }]
}, {
  timestamps: true
});

// Indexes
CaseSchema.index({ caseStatus: 1, createdAt: -1 });
CaseSchema.index({ createdBy: 1 });
CaseSchema.index({ caseType: 1 });
CaseSchema.index({ 'incident.date': -1 });

// Methods
CaseSchema.methods.updateStatus = function(newStatus, performedBy) {
  this.caseStatus = newStatus;
  this.activityLog.push({
    action: `Status changed to ${newStatus}`,
    performedBy,
    timestamp: new Date()
  });
  return this.save();
};

CaseSchema.methods.addEvidence = function(evidenceItem) {
  this.evidence.items.push(evidenceItem);
  return this.save();
};

CaseSchema.methods.markComplete = function(firData) {
  this.isComplete = true;
  this.completedAt = new Date();
  this.finalFIR = firData;
  this.caseStatus = 'Filed';
  return this.save();
};

// Static methods
CaseSchema.statics.getByOfficer = function(officerId) {
  return this.find({ createdBy: officerId })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');
};

CaseSchema.statics.getByStatus = function(status) {
  return this.find({ caseStatus: status })
    .sort({ createdAt: -1 });
};

CaseSchema.statics.getRecent = function(limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'name email');
};

module.exports = mongoose.model('Case', CaseSchema);
