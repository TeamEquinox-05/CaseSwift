const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  
  // Officer Details
  badgeNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  rank: {
    type: String,
    enum: ['Constable', 'Head Constable', 'ASI', 'SI', 'Inspector', 'DSP', 'SP', 'DIG', 'IG', 'DGP', 'Admin'],
    default: 'Constable'
  },
  
  // Department Info
  policeStation: String,
  district: String,
  state: String,
  department: {
    type: String,
    enum: ['Crime Branch', 'Traffic', 'Cyber Crime', 'Women & Child', 'Narcotics', 'General', 'Admin'],
    default: 'General'
  },
  
  // Contact
  phoneNumber: String,
  alternatePhone: String,
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['officer', 'supervisor', 'admin', 'investigator'],
    default: 'officer'
  },
  permissions: [{
    type: String,
    enum: ['create_case', 'edit_case', 'delete_case', 'view_all_cases', 'assign_cases', 'approve_fir', 'manage_users']
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Activity
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Cases
  casesCreated: {
    type: Number,
    default: 0
  },
  casesAssigned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case'
  }],
  
  // Profile
  profilePicture: String,
  bio: String,
  
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Account Management
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date
}, {
  timestamps: true
});

// Indexes
UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ policeStation: 1, isActive: 1 });
UserSchema.index({ role: 1 });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update last login
UserSchema.methods.recordLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

// Method to add permission
UserSchema.methods.addPermission = function(permission) {
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
    return this.save();
  }
  return this;
};

// Method to check permission
UserSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || this.role === 'admin';
};

// Static methods
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

UserSchema.statics.getActiveOfficers = function(policeStation = null) {
  const query = { isActive: true, isVerified: true };
  if (policeStation) query.policeStation = policeStation;
  
  return this.find(query)
    .select('name email rank badgeNumber policeStation department')
    .sort({ rank: 1, name: 1 });
};

UserSchema.statics.getByStation = function(policeStation) {
  return this.find({ policeStation, isActive: true })
    .select('name email rank badgeNumber department')
    .sort({ rank: 1 });
};

// Remove password from JSON output
UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
