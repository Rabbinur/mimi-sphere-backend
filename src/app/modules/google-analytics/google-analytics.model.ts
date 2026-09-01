import { Schema, model } from 'mongoose';

const googleEventSchema = new Schema(
  {
    eventName: { type: String, required: true },
    clientId: { type: String, required: true }, // GA4 Client ID
    eventTime: { type: Date, default: Date.now },
    params: {
      items: [Schema.Types.Mixed],
      value: Number,
      currency: String,
      page_location: String,
      page_title: String,
      user_id: String,
    },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    errorMessage: String,
  },
  {
    timestamps: true,
  },
);

googleEventSchema.index({ eventName: 1, createdAt: -1 });

export const GoogleEventModel = model('GoogleEvent', googleEventSchema);
