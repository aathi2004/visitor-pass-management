import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema(
  {
    slotDuration: {
      type: Number,
      default: 20,
      min: [1, 'Slot duration must be at least 1'],
    },
    slotUnit: {
      type: String,
      enum: ['seconds', 'minutes'],
      default: 'minutes',
    },
    maxQueueSize: {
      type: Number,
      default: 3,
      min: [1, 'Max queue size must be at least 1'],
    },
    maxVisitorsPerEmployee: {
      type: Number,
      default: 3,
      min: [1, 'Max visitors per employee must be at least 1'],
    },
  },
  { timestamps: true }
);

systemConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) config = await this.create({});
  return config;
};

systemConfigSchema.statics.getSlotDurationMs = async function () {
  const config = await this.getConfig();
  const ms = config.slotUnit === 'seconds' ? 1000 : 60 * 1000;
  return config.slotDuration * ms;
};

export default mongoose.model('SystemConfig', systemConfigSchema);
