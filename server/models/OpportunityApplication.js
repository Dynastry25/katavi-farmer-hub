const mongoose = require('mongoose');

const APPLICATION_STATUSES = [
  'pending',
  'shortlisted',
  'accepted',
  'rejected',
  'withdrawn',
  'completed',
];

const opportunityApplicationSchema = new mongoose.Schema({
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicantName: { type: String, required: true, trim: true },
  message: { type: String, default: '', maxlength: 1000 },
  // Snapshot of what the applicant offered so later profile edits do not
  // rewrite the employer's record of the application.
  experience: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: APPLICATION_STATUSES, default: 'pending' },
  statusUpdatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

opportunityApplicationSchema.index({ opportunity: 1, applicant: 1 }, { unique: true });
opportunityApplicationSchema.index({ applicant: 1, createdAt: -1 });
opportunityApplicationSchema.index({ opportunity: 1, status: 1 });

module.exports = mongoose.model('OpportunityApplication', opportunityApplicationSchema);
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
