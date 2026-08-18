import mongoose from 'mongoose';

const NOTIFICATION_TYPES = [
  'visit_registered',
  'visit_approved',
  'visit_rejected',
  'visit_checked_in',
  'visit_checked_out',
  'visit_cancelled',
  'system',
];

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification user is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: NOTIFICATION_TYPES,
        message: 'Invalid notification type',
      },
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VisitRequest',
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

notificationSchema.index({ user: 1, read: 1, timestamp: -1 });

export const NOTIFICATION_TYPE_LIST = NOTIFICATION_TYPES;

export default mongoose.model('Notification', notificationSchema);
