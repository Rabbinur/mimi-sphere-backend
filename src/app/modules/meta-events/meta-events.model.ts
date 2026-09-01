import { Schema, model } from 'mongoose';

const metaEventSchema = new Schema(
  {
    eventName: { type: String, required: true },
    eventId: { type: String },
    eventTime: { type: Number, required: true },
    userData: {
      em: [String],
      ph: [String],
      client_ip_address: String,
      client_user_agent: String,
      fbc: String,
      fbp: String,
      fn: [String],
      ln: [String],
      ct: [String],
      st: [String],
      zp: [String],
      country: [String],
      external_id: [String],
    },
    customData: {
      value: Number,
      currency: String,
      content_ids: [String],
      content_type: String,
      content_name: String,
      num_items: Number,
      contents: [Schema.Types.Mixed],
    },
    eventSourceUrl: String,
    actionSource: String,
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    errorMessage: String,
  },
  {
    timestamps: true,
  },
);

// Index for faster queries in analytics
metaEventSchema.index({ eventName: 1, createdAt: -1 });
metaEventSchema.index({ createdAt: -1 });

export const MetaEventModel = model('MetaEvent', metaEventSchema);
