import cron from 'node-cron';
import webpush from 'web-push';
import { Quote, Setting, getSettings } from './models.js';

export let pushReady = false;
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || '';

export function initPush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys missing: push notifications are disabled (see README).');
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:you@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  pushReady = true;
}

// Current date (YYYY-MM-DD) and time (HH:mm) in a timezone
export function nowIn(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

// One random quote per day, stored so it stays the same all day
export async function getQuoteOfDay() {
  const s = await getSettings();
  const { date } = nowIn(s.timezone);

  if (s.qotd?.date === date && s.qotd.quote) {
    const existing = await Quote.findById(s.qotd.quote).populate('book', 'title author');
    if (existing) return existing;
  }

  const previous = s.qotd?.quote;
  let [pick] = await Quote.aggregate([
    { $match: previous ? { _id: { $ne: previous } } : {} },
    { $sample: { size: 1 } },
  ]);
  if (!pick) [pick] = await Quote.aggregate([{ $sample: { size: 1 } }]); // only one quote exists
  if (!pick) return null;

  await Setting.updateOne({ key: 'main' }, { qotd: { date, quote: pick._id } });
  return Quote.findById(pick._id).populate('book', 'title author');
}

export const payloadFor = (q) => ({
  title: q.book?.title || 'Quote of the day',
  body: q.text.length > 220 ? q.text.slice(0, 217) + '...' : q.text,
  url: '/',
});

export async function sendToAll(payload) {
  if (!pushReady) throw new Error('Push is not configured on the server.');
  const s = await getSettings();
  const dead = [];
  await Promise.all(
    s.subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) dead.push(sub.endpoint);
        else console.error('Push failed:', e.statusCode || e.message);
      }
    })
  );
  if (dead.length) {
    await Setting.updateOne({ key: 'main' }, { $pull: { subscriptions: { endpoint: { $in: dead } } } });
  }
}

// Checks every minute. Sends once per day, at or after the chosen time
// (so a late server start still delivers today's quote).
export function startScheduler() {
  cron.schedule('* * * * *', async () => {
    try {
      if (!pushReady) return;
      const s = await getSettings();
      if (!s.enabled || !s.subscriptions.length) return;
      const { date, time } = nowIn(s.timezone);
      if (s.lastSentDate === date || time < s.notifyTime) return;
      const q = await getQuoteOfDay();
      if (!q) return;
      await Setting.updateOne({ key: 'main' }, { lastSentDate: date });
      await sendToAll(payloadFor(q));
    } catch (e) {
      console.error('Scheduler error:', e.message);
    }
  });
}
