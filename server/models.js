import mongoose from 'mongoose';
const { Schema } = mongoose;

const bookSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);
bookSchema.index({ title: 1, author: 1 }, { unique: true });

const quoteSchema = new Schema(
  {
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    text: { type: String, required: true, trim: true },
    hash: { type: String, required: true },
  },
  { timestamps: true }
);
quoteSchema.index({ book: 1, hash: 1 }, { unique: true });

// Single document holding the app's settings (single-user app)
const settingSchema = new Schema({
  key: { type: String, default: 'main', unique: true },
  enabled: { type: Boolean, default: false },
  notifyTime: { type: String, default: '08:00' }, // HH:mm
  timezone: { type: String, default: () => process.env.TIMEZONE || 'UTC' },
  subscriptions: { type: [Schema.Types.Mixed], default: [] },
  lastSentDate: String, // YYYY-MM-DD of the last push
  qotd: { date: String, quote: { type: Schema.Types.ObjectId, ref: 'Quote' } },
});

export const Book = mongoose.model('Book', bookSchema);
export const Quote = mongoose.model('Quote', quoteSchema);
export const Setting = mongoose.model('Setting', settingSchema);

export const getSettings = () =>
  Setting.findOneAndUpdate({ key: 'main' }, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
