import mongoose from 'mongoose';

export const VISIT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
};

export const ACTION = {
  CREATED: 'created',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  CANCELLED: 'cancelled',
  REMARKED: 'remark_added',
};

const activitySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: {
        values: Object.values(ACTION),
        message: 'Invalid action',
      },
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: String,
  },
  { _id: false }
);

const visitRequestSchema = new mongoose.Schema(
  {
    visitor: {
      name: { type: String, required: [true, 'Visitor name is required'], trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, required: [true, 'Visitor phone is required'], trim: true },
      company: { type: String, trim: true },
      address: { type: String, trim: true },
      idType: { type: String, trim: true },
      idNumber: { type: String, trim: true },
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee to visit is required'],
    },
    date: {
      type: String,
      required: [true, 'Visit date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true,
    },
    expectedArrivalTime: {
      type: String,
      required: [true, 'Expected arrival time is required'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format'],
    },
    expectedDepartureTime: {
      type: String,
      required: [true, 'Expected departure time is required'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format'],
    },
    purpose: {
      type: String,
      required: [true, 'Purpose of visit is required'],
      trim: true,
      maxlength: [500, 'Purpose cannot exceed 500 characters'],
    },
    remark: {
      type: String,
      trim: true,
      maxlength: [500, 'Remark cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: Object.values(VISIT_STATUS),
        message: 'Invalid status',
      },
      default: VISIT_STATUS.PENDING,
      index: true,
    },
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    activities: [activitySchema],
  },
  { timestamps: true }
);

visitRequestSchema.virtual('employeeName').get(function () {
  return this._employeeName;
});

visitRequestSchema.set('toJSON', { virtuals: true });
visitRequestSchema.set('toObject', { virtuals: true });

export default mongoose.model('VisitRequest', visitRequestSchema);
