const mongoose = require('mongoose');

const EvidenceSchema = new mongoose.Schema({
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
  
  // Evidence Identification
  evidenceId: {
    type: String,
    unique: true,
    required: true
  },
  evidenceType: {
    type: String,
    required: true,
    enum: [
      'Physical Evidence',
      'Documentary Evidence',
      'Digital Evidence',
      'Testimonial Evidence',
      'Forensic Evidence',
      'Photographic Evidence',
      'Video Evidence',
      'Audio Evidence',
      'Weapon',
      'Biological Sample',
      'Other'
    ]
  },
  
  // Evidence Details
  description: {
    type: String,
    required: true
  },
  detailedDescription: String,
  category: String, // e.g., "Blood Sample", "Mobile Phone", "CCTV Footage"
  
  // Collection Details
  collectedDate: {
    type: Date,
    required: true
  },
  collectedTime: String,
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collectionLocation: {
    exactLocation: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Chain of Custody
  chainOfCustody: [{
    transferredFrom: String,
    transferredTo: String,
    transferDate: Date,
    purpose: String,
    condition: String,
    signature: String,
    notes: String
  }],
  
  // Current Status
  currentLocation: {
    type: String,
    required: true,
    default: 'Evidence Room'
  },
  currentCustodian: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Physical Details
  quantity: {
    value: Number,
    unit: String
  },
  condition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Contaminated'],
    default: 'Good'
  },
  conditionNotes: String,
  
  // Storage
  storageLocation: {
    room: String,
    shelf: String,
    box: String,
    identifier: String
  },
  storageConditions: String, // e.g., "Refrigerated", "Room Temperature", "Sealed"
  
  // Forensic Analysis
  forensicExam: {
    required: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['Not Required', 'Pending', 'In Progress', 'Completed'],
      default: 'Not Required'
    },
    sentToLab: Date,
    labName: String,
    examType: String,
    reportReceived: Boolean,
    reportDate: Date,
    reportUrl: String,
    findings: String
  },
  
  // Legal Status
  seized: {
    type: Boolean,
    default: false
  },
  seizureMemo: {
    number: String,
    date: Date,
    witnessedBy: [String]
  },
  
  // Court Presentation
  presentedInCourt: {
    type: Boolean,
    default: false
  },
  courtPresentations: [{
    date: Date,
    courtName: String,
    purpose: String,
    outcome: String
  }],
  
  // Documentation
  photographs: [{
    url: String,
    caption: String,
    takenBy: String,
    takenAt: Date
  }],
  documents: [{
    type: String,
    url: String,
    uploadedAt: Date
  }],
  
  // Tags and Classification
  tags: [String],
  relevanceScore: {
    type: Number,
    min: 0,
    max: 10,
    default: 5
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['Collected', 'In Storage', 'Under Examination', 'Examined', 'Presented in Court', 'Disposed', 'Missing'],
    default: 'Collected'
  },
  
  // Disposal
  disposalDate: Date,
  disposalMethod: String,
  disposalAuthorizedBy: String,
  
  // Security
  isSealed: {
    type: Boolean,
    default: false
  },
  sealNumber: String,
  
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
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  }
}, {
  timestamps: true
});

// Indexes
EvidenceSchema.index({ caseId: 1, status: 1 });
EvidenceSchema.index({ evidenceId: 1 });
EvidenceSchema.index({ evidenceType: 1 });
EvidenceSchema.index({ collectedDate: -1 });

// Methods
EvidenceSchema.methods.transferCustody = function(fromPerson, toPerson, purpose, condition) {
  this.chainOfCustody.push({
    transferredFrom: fromPerson,
    transferredTo: toPerson,
    transferDate: new Date(),
    purpose,
    condition
  });
  
  this.activityLog.push({
    action: 'Custody Transfer',
    performedBy: fromPerson,
    timestamp: new Date(),
    details: `Transferred to ${toPerson} for ${purpose}`
  });
  
  return this.save();
};

EvidenceSchema.methods.sendForForensics = function(labName, examType) {
  this.forensicExam.required = true;
  this.forensicExam.status = 'In Progress';
  this.forensicExam.sentToLab = new Date();
  this.forensicExam.labName = labName;
  this.forensicExam.examType = examType;
  this.status = 'Under Examination';
  
  this.activityLog.push({
    action: 'Sent for Forensic Examination',
    timestamp: new Date(),
    details: `${examType} at ${labName}`
  });
  
  return this.save();
};

EvidenceSchema.methods.recordForensicReport = function(reportUrl, findings) {
  this.forensicExam.status = 'Completed';
  this.forensicExam.reportReceived = true;
  this.forensicExam.reportDate = new Date();
  this.forensicExam.reportUrl = reportUrl;
  this.forensicExam.findings = findings;
  this.status = 'Examined';
  
  this.activityLog.push({
    action: 'Forensic Report Received',
    timestamp: new Date()
  });
  
  return this.save();
};

EvidenceSchema.methods.presentInCourt = function(courtName, purpose) {
  this.presentedInCourt = true;
  this.courtPresentations.push({
    date: new Date(),
    courtName,
    purpose
  });
  
  this.activityLog.push({
    action: 'Presented in Court',
    timestamp: new Date(),
    details: `${courtName} - ${purpose}`
  });
  
  return this.save();
};

// Static methods
EvidenceSchema.statics.getByCaseId = function(caseId) {
  return this.find({ caseId })
    .sort({ collectedDate: 1 })
    .populate('collectedBy', 'name badgeNumber');
};

EvidenceSchema.statics.getPendingForensics = function() {
  return this.find({ 
    'forensicExam.required': true,
    'forensicExam.status': { $in: ['Pending', 'In Progress'] }
  })
    .sort({ 'forensicExam.sentToLab': 1 });
};

EvidenceSchema.statics.getByType = function(evidenceType) {
  return this.find({ evidenceType })
    .sort({ collectedDate: -1 });
};

module.exports = mongoose.model('Evidence', EvidenceSchema);
