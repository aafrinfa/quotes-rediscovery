import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Book, Quote, getSettings } from './models.js';
import { parseReadEra, hashQuote } from './parser.js';
import { getQuoteOfDay, initPush, nowIn, payloadFor, pushReady, sendToAll, startScheduler, vapidPublicKey } from './daily.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const fail = (res, code, error) => res.status(code).json({ error });

// ---- Import ----
app.post('/api/import/parse', (req, res) => {
  const parsed = parseReadEra(req.body.text);
  if (!parsed.title) return fail(res, 400, 'Paste the exported text first.');
  if (!parsed.quotes.length) return fail(res, 400, 'No quotes found. Quotes must be separated by *****.');
  res.json(parsed);
});

app.post('/api/import/save', wrap(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const author = String(req.body.author || '').trim();
  const texts = (req.body.quotes || []).map((q) => String(q).trim()).filter(Boolean);
  if (!title) return fail(res, 400, 'Title is required.');
  if (!texts.length) return fail(res, 400, 'There are no quotes to save.');

  const book = await Book.findOneAndUpdate(
    { title, author },
    { $setOnInsert: { title, author } },
    { upsert: true, new: true }
  );

  // merge: skip quotes this book already has, and duplicates within the paste
  const unique = [...new Map(texts.map((t) => [hashQuote(t), { book: book._id, text: t, hash: hashQuote(t) }])).values()];
  const existing = new Set(
    (await Quote.find({ book: book._id, hash: { $in: unique.map((u) => u.hash) } }).select('hash')).map((q) => q.hash)
  );
  const fresh = unique.filter((u) => !existing.has(u.hash));
  if (fresh.length) await Quote.insertMany(fresh);

  res.json({ bookId: book._id, added: fresh.length, skipped: texts.length - fresh.length });
}));

// ---- Books ----
app.get('/api/books', wrap(async (req, res) => {
  res.json(await Book.aggregate([
    { $lookup: { from: 'quotes', localField: '_id', foreignField: 'book', as: 'q' } },
    { $project: { title: 1, author: 1, count: { $size: '$q' } } },
    { $sort: { title: 1 } },
  ]));
}));

app.delete('/api/books/:id', wrap(async (req, res) => {
  await Quote.deleteMany({ book: req.params.id });
  await Book.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// ---- Quotes ----
app.get('/api/quotes', wrap(async (req, res) => {
  const filter = req.query.book ? { book: req.query.book } : {};
  res.json(await Quote.find(filter).populate('book', 'title author').sort({ book: 1, _id: 1 }));
}));

app.put('/api/quotes/:id', wrap(async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return fail(res, 400, 'Quote cannot be empty.');
  try {
    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      { text, hash: hashQuote(text) },
      { new: true }
    ).populate('book', 'title author');
    if (!quote) return fail(res, 404, 'Quote not found.');
    res.json(quote);
  } catch (e) {
    if (e.code === 11000) return fail(res, 409, 'This book already has a quote with that text.');
    throw e;
  }
}));

app.delete('/api/quotes/:id', wrap(async (req, res) => {
  await Quote.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

app.get('/api/quote-of-day', wrap(async (req, res) => {
  res.json((await getQuoteOfDay()) || null);
}));

// ---- Settings and push ----
const publicSettings = (s) => ({
  enabled: s.enabled,
  notifyTime: s.notifyTime,
  timezone: s.timezone,
  devices: s.subscriptions.length,
  pushReady,
});

app.get('/api/settings', wrap(async (req, res) => res.json(publicSettings(await getSettings()))));

app.put('/api/settings', wrap(async (req, res) => {
  const { enabled, notifyTime, timezone } = req.body;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(notifyTime || '')) return fail(res, 400, 'Time must look like 08:30.');
  try {
    nowIn(timezone);
  } catch {
    return fail(res, 400, 'Unknown timezone.');
  }
  const s = await getSettings();
  s.enabled = !!enabled;
  s.notifyTime = notifyTime;
  s.timezone = timezone;
  // if the chosen time has already passed today, start tomorrow
  const now = nowIn(timezone);
  if (now.time >= notifyTime) s.lastSentDate = now.date;
  await s.save();
  res.json(publicSettings(s));
}));

app.get('/api/push/key', (req, res) => res.json({ key: vapidPublicKey() }));

app.post('/api/push/subscribe', wrap(async (req, res) => {
  const sub = req.body;
  if (!sub?.endpoint) return fail(res, 400, 'Invalid subscription.');
  const s = await getSettings();
  s.subscriptions = s.subscriptions.filter((x) => x.endpoint !== sub.endpoint).concat(sub);
  await s.save();
  res.json({ ok: true });
}));

app.post('/api/push/test', wrap(async (req, res) => {
  const q = await getQuoteOfDay();
  if (!q) return fail(res, 400, 'Import some quotes first.');
  await sendToAll(payloadFor(q));
  res.json({ ok: true });
}));

// ---- Serve the built frontend (after `npm run build` in client) ----
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  if (err.name === 'CastError') return fail(res, 400, 'Invalid id.');
  console.error(err);
  fail(res, 500, err.message || 'Something went wrong.');
});

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI);
initPush();
startScheduler();
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
