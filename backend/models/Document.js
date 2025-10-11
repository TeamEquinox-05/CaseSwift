const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
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
  
  // Document Details
  documentType: {
    type: String,
    required: true,
    enum: [
      'FIR',
      'Complaint',
      'Statement',
      'Medical Report',
      'Forensic Report',
      'Court Order',
      'Charge Sheet',
      'Investigation Report',
      'Witness Statement',
      'Seizure Memo',
      'Arrest Memo',
      'Bail Application',
      'Case Diary',
      'Photo',
      'Video',
      'Audio Recording',
      'Other'
    ]
  },
  
  title: {
    type: String,
    required: true
  },
  description: String,
  
  // File Information
  fileName: String,
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: Number, // in bytes
  mimeType: String,
  fileExtension: String,
  
  // Document Content (for generated documents)
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Generation Info (for AI-generated documents)
  isGenerated: {
    type: Boolean,
    default: false
  },
  generatedBy: {
    system: String, // e.g., "AI", "Manual"
    model: String,
    timestamp: Date
  },
  
  // Document Status
  status: {
    type: String,
    enum: ['Draft', 'Under Review', 'Approved', 'Finalized', 'Submitted', 'Archived'],
    default: 'Draft'
  },
  
  // Version Control
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    fileUrl: String,
    modifiedBy: String,
    modifiedAt: Date,
    changes: String
  }],
  
  // Upload Information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  
  // Review & Approval
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  
  // Legal Relevance
  isConfidential: {
    type: Boolean,
    default: false
  },
  accessLevel: {
    type: String,
    enum: ['Public', 'Internal', 'Restricted', 'Confidential', 'Top Secret'],
    default: 'Internal'
  },
  
  // Court Submission
  submittedToCourt: {
    type: Boolean,
    default: false
  },
  courtSubmissions: [{
    courtName: String,
    submittedDate: Date,
    acknowledgementNumber: String
  }],
  
  // Tags and Categories
  tags: [String],
  category: String,
  
  // Related Documents
  relatedDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  
  // Signatures (for official documents)
  signatures: [{
    signedBy: String,
    designation: String,
    signedAt: Date,
    digitalSignature: String
  }],
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
  
  // Archival
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  
  notes: String
}, {
  timestamps: true
});

// Indexes
DocumentSchema.index({ caseId: 1, documentType: 1 });
DocumentSchema.index({ status: 1 });
DocumentSchema.index({ uploadedAt: -1 });
DocumentSchema.index({ documentType: 1, createdAt: -1 });

// Methods
DocumentSchema.methods.approve = function(approver, notes = '') {
  this.status = 'Approved';
  this.approvedBy = approver;
  this.approvedAt = new Date();
  this.reviewNotes = notes;
  
  this.activityLog.push({
    action: 'Document Approved',
    performedBy: approver.toString(),
    timestamp: new Date(),
    details: notes
  });
  
  return this.save();
};

DocumentSchema.methods.createNewVersion = function(newFileUrl, modifiedBy, changes) {
  this.previousVersions.push({
    version: this.version,
    fileUrl: this.fileUrl,
    modifiedBy,
    modifiedAt: new Date(),
    changes
  });
  
  this.version += 1;
  this.fileUrl = newFileUrl;
  
  this.activityLog.push({
    action: `Version ${this.version} Created`,
    performedBy: modifiedBy,
    timestamp: new Date(),
    details: changes
  });
  
  return this.save();
};

DocumentSchema.methods.submitToCourt = function(courtName, acknowledgementNumber) {
  this.submittedToCourt = true;
  this.courtSubmissions.push({
    courtName,
    submittedDate: new Date(),
    acknowledgementNumber
  });
  this.status = 'Submitted';
  
  this.activityLog.push({
    action: 'Submitted to Court',
    timestamp: new Date(),
    details: `${courtName} - Ack: ${acknowledgementNumber}`
  });
  
  return this.save();
};

DocumentSchema.methods.addSignature = function(signedBy, designation, digitalSignature) {
  this.signatures.push({
    signedBy,
    designation,
    signedAt: new Date(),
    digitalSignature
  });
  
  return this.save();
};

// Static methods
DocumentSchema.statics.getByCaseId = function(caseId) {
  return this.find({ caseId })
    .sort({ uploadedAt: -1 })
    .populate('uploadedBy', 'name email badgeNumber');
};

DocumentSchema.statics.getByType = function(documentType) {
  return this.find({ documentType })
    .sort({ uploadedAt: -1 });
};

DocumentSchema.statics.getPendingApproval = function() {
  return this.find({ status: 'Under Review' })
    .sort({ uploadedAt: 1 })
    .populate('uploadedBy', 'name email');
};

DocumentSchema.statics.getRecentFIRs = function(limit = 10) {
  return this.find({ documentType: 'FIR', status: 'Finalized' })
    .sort({ approvedAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Document', DocumentSchema);
