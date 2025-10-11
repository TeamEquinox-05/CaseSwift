const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  caseId: {
    type: String,
    required: true,
    index: true
  },
  caseRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case'
  },
  
  // Initial form data
  initialData: {
    caseTitle: String,
    caseType: String,
    victimAge: String,
    incidentDate: String,
    location: String,
    initialDescription: String
  },
  
  // Conversation messages
  messages: [{
    role: {
      type: String,
      enum: ['ai', 'user', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Extracted structured data from conversation
  extractedData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Progress tracking (0-100 for each section)
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
  
  // Overall progress
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Conversation state
  conversationState: {
    type: String,
    enum: ['active', 'paused', 'completed', 'abandoned'],
    default: 'active'
  },
  
  // Session metadata
  startedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  
  // AI Model Info
  modelUsed: {
    type: String,
    default: 'llama3.2'
  },
  totalTokensUsed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
ConversationSchema.index({ caseId: 1, createdAt: -1 });
ConversationSchema.index({ conversationState: 1 });
ConversationSchema.index({ lastActiveAt: -1 });

// Virtual for message count
ConversationSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Methods
ConversationSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata
  });
  this.lastActiveAt = new Date();
  return this.save();
};

ConversationSchema.methods.updateExtractedData = function(newData) {
  this.extractedData = { ...this.extractedData, ...newData };
  return this.save();
};

ConversationSchema.methods.updateProgress = function(section, value) {
  if (this.progress.hasOwnProperty(section)) {
    this.progress[section] = Math.min(100, Math.max(0, value));
    
    // Calculate overall progress
    const sections = Object.values(this.progress);
    this.overallProgress = Math.round(
      sections.reduce((sum, val) => sum + val, 0) / sections.length
    );
  }
  return this.save();
};

ConversationSchema.methods.markComplete = function() {
  this.conversationState = 'completed';
  this.completedAt = new Date();
  this.overallProgress = 100;
  return this.save();
};

ConversationSchema.methods.pause = function() {
  this.conversationState = 'paused';
  return this.save();
};

ConversationSchema.methods.resume = function() {
  this.conversationState = 'active';
  this.lastActiveAt = new Date();
  return this.save();
};

// Static methods
ConversationSchema.statics.getActiveConversations = function() {
  return this.find({ conversationState: 'active' })
    .sort({ lastActiveAt: -1 });
};

ConversationSchema.statics.getByCaseId = function(caseId) {
  return this.find({ caseId })
    .sort({ createdAt: -1 });
};

ConversationSchema.statics.getRecent = function(limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('sessionId caseId conversationState overallProgress createdAt');
};

module.exports = mongoose.model('Conversation', ConversationSchema);
