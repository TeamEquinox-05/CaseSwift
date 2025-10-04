const mongoose = require('mongoose');

const ConversationalCaseSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Initial case data from form
  initialData: {
    caseTitle: String,
    caseType: String,
    victimAge: String,
    incidentDate: String,
    location: String,
    initialDescription: String
  },
  // Conversation history
  conversationHistory: [{
    role: {
      type: String,
      enum: ['ai', 'user'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Extracted data from conversation
  extractedData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Progress tracking
  progress: {
    case_info: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    evidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    compliance: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    witnesses: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  // Final structured case data (when complete)
  structuredCaseData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Completion status
  isComplete: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  // Metadata
  createdBy: String,
  officerName: String,
  department: String
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for faster queries
ConversationalCaseSchema.index({ caseId: 1, createdAt: -1 });
ConversationalCaseSchema.index({ isComplete: 1 });
ConversationalCaseSchema.index({ createdAt: -1 });

// Virtual for conversation count
ConversationalCaseSchema.virtual('messageCount').get(function() {
  return this.conversationHistory.length;
});

// Method to add message to conversation
ConversationalCaseSchema.methods.addMessage = function(role, content) {
  this.conversationHistory.push({
    role,
    content,
    timestamp: new Date()
  });
  return this.save();
};

// Method to mark as complete
ConversationalCaseSchema.methods.markComplete = function(structuredData) {
  this.isComplete = true;
  this.completedAt = new Date();
  this.structuredCaseData = structuredData;
  return this.save();
};

// Static method to get recent conversations
ConversationalCaseSchema.statics.getRecent = function(limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('caseId sessionId initialData isComplete createdAt updatedAt');
};

// Static method to get conversations for a case
ConversationalCaseSchema.statics.getByCaseId = function(caseId) {
  return this.find({ caseId })
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('ConversationalCase', ConversationalCaseSchema);
