import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    workingHours: {
      start: {
        type: String,
        default: '09:00',
        match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format'],
      },
      end: {
        type: String,
        default: '17:00',
        match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format'],
      },
    },
  },
  { timestamps: true }
);

employeeSchema.index({ name: 'text', employeeId: 'text', department: 'text', email: 'text' });
employeeSchema.index({ status: 1 });

export default mongoose.model('Employee', employeeSchema);
